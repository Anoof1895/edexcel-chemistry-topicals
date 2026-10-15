"""
Gemini Multimodal Extractor for Edexcel IAL Mathematics (WMA11–WMA14, WME01, WST01)
with Cascade Pool & Strict Official Specification Subtopics.
- Uses strict enum list of official Pearson Edexcel IAL Mathematics subtopics
- Allows up to 2 official subtopics per question
- Multi-model fallback cascade pool with live terminal output (flush=True)
- Dedicated isolated cache in .cache/gemini_math
- High-precision heuristic fallback classifier for offline/fast operation
"""

import os
import re
import json
import time
import hashlib
from typing import Dict, Any, List, Optional
from PIL import Image
import pymupdf
import dotenv
from google import genai
from google.genai import types

from pipeline.syllabus_math import (
    get_math_syllabus_for_unit,
    get_all_math_subtopics_for_unit,
    get_math_parent_topic_for_subtopic,
    get_math_unit_from_code,
    get_math_unit_full_title
)

dotenv.load_dotenv()


def load_gemini_api_keys() -> List[str]:
    """
    Loads Gemini API keys from environment supporting:
    - Comma-separated: GEMINI_API_KEYS="key1,key2"
    - Or multiple env vars: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.
    Returns a deduplicated list of valid keys.
    """
    keys: List[str] = []

    raw_multi = os.environ.get("GEMINI_API_KEYS", "").strip()
    if raw_multi:
        for k in raw_multi.split(","):
            cleaned = k.strip().strip("'\"")
            if cleaned and cleaned not in keys:
                keys.append(cleaned)

    primary = os.environ.get("GEMINI_API_KEY", "").strip().strip("'\"")
    if primary and primary not in keys:
        keys.append(primary)

    for i in range(1, 50):
        var_name = f"GEMINI_API_KEY_{i}"
        val = os.environ.get(var_name, "").strip().strip("'\"")
        if val and val not in keys:
            keys.append(val)

    return keys


FALLBACK_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
]


def get_model_rate_limit_seconds(model_name: str) -> float:
    """Returns required minimum delay between sequential API calls."""
    if "lite" in model_name.lower():
        return 5.0
    return 15.0


def compute_classification_hash(
    question_text: str,
    crop_image: Optional[Image.Image] = None,
    unit_name: str = "",
    q_label: str = ""
) -> str:
    """
    Computes a deterministic SHA-256 hash across question text, unit, and image
    so no question item is ever classified twice.
    """
    hasher = hashlib.sha256()
    clean_txt = re.sub(r"\s+", " ", (question_text or "").strip().lower())
    hasher.update(clean_txt.encode("utf-8"))
    if unit_name:
        hasher.update(unit_name.lower().encode("utf-8"))
    if q_label:
        hasher.update(q_label.strip().lower().encode("utf-8"))
    if crop_image is not None:
        try:
            hasher.update(crop_image.tobytes()[:4096])
        except Exception:
            pass
    return hasher.hexdigest()[:24]


class GeminiMathExtractor:
    """Classifies Edexcel Mathematics questions into official specification topics and subtopics."""

    def __init__(self, cache_dir: str = ".cache/gemini_math"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        self.api_keys = load_gemini_api_keys()
        self.current_key_idx = 0
        self.models = FALLBACK_MODELS
        self.current_model_index = 0
        self.last_call_time = 0.0
        self._client: Optional[genai.Client] = None
        self._init_client()

    def _init_client(self):
        if self.api_keys:
            key = self.api_keys[self.current_key_idx % len(self.api_keys)]
            self._client = genai.Client(api_key=key)
        else:
            self._client = None

    @property
    def client(self) -> genai.Client:
        if self._client is None and self.api_keys:
            self._init_client()
        return self._client

    def _call_gemini_with_fallback(self, contents_or_image) -> Optional[Any]:
        if not self.api_keys:
            return None

        call_image: Optional[Image.Image] = None
        call_prompt: Optional[str] = None

        if isinstance(contents_or_image, Image.Image):
            call_image = contents_or_image
        elif isinstance(contents_or_image, str):
            call_prompt = contents_or_image
        elif isinstance(contents_or_image, list):
            for item in contents_or_image:
                if isinstance(item, Image.Image):
                    call_image = item
                elif isinstance(item, str):
                    call_prompt = item

        if call_image is not None and call_prompt is not None:
            final_contents = [call_image, call_prompt]
        elif call_image is not None:
            final_contents = [call_image]
        else:
            final_contents = call_prompt or ""

        max_cascade_cycles = 5
        for cycle in range(max_cascade_cycles):
            start_idx = self.current_model_index
            total_models = len(self.models)
            total_keys = len(self.api_keys)

            for offset in range(total_models):
                idx = (start_idx + offset) % total_models
                model = self.models[idx]
                rotations_tried = 0

                while rotations_tried < max(1, total_keys):
                    min_interval = get_model_rate_limit_seconds(model)
                    elapsed = time.time() - self.last_call_time
                    if elapsed < min_interval:
                        time.sleep(min_interval - elapsed)
                    self.last_call_time = time.time()

                    try:
                        response = self.client.models.generate_content(
                            model=model,
                            contents=final_contents,
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                                temperature=0.1
                            )
                        )
                        text = response.text.strip()
                        if text.startswith("```json"):
                            text = text[7:]
                        if text.startswith("```"):
                            text = text[3:]
                        if text.endswith("```"):
                            text = text[:-3]

                        self.current_model_index = idx
                        return json.loads(text.strip())

                    except Exception as e:
                        err_msg = str(e)
                        is_rate_limit = ("429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "quota" in err_msg.lower())
                        is_not_found = "404" in err_msg or "NOT_FOUND" in err_msg
                        is_unavailable = "503" in err_msg or "UNAVAILABLE" in err_msg

                        if is_rate_limit:
                            if total_keys > 1 and rotations_tried < total_keys - 1:
                                self.current_key_idx = (self.current_key_idx + 1) % total_keys
                                self._init_client()
                                rotations_tried += 1
                                continue
                            else:
                                self.current_model_index = (idx + 1) % total_models
                                break

                        if is_not_found or is_unavailable:
                            self.current_model_index = (idx + 1) % total_models
                            break
                        else:
                            self.current_model_index = (idx + 1) % total_models
                            break

        return None

    def _heuristic_fallback_classifier(self, text: str, unit_code: str) -> Dict[str, Any]:
        """
        High-precision rule-based classifier matching keywords strictly against
        the official Pearson Edexcel IAL Mathematics specification.
        """
        code = get_math_unit_from_code(unit_code)
        syllabus = get_math_syllabus_for_unit(code)
        subtopics = get_all_math_subtopics_for_unit(code)
        txt = (text or "").lower()

        primary_sub: str = subtopics[0]
        secondary_sub: Optional[str] = None

        if code == "WMA11":
            if any(k in txt for k in ["d/dx", "dy/dx", "gradient of", "tangent to", "normal to", "stationary point", "derivative"]):
                primary_sub = "1.7 Differentiation"
            elif any(k in txt for k in ["∫", "integral", "integrate", "dx", "area under"]):
                primary_sub = "1.8 Integration"
            elif any(k in txt for k in ["equation of the line", "perpendicular", "gradient of the line", "midpoint", "coordinates of"]):
                primary_sub = "1.4 Coordinate geometry in the (x, y) plane"
            elif any(k in txt for k in ["quadratic", "discriminant", "real roots", "equal roots", "completing the square"]):
                primary_sub = "1.2 Quadratic functions"
            elif any(k in txt for k in ["sine rule", "cosine rule", "sin", "cos", "tan", "triangle", "angle"]):
                primary_sub = "1.6 Trigonometry"
            elif any(k in txt for k in ["vector", "magnitude", "direction", "i + j", "position vector"]):
                primary_sub = "1.9 Vectors"
            elif any(k in txt for k in ["sketch the curve", "transformation", "translation", "stretch", "asymptote"]):
                primary_sub = "1.5 Graphs of functions"
            elif any(k in txt for k in ["inequality", "inequalities", "simultaneous"]):
                primary_sub = "1.3 Equations and inequalities"
            else:
                primary_sub = "1.1 Proof and algebraic manipulation"

        elif code == "WMA12":
            if any(k in txt for k in ["geometric series", "arithmetic series", "common ratio", "common difference", "sum to infinity"]):
                primary_sub = "2.3 Sequences and series"
            elif any(k in txt for k in ["log", "ln", "exponential", "e^", "logarithm"]):
                primary_sub = "2.5 Exponentials and logarithms"
            elif any(k in txt for k in ["circle", "radius", "centre of the circle", "tangent to the circle"]):
                primary_sub = "2.2 Coordinate geometry in the (x, y) plane"
            elif any(k in txt for k in ["binomial", "expansion", "(1 +", "(a +", "ascending powers", "coefficient"]):
                primary_sub = "2.4 Binomial expansion"
            elif any(k in txt for k in ["radian", "sector", "arc length", "trigonometric equation", "sin^2", "cos^2"]):
                primary_sub = "2.6 Trigonometric identities and equations"
            elif any(k in txt for k in ["trapezium rule", "area bounded by"]):
                primary_sub = "2.8 Integration"
            elif any(k in txt for k in ["stationary point", "maxima", "minima", "maximum value", "d2y/dx2"]):
                primary_sub = "2.7 Differentiation"
            else:
                primary_sub = "2.1 Algebraic methods"

        elif code == "WMA13":
            if any(k in txt for k in ["sec", "cosec", "cot", "arcsin", "arccos", "arctan", "r cos", "r sin", "double angle"]):
                primary_sub = "3.3 Trigonometric functions and identities"
            elif any(k in txt for k in ["composite function", "inverse function", "domain", "range", "modulus", "|x|"]):
                primary_sub = "3.2 Functions"
            elif any(k in txt for k in ["product rule", "quotient rule", "chain rule", "dy/dx"]):
                primary_sub = "3.4 Differentiation"
            elif any(k in txt for k in ["integration by parts", "substitution", "∫", "volume"]):
                primary_sub = "3.5 Integration"
            elif any(k in txt for k in ["iteration", "change of sign", "newton-raphson", "alpha ="]):
                primary_sub = "3.6 Numerical methods"
            else:
                primary_sub = "3.1 Algebraic methods"

        elif code == "WMA14":
            if any(k in txt for k in ["contradiction"]):
                primary_sub = "4.1 Proof"
            elif any(k in txt for k in ["parametric", "parameter t", "t ="]):
                primary_sub = "4.3 Coordinate geometry in the (x, y) plane (parametric equations)"
            elif any(k in txt for k in ["binomial series", "expansion of (1 +"]):
                primary_sub = "4.4 Binomial expansion"
            elif any(k in txt for k in ["implicit differentiation", "rate of change", "related rates"]):
                primary_sub = "4.5 Differentiation"
            elif any(k in txt for k in ["differential equation", "separable", "volume of revolution", "partial fractions"]):
                primary_sub = "4.6 Integration"
            elif any(k in txt for k in ["vector", "direction vector", "line l1", "scalar product", "dot product"]):
                primary_sub = "4.7 Vectors"
            else:
                primary_sub = "4.2 Partial fractions"

        elif code == "WME01":
            if any(k in txt for k in ["suvat", "constant acceleration", "velocity-time", "speed-time", "deceleration"]):
                primary_sub = "M1.1 Kinematics of a particle moving in a straight line"
            elif any(k in txt for k in ["pulley", "connected particles", "lift", "tension", "f = ma", "impulse", "momentum"]):
                primary_sub = "M1.2 Dynamics of a particle moving in a straight line or plane"
            elif any(k in txt for k in ["friction", "rough plane", "coefficient of friction", "equilibrium", "limiting"]):
                primary_sub = "M1.3 Statics of a particle"
            elif any(k in txt for k in ["rod", "uniform rod", "non-uniform rod", "pivot", "support", "tilting", "moments"]):
                primary_sub = "M1.4 Moments of a force"
            else:
                primary_sub = "M1.5 Vectors in kinematics and dynamics"

        elif code == "WST01":
            if any(k in txt for k in ["tree diagram", "venn diagram", "mutually exclusive", "independent", "p(a|b)", "conditional"]):
                primary_sub = "S1.4 Probability"
            elif any(k in txt for k in ["pmcc", "correlation", "regression line", "scatter diagram", "s_xy", "s_xx", "least squares"]):
                primary_sub = "S1.5 Correlation and regression"
            elif any(k in txt for k in ["discrete random variable", "e(x)", "var(x)", "probability distribution", "expected"]):
                primary_sub = "S1.6 Discrete random variables"
            elif any(k in txt for k in ["normal distribution", "standard normal", "phi(", "mean and standard deviation", "z ="]):
                primary_sub = "S1.7 The Normal distribution"
            elif any(k in txt for k in ["histogram", "box plot", "stem and leaf", "outlier", "skewness"]):
                primary_sub = "S1.3 Representation of data"
            elif any(k in txt for k in ["standard deviation", "mean", "median", "interquartile", "range"]):
                primary_sub = "S1.2 Measures of location and dispersion"
            else:
                primary_sub = "S1.1 Mathematical models in probability and statistics"

        parent_topic = get_math_parent_topic_for_subtopic(primary_sub)
        subtopics_list = [primary_sub]
        if secondary_sub and secondary_sub in subtopics:
            subtopics_list.append(secondary_sub)

        return {
            "topic": parent_topic,
            "subtopic": primary_sub,
            "subtopics": subtopics_list
        }

    def classify_questions(
        self,
        questions: List[Dict[str, Any]],
        target_unit_code: str
    ) -> List[Dict[str, Any]]:
        """
        Classifies each question into official syllabus topic/subtopic(s).
        Uses cache, cascade Gemini API, or heuristic fallback classifier.
        """
        code = get_math_unit_from_code(target_unit_code)
        unit_full_title = get_math_unit_full_title(code)
        official_subtopics = get_all_math_subtopics_for_unit(code)

        results: List[Optional[Dict[str, Any]]] = [None] * len(questions)
        hashes: List[str] = []
        uncached_indices: List[int] = []

        for idx, q in enumerate(questions):
            q_text = q.get("text", "")
            q_img = q.get("image")
            q_label = q.get("q_num_label", str(q.get("id", "")))
            q_key = f"{code}|{q.get('id', '')}|{q_label}"
            c_hash = compute_classification_hash(q_text, q_img, unit_full_title, q_key)
            hashes.append(c_hash)
            c_path = os.path.join(self.cache_dir, f"{c_hash}.json")

            if os.path.exists(c_path):
                try:
                    with open(c_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if data.get("topic") and data.get("subtopics"):
                            results[idx] = data
                            continue
                except Exception:
                    pass
            uncached_indices.append(idx)

        if not uncached_indices:
            return [r for r in results if r is not None]

        # Process uncached questions in batches of up to 10
        batch_size = 10
        for b_start in range(0, len(uncached_indices), batch_size):
            b_indices = uncached_indices[b_start : b_start + batch_size]
            b_items = [
                {
                    "id": str(questions[i].get("id", questions[i].get("q_num_label", str(i)))),
                    "text": questions[i].get("text", "").strip()[:500]
                }
                for i in b_indices
            ]

            allowed_topics = list(get_math_syllabus_for_unit(code).keys())
            prompt = f"""You are an expert Pearson Edexcel IAL Mathematics examiner.
You are classifying a Pearson Edexcel IAL Mathematics {unit_full_title} ({code}) question.
You MUST select exclusively from the official syllabus topics: {'; '.join(allowed_topics)}. Never return topics from any other unit.
Classify each of the following Mathematics questions into 1 or 2 official subtopics from the allowed list:

ALLOWED OFFICIAL SUBTOPICS:
{json.dumps(official_subtopics, indent=2)}

QUESTIONS:
{json.dumps(b_items, indent=2)}

Return a JSON array of objects, exactly one per question:
[
  {{
    "id": "<matching id from input>",
    "topic": "<parent topic strictly from allowed list>",
    "subtopic": "<primary subtopic strictly from allowed list>",
    "subtopics": ["<primary subtopic>", "<optional second subtopic>"]
  }}
]
"""
            resp = self._call_gemini_with_fallback(contents_or_image=prompt)
            resp_by_id = {}
            if isinstance(resp, list):
                for item in resp:
                    if isinstance(item, dict) and "id" in item:
                        resp_by_id[str(item["id"])] = item
            elif isinstance(resp, dict) and "questions" in resp:
                for item in resp["questions"]:
                    if isinstance(item, dict) and "id" in item:
                        resp_by_id[str(item["id"])] = item

            for i in b_indices:
                q_id = str(questions[i].get("id", questions[i].get("q_num_label", str(i))))
                c_hash = hashes[i]
                c_path = os.path.join(self.cache_dir, f"{c_hash}.json")

                item_data = resp_by_id.get(q_id)
                if item_data:
                    subs = [s for s in item_data.get("subtopics", []) if s in official_subtopics]
                    if not subs and item_data.get("subtopic") in official_subtopics:
                        subs = [item_data["subtopic"]]
                    if not subs:
                        subs = [official_subtopics[0]]
                    primary = subs[0]
                    parent_topic = get_math_parent_topic_for_subtopic(primary)
                    classified = {
                        "topic": parent_topic,
                        "subtopic": primary,
                        "subtopics": subs[:2],
                        "id": q_id,
                        "content_hash": c_hash
                    }
                else:
                    classified = self._heuristic_fallback_classifier(questions[i].get("text", ""), code)
                    classified["id"] = q_id
                    classified["content_hash"] = c_hash

                try:
                    with open(c_path, "w", encoding="utf-8") as f:
                        json.dump(classified, f, indent=2)
                except Exception:
                    pass

                results[i] = classified

        return [r for r in results if r is not None]
