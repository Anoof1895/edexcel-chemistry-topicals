"""
Gemini Multimodal Extractor for Edexcel IAL Physics (WPH11–WPH16)
with Cascade Pool & Strict Official Specification Subtopics.
- Uses strict enum list of official Pearson Edexcel IAL Physics subtopics
- Allows up to 2 official subtopics per question
- Strict rule for MCQs: bounding box MUST encompass all 4 options (A, B, C, D)
- Enforces Physics specification rules: Section A = 10 MCQs (Q1-Q10) for Units 1, 2, 4, 5
- Multi-model fallback cascade pool with live terminal output (flush=True)
- Dedicated isolated cache in .cache/gemini_physics
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

from pipeline.syllabus_physics import (
    get_physics_syllabus_for_unit,
    get_all_physics_subtopics_for_unit,
    get_physics_parent_topic_for_subtopic,
    get_physics_unit_from_code,
    get_physics_unit_full_title
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
    """
    Returns required minimum delay between sequential API calls:
    - Standard Flash models (1-5): 4 RPM (~15.0s sleep)
    - Flash Lite models (6-7): 12 RPM (~5.0s sleep)
    """
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
            thumb = crop_image.resize((64, 64)).convert("L")
            hasher.update(thumb.tobytes())
        except Exception:
            pass
    return hasher.hexdigest()

class GeminiPhysicsExtractor:
    def __init__(self, cache_dir: str = ".cache/gemini_physics"):
        self.api_keys: List[str] = load_gemini_api_keys()
        self.current_key_idx: int = 0

        if self.api_keys:
            masked = [
                (f"{k[:6]}...{k[-4:]}" if len(k) > 10 else "***")
                for k in self.api_keys
            ]
            print(
                f"[KEY POOL] Initialized Gemini key pool with {len(self.api_keys)} key(s): {masked}. "
                f"Active key index: {self.current_key_idx}.",
                flush=True
            )
        else:
            print("[KEY POOL] Warning: No Gemini API keys found in environment.", flush=True)

        self.client: Optional[genai.Client] = None
        self._init_client()

        self.models = list(FALLBACK_MODELS)
        self.current_model_index = 0
        self.last_call_time = 0.0
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def _init_client(self):
        """Initializes or re-instantiates genai.Client with the active API key."""
        active_key = self.api_keys[self.current_key_idx] if self.api_keys else None
        self.client = genai.Client(
            api_key=active_key,
            http_options=types.HttpOptions(
                timeout=30000,
                retry_options=types.HttpRetryOptions(attempts=1)
            )
        )

    def rotate_key(self) -> int:
        """Manually rotates to the next API key in the pool and re-initializes client."""
        exhausted_idx = self.current_key_idx
        if len(self.api_keys) > 1:
            self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
            print(f"    [KEY ROTATION] Key index {exhausted_idx} rotated. Switching to key index {self.current_key_idx}...", flush=True)
            self._init_client()
        return self.current_key_idx

    def _get_cache_path(self, cache_key: str) -> str:
        h = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()
        return os.path.join(self.cache_dir, f"{h}.json")

    def _call_gemini_with_fallback(
        self,
        contents_or_image: Any = None,
        prompt: Optional[str] = None,
        image: Optional[Image.Image] = None
    ) -> Optional[Any]:
        """
        Executes a Gemini call with:
        - Strict RPM rate limiting (15s for standard Flash, 5s for Flash Lite)
        - Instant key rotation on 429 / RESOURCE_EXHAUSTED
        - Multi-model fallback cascade across FALLBACK_MODELS
        - Exponential backoff safety net starting at 60s if all models/keys fail
        """
        # Resolve contents
        call_prompt = prompt
        call_image = image

        if isinstance(contents_or_image, str):
            call_prompt = contents_or_image
        elif isinstance(contents_or_image, Image.Image):
            call_image = contents_or_image
        elif isinstance(contents_or_image, list):
            # could be [image, prompt]
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
        backoff_delay = 60.0

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
                        is_rate_limit = (
                            "429" in err_msg
                            or "RESOURCE_EXHAUSTED" in err_msg
                            or "ResourceExhausted" in err_msg
                            or "quota" in err_msg.lower()
                            or "too many requests" in err_msg.lower()
                        )
                        is_not_found = "404" in err_msg or "NOT_FOUND" in err_msg
                        is_unavailable = "503" in err_msg or "UNAVAILABLE" in err_msg

                        if is_rate_limit:
                            exhausted_idx = self.current_key_idx
                            if total_keys > 1 and rotations_tried < total_keys - 1:
                                self.current_key_idx = (self.current_key_idx + 1) % total_keys
                                print(f"    [KEY ROTATION] Key {exhausted_idx} hit 429/quota on {model}. Rotating to key {self.current_key_idx} on same model...", flush=True)
                                self._init_client()
                                rotations_tried += 1
                                continue
                            else:
                                next_model = self.models[(idx + 1) % total_models]
                                print(f"    [QUOTA] Both API keys exhausted on {model}. Cascading to {next_model}...", flush=True)
                                self.current_model_index = (idx + 1) % total_models
                                break

                        next_model = self.models[(idx + 1) % total_models]
                        if is_not_found:
                            print(f"    [MODEL NOT FOUND] Model {model} returned 404. Cascading to {next_model}...", flush=True)
                            self.current_model_index = (idx + 1) % total_models
                            break
                        elif is_unavailable:
                            if total_keys > 1 and rotations_tried < total_keys - 1:
                                exhausted_idx = self.current_key_idx
                                self.current_key_idx = (self.current_key_idx + 1) % total_keys
                                print(f"    [503 UNAVAILABLE] Model {model} unavailable on key {exhausted_idx}. Trying key {self.current_key_idx}...", flush=True)
                                self._init_client()
                                rotations_tried += 1
                                continue
                            else:
                                print(f"    [503 UNAVAILABLE] Model {model} unavailable on all keys. Cascading to {next_model}...", flush=True)
                                self.current_model_index = (idx + 1) % total_models
                                break
                        else:
                            print(f"    [CASCADE NOTICE] Model {model} error: {err_msg[:80]}. Cascading to {next_model}...", flush=True)
                            self.current_model_index = (idx + 1) % total_models
                            break

            if cycle < max_cascade_cycles - 1:
                print(f"    [SAFETY NET] All models and keys in cascade pool exhausted. Pausing with exponential backoff for {backoff_delay:.0f}s before retry cycle {cycle + 2}/{max_cascade_cycles}...", flush=True)
                time.sleep(backoff_delay)
                backoff_delay = min(backoff_delay * 2.0, 300.0)
                self.current_model_index = 0

        print("    [WARNING] All models in cascade pool failed across all retry cycles.", flush=True)
        return None

    def classify_question(
        self,
        question_text: str,
        crop_image: Optional[Image.Image] = None,
        unit_name: Optional[str] = None,
        q_num_label: str = "",
        unit_code: str = "WPH11"
    ) -> Dict[str, Any]:
        """
        Classifies a single question into official Edexcel IAL Physics subtopics.
        Checks SHA-256 content hash cache first. If not cached, queries Gemini with fallback cascade.
        """
        target_unit_code = (unit_code or "WPH11").strip().upper()
        if not unit_name or (unit_name == "Unit 1: Mechanics and Materials" and target_unit_code != "WPH11"):
            target_unit_name = get_physics_unit_from_code(target_unit_code)
        else:
            target_unit_name = unit_name

        results = self.classify_questions(
            questions=[{
                "id": q_num_label or "1",
                "text": question_text,
                "image": crop_image,
                "q_num_label": q_num_label
            }],
            unit_name=target_unit_name,
            unit_code=target_unit_code
        )
        return results[0] if results else self._heuristic_fallback_classifier(question_text, target_unit_code)

    def classify_questions(
        self,
        questions: List[Dict[str, Any]],
        unit_name: Optional[str] = None,
        unit_code: str = "WPH11"
    ) -> List[Dict[str, Any]]:
        """
        Batch-classifies a list of questions into official Edexcel IAL Physics subtopics:
        - For each question, checks .cache/gemini_physics/{hash}.json first.
        - Uncached questions are batched and sent to Gemini via FALLBACK_MODELS.
        - Every classified item is saved individually to disk cache.
        """
        if not questions:
            return []

        target_unit_code = (unit_code or "WPH11").strip().upper()
        if not unit_name or (unit_name == "Unit 1: Mechanics and Materials" and target_unit_code != "WPH11"):
            target_unit_name = get_physics_unit_from_code(target_unit_code)
        else:
            target_unit_name = unit_name

        official_subtopics = get_all_physics_subtopics_for_unit(target_unit_code)
        full_prompt_unit = get_physics_unit_full_title(target_unit_code)
        results = [None] * len(questions)
        uncached_indices = []
        hashes = []

        for idx, q in enumerate(questions):
            q_text = q.get("text", "")
            q_img = q.get("image")
            q_label = q.get("q_num_label", str(q.get("id", "")))
            # Paper-specific key (full id e.g. wph14_2026_january_q1) prevents cross-paper/unit collisions
            q_key = f"{target_unit_code}|{q.get('id', '')}|{q_label}"
            c_hash = compute_classification_hash(q_text, q_img, target_unit_name, q_key)
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
            return results

        # Process uncached in groups of up to 10
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

            allowed_topics = list(get_physics_syllabus_for_unit(target_unit_code).keys())
            topic_nums = ", ".join(t.split(":")[0].replace("Topic ", "") for t in allowed_topics)
            prompt = f"""You are an expert Pearson Edexcel IAL Physics examiner.
You are classifying a Pearson Edexcel IAL Physics {full_prompt_unit} ({target_unit_code}) question. You MUST select exclusively from Topics {topic_nums} ({'; '.join(allowed_topics)}). Never return topics from any other unit.
Classify each of the following Physics questions into 1 or 2 official subtopics from the allowed list:

ALLOWED OFFICIAL SUBTOPICS:
{json.dumps(official_subtopics, indent=2)}

QUESTIONS:
{json.dumps(b_items, indent=2)}

Return a JSON array of objects, exactly one per question:
[
  {{
    "id": "<matching id from input>",
    "topic": "<parent topic>",
    "subtopic": "<primary subtopic strictly from allowed list>",
    "subtopics": ["<primary subtopic>", "<optional second subtopic>"]
  }}
]
"""
            resp = None
            for attempt in range(4):
                resp = self._call_gemini_with_fallback(contents_or_image=prompt)
                if resp:
                    break
                print(f"    [RETRY] Classification cascade failed (attempt {attempt + 1}/4); waiting 30s...", flush=True)
                time.sleep(30)

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
                    parent_topic = get_physics_parent_topic_for_subtopic(primary)
                    classified = {
                        "topic": parent_topic,
                        "subtopic": primary,
                        "subtopics": subs[:2],
                        "id": q_id,
                        "content_hash": c_hash
                    }
                    is_gemini = True
                else:
                    classified = self._heuristic_fallback_classifier(questions[i].get("text", ""), target_unit_code)
                    classified["id"] = q_id
                    classified["content_hash"] = c_hash
                    is_gemini = False

                if is_gemini:
                    try:
                        with open(c_path, "w", encoding="utf-8") as f:
                            json.dump(classified, f, indent=2)
                    except Exception:
                        pass

                results[i] = classified

        return results

    def _heuristic_fallback_classifier(self, question_text: str, unit_code: str = "WPH11") -> Dict[str, Any]:
        """Deterministic keyword-based fallback matching official syllabus."""
        txt = (question_text or "").lower()
        u_code = (unit_code or "WPH11").strip().upper()

        if "12" in u_code or "UNIT 2" in u_code:
            # Topic 3 & Topic 4 (Unit 2: Waves and Electricity)
            if "de broglie" in txt or "wave-particle duality" in txt or "duality" in txt or "matter wave" in txt:
                sub = "3.9: Wave-Particle Duality & De Broglie Wavelength"
            elif "photoelectric" in txt or "work function" in txt or "threshold frequency" in txt or "stopping potential" in txt or "einstein's photoelectric" in txt or "photon" in txt:
                sub = "3.8: Photons & The Photoelectric Effect (Work function, Threshold frequency, Einstein's Photoelectric Equation)"
            elif "line spectra" in txt or "emission spectra" in txt or "absorption spectra" in txt or "energy level" in txt or "ground state" in txt or "excited state" in txt or "transition" in txt or "ionization" in txt or "ionisation" in txt:
                sub = "3.10: Atomic Line Spectra & Energy Levels (Photon emission/absorption, Transition equations)"
            elif "pulse-echo" in txt or "pulse echo" in txt or "ultrasound" in txt or "transducer" in txt or "acoustic impedance" in txt:
                sub = "3.7: Pulse-Echo Techniques & Ultrasound"
            elif "polarisation" in txt or "polarization" in txt or "polarised" in txt or "polarized" in txt or "malus" in txt or "polaroid" in txt:
                sub = "3.6: Polarization (Malus' Law, Applications of polarized light)"
            elif "diffraction grating" in txt or "diffraction" in txt or "grating" in txt:
                sub = "3.5: Diffraction (Diffraction gratings, Single slit, n*lambda = d*sin(theta))"
            elif "stationary wave" in txt or "standing wave" in txt or "node" in txt or "antinode" in txt or "harmonic" in txt or "fundamental frequency" in txt:
                sub = "3.4: Stationary Waves (Nodes, Antinodes, Harmonics on strings and in air columns)"
            elif "superposition" in txt or "interference" in txt or "path difference" in txt or "phase difference" in txt or "coherent" in txt or "coherence" in txt or "two-source" in txt or "fringe" in txt or "young" in txt:
                sub = "3.3: Superposition & Interference (Path Difference, Phase Difference, Two-Source Interference, Young's Double Slit)"
            elif "refraction" in txt or "refractive index" in txt or "snell" in txt or "critical angle" in txt or "total internal reflection" in txt or "tir" in txt:
                sub = "3.2: Refraction, Reflection & Total Internal Reflection (Snell's Law, Critical Angle)"
            elif "drift velocity" in txt or "drift speed" in txt or "charge carrier" in txt or "number density" in txt or "i = nqva" in txt or "current is the rate" in txt:
                sub = "4.1: Electric Current, Charge & Drift Velocity (I = nqvA)"
            elif "internal resistance" in txt or "terminal p.d." in txt or "terminal potential difference" in txt or "lost volts" in txt or "load resistance" in txt or "e = v + ir" in txt:
                sub = "4.7: Internal Resistance & Terminal Potential Difference (E = V + Ir, Load resistance matching)"
            elif "potential divider" in txt or "potentiometer" in txt or "ldr" in txt or "light dependent resistor" in txt or "sensor circuit" in txt:
                sub = "4.6: Potential Dividers & Sensor Circuits (LDRs, NTC thermistors, Potentiometers)"
            elif "resistivity" in txt or "superconductor" in txt or "superconductivity" in txt or "thermistor" in txt or "rho" in txt:
                sub = "4.4: Resistivity & Temperature Effects (R = rho*L/A, Thermistors, Superconductivity)"
            elif "kirchhoff" in txt or "parallel circuit" in txt or "series circuit" in txt or "junction rule" in txt:
                sub = "4.5: Series and Parallel Circuits (Kirchhoff's First and Second Laws, Equivalent resistance)"
            elif "diode" in txt or "i-v" in txt or "ohmic" in txt or "ohm's law" in txt or "filament" in txt:
                sub = "4.3: Resistance, Ohm's Law & I-V Characteristics (Ohmic conductors, Filament lamps, Diodes)"
            elif "electromotive force" in txt or "emf" in txt or "potential difference" in txt or "electrical energy" in txt or "p = vi" in txt:
                sub = "4.2: Potential Difference, EMF & Electrical Energy/Power (P = VI, P = I^2*R, W = VQ)"
            elif "transverse" in txt or "longitudinal" in txt or "wavelength" in txt or "frequency" in txt or "amplitude" in txt or "wave speed" in txt or "wave equation" in txt or "wave" in txt:
                sub = "3.1: Wave Properties (Transverse & Longitudinal, Amplitude, Frequency, Wavelength, Wave Equation)"
            else:
                sub = "3.1: Wave Properties (Transverse & Longitudinal, Amplitude, Frequency, Wavelength, Wave Equation)"
        elif "11" in u_code or "UNIT 1" in u_code:
            # Topic 1 & Topic 2 (Unit 1: Mechanics and Materials)
            if "density" in txt or "upthrust" in txt or "archimedes" in txt or "laminar" in txt or "fluid" in txt:
                sub = "2.1: Density, Upthrust, Archimedes' Principle & Fluid Flow"
            elif "viscosity" in txt or "stokes" in txt or "terminal velocity" in txt:
                sub = "2.2: Viscosity, Temperature Effects, Stokes' Law & Terminal Velocity"
            elif "hooke" in txt or "spring" in txt or "elastic" in txt or "plastic" in txt or "stiffness" in txt or "extension" in txt:
                sub = "2.3: Hooke's Law, Elastic & Plastic Deformation"
            elif "young modulus" in txt or "stress" in txt or "strain" in txt or "tensile" in txt:
                sub = "2.4: Stress, Strain, Young Modulus & Force-Extension Graphs"
            elif "brittle" in txt or "ductile" in txt or "malleable" in txt or "tough" in txt:
                sub = "2.5: Material Properties (Brittle, Ductile, Tough, Hard, Malleable)"
            elif "trajectory" in txt or "projectile" in txt or "parabolic" in txt or "angle of projection" in txt:
                sub = "1.3: Projectile Motion & Trajectory Analysis"
            elif "momentum" in txt or "newton" in txt or "impulse" in txt or "collision" in txt or "thrust" in txt:
                sub = "1.4: Newton's Laws of Motion, Momentum & Impulse"
            elif "moment" in txt or "pivot" in txt or "centre of gravity" in txt or "equilibrium" in txt or "torque" in txt:
                sub = "1.5: Forces in Equilibrium, Moments & Centre of Gravity"
            elif "work" in txt or "kinetic energy" in txt or "potential energy" in txt or "power" in txt or "efficiency" in txt:
                sub = "1.6: Work, Kinetic & Potential Energy, Power & Efficiency"
            elif "suvat" in txt or "velocity" in txt or "acceleration" in txt or "displacement" in txt or "speed" in txt or "deceleration" in txt:
                sub = "1.2: Kinematics, Motion Graphs & SUVAT Equations"
            elif "vector" in txt or "scalar" in txt or "base unit" in txt or "si unit" in txt:
                sub = "1.1: Physical Quantities, SI Units & Vectors"
            else:
                sub = "1.1: Physical Quantities, SI Units & Vectors"
        elif "13" in u_code or "UNIT 3" in u_code:
            # Topic 5: Practical Skills and Techniques I (Unit 3)
            if "uncertainty" in txt or "percentage uncertainty" in txt or "random error" in txt or "systematic error" in txt or "resolution" in txt:
                sub = "5.2: Measurement Uncertainties, Errors & Percentage Uncertainties"
            elif "graph" in txt or "gradient" in txt or "intercept" in txt or "linear" in txt or "evaluation" in txt or "y = mx + c" in txt:
                sub = "5.3: Graphical Analysis, Error Propagation & Evaluation of Results"
            else:
                sub = "5.1: Experimental Planning, Apparatus & Core Practicals (AS)"
        elif "16" in u_code or "UNIT 6" in u_code:
            # Topic 13: Practical Skills and Techniques II (Unit 6)
            if "log" in txt or "ln " in txt or "power-law" in txt or "linearis" in txt or "exponential" in txt or "gradient" in txt:
                sub = "13.3: Logarithmic & Power-Law Graph Linearisation and Verification"
            elif "calibration" in txt or "uncertainty" in txt or "systematic" in txt or "error" in txt or "percentage difference" in txt:
                sub = "13.2: Instrument Calibration, Systematic & Random Error Analysis"
            else:
                sub = "13.1: Advanced Core Practicals & Experimental Methods (A2)"
        elif "14" in u_code or "UNIT 4" in u_code:
            # Topic 6, 7, 8 (Unit 4: Further Mechanics, Fields and Particles)
            if "quark" in txt or "lepton" in txt or "hadron" in txt or "meson" in txt or "baryon" in txt or "particle" in txt or "linac" in txt or "cyclotron" in txt or "accelerator" in txt or "annihilation" in txt:
                sub = "8.2: Standard Model (Quarks, Leptons, Hadrons) & Conservation Laws" if ("quark" in txt or "hadron" in txt or "baryon" in txt) else "8.1: Particle Accelerators (Linacs, Cyclotrons) & Detectors"
            elif "magnetic field" in txt or "flux" in txt or "faraday" in txt or "lenz" in txt or "electromagnetic induction" in txt:
                sub = "7.4: Electromagnetic Induction, Magnetic Flux, Faraday's & Lenz's Laws" if ("induction" in txt or "flux" in txt or "lenz" in txt or "faraday" in txt) else "7.3: Magnetic Fields, Force on Moving Charges & Fleming's Left-Hand Rule"
            elif "capacitor" in txt or "capacitance" in txt or "dielectric" in txt or "exponential decay" in txt or "time constant" in txt:
                sub = "7.2: Capacitors, Charging/Discharging & Energy Stored"
            elif "electric field" in txt or "coulomb" in txt or "electric potential" in txt or "permittivity" in txt:
                sub = "7.1: Electric Fields, Coulomb's Law, Field Strength & Potential"
            elif "circular" in txt or "centripetal" in txt or "angular velocity" in txt or "radian" in txt:
                sub = "6.2: Circular Motion, Centripetal Acceleration & Centripetal Force"
            else:
                sub = "6.1: 2D Momentum, Elastic & Inelastic Collisions"
        elif "15" in u_code or "UNIT 5" in u_code:
            # Topic 9, 10, 11, 12 (Unit 5: Thermodynamics, Radiation, Oscillations and Cosmology)
            if "specific heat" in txt or "latent heat" in txt or "gas" in txt or "boltzmann" in txt or "pressure" in txt or "pv = nkt" in txt or "kelvin" in txt or "internal energy" in txt:
                sub = "9.2: Ideal Gas Laws, pV = NkT & Kinetic Theory Model" if ("gas" in txt or "pv =" in txt or "boltzmann" in txt) else "9.1: Specific Heat Capacity, Latent Heat & Internal Energy"
            elif "decay" in txt or "half-life" in txt or "activity" in txt or "becquerel" in txt or "fission" in txt or "fusion" in txt or "binding energy" in txt or "mass defect" in txt:
                sub = "10.2: Nuclear Binding Energy, Mass Defect, Fission & Fusion" if ("binding energy" in txt or "mass defect" in txt or "fission" in txt or "fusion" in txt) else "10.1: Alpha, Beta & Gamma Radiation, Radioactive Decay & Half-life"
            elif "shm" in txt or "simple harmonic" in txt or "oscillation" in txt or "pendulum" in txt or "resonance" in txt or "damping" in txt:
                sub = "11.2: Free & Forced Oscillations, Damping & Resonance" if ("resonance" in txt or "damping" in txt) else "11.1: Simple Harmonic Motion (SHM) Kinematics & Energy Transfers"
            else:
                sub = "12.1: Gravitational Fields, Newton's Law of Gravitation & Gravitational Potential"
        else:
            subs = get_all_physics_subtopics_for_unit(u_code)
            sub = subs[0] if subs else "1.1: Physical Quantities, SI Units & Vectors"

        topic = get_physics_parent_topic_for_subtopic(sub)
        return {
            "topic": topic,
            "subtopic": sub,
            "subtopics": [sub]
        }

    def analyze_qp_page(
        self,
        image_150: Image.Image,
        page_doc: pymupdf.Page,
        paper_id: str,
        page_index: int,
        unit_name: str,
        active_parent_question: Optional[str] = None,
        current_question_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyzes a single Question Paper page for Physics.
        """
        cache_key = f"{paper_id}_qp_page_physics_v1_{page_index}"
        cache_file = self._get_cache_path(cache_key)

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                    print(f"    [CACHE HIT] Page {page_index + 1} loaded from cache.", flush=True)
                    return self._sanitize_analysis(cached_data, page_doc, unit_name=unit_name)
            except Exception:
                pass

        page_text = page_doc.get_text()
        if re.search(r"\bBLANK\s+PAGE\b", page_text, re.IGNORECASE) and not re.search(r"(?<!Total for Question )\(\d+\)", page_text):
            return {"page_type": "blank", "questions": [], "stem": None}
        if "SECTION" not in page_text and "Question" not in page_text and "Turn over" not in page_text and not re.search(r"\(\d+\)", page_text):
            if "List of data, formulae and relationships" in page_text or "Candidates may use" in page_text:
                return {"page_type": "cover", "questions": [], "stem": None}

        # Build official specification subtopics list
        official_subtopics = get_all_physics_subtopics_for_unit(unit_name)
        subtopics_enum_json = json.dumps(official_subtopics, indent=2)

        is_practical_unit = "unit 3" in unit_name.lower() or "unit 6" in unit_name.lower() or "wph13" in paper_id.lower() or "wph16" in paper_id.lower()
        practical_guidance = ""
        if is_practical_unit:
            practical_guidance = f"""
CRITICAL SPECIFICATION RULES FOR {unit_name} (PRACTICAL SKILLS IN PHYSICS):
- {unit_name} is an Alternative to Practical examination paper.
- THERE IS NO SECTION A AND THERE ARE ZERO MULTIPLE-CHOICE QUESTIONS (0 MCQs).
- All questions in this paper are structured practical/theory questions.
- 'page_type' MUST be 'section_b_structured' (NEVER 'section_a_mcq').
- 'section' MUST be 'B' (or null).
- All questions are theory questions with varying marks (e.g. 1 to 6 marks each).
- Every sub-part question (e.g. 1(a), 1(b)(i), 2(c), 3(a)) must be extracted with its individual marks and bounding box.
"""
        else:
            practical_guidance = f"""
CRITICAL SPECIFICATION RULES FOR {unit_name}:
- SECTION A CONTAINS EXACTLY 10 MULTIPLE-CHOICE QUESTIONS (Questions 1 to 10).
- Each MCQ in Section A is worth EXACTLY 1 mark.
- SECTION B STARTS AT QUESTION 11 (structured theory questions).
- MCQs 1 to 10 have page_type 'section_a_mcq' and section 'A'.
- Structured questions starting at Question 11 have page_type 'section_b_structured' and section 'B'.
"""

        active_model = self.models[self.current_model_index]
        print(f"    [Gemini API] Querying page {page_index + 1} with '{active_model}'...", flush=True)

        context_parent = None
        context_letter = None
        context_last = None
        if current_question_context:
            context_parent = current_question_context.get("parent_question")
            context_letter = current_question_context.get("active_sub_letter")
            context_last = current_question_context.get("last_seen_qnum")
        elif active_parent_question:
            context_parent = active_parent_question

        context_hint = ""
        if context_parent:
            context_hint = f"""
ACTIVE QUESTION CONTEXT (FROM PRECEDING PAGE):
- Currently Active Parent Question: Question {context_parent}
- Currently Active Sub-Question Part: ({context_letter or 'none'})
- Most Recent Question ID: {context_last or 'none'}
"""

        prompt = f"""You are an expert Pearson Edexcel IAL Physics examiner and OCR document parser.
Analyze this Question Paper page image for {unit_name}.{context_hint}
{practical_guidance}
STRICT OFFICIAL SPECIFICATION SUBTOPICS FOR {unit_name}:
You are classifying a Pearson Edexcel IAL Physics {unit_name} question. You MUST select exclusively from the topics in the list below and never return topics from any other unit.
You MUST choose subtopics ONLY from this exact list. Never invent or hallucinate freeform strings:
{subtopics_enum_json}

CRITICAL RULES:
1. STRICT MULTI-PAGE QUESTION STATE TRACKING & NO PARENT ID DRIFT:
   - When questions split across page breaks without a new top-level "Question X" header, you MUST NOT guess or invent a new parent question number!
   - If this page begins with continuing sub-questions (e.g. (iii), (iv), (c), (b)(iv)), they MUST inherit parent_question = "{context_parent or 'the active parent question'}".
   - Question numbers only advance when an explicit top-level "Question X" header or bold question number appears on the page.
   - Every distinct question item across Section A AND Section B MUST have a complete, fully-qualified hierarchical question_number:
     * In Section A (1-mark MCQs): standalone integers "1", "2", ... "10".
     * In Section B (theory questions): structured questions starting at Question 11 with subparts e.g. "11(a)", "11(b)", "12(a)", "12(b)(i)", etc.
   - CRITICAL: NEVER collapse sub-questions into a shared parent ID (e.g. NEVER output just "11"). Each sub-part item MUST be its own distinct entry in the 'questions' array with its own specific bounding box and specific mark allocation.
   - Extended response questions marked with an asterisk (e.g. "*16 Describe...") have parent_question "16" and question_number "16" or "16(b)" (strip the asterisk from the ID).

2. GRAPH & PLOTTING QUESTION COMPLETENESS:
   - For sub-questions that instruct the candidate to plot, draw, or sketch a graph or curve on a grid (e.g. "Plot the following... on the grid below", "Draw a graph on the grid"):
     The sub-question bounding box [ymin, xmin, ymax, xmax] MUST encompass the prompt text, data table, AND the complete graph paper grid, coordinate axes, and axis labels down to the bottom of the grid area.

3. MCQ BOUNDARY CLIPPING PREVENTION:
   - For Section A multiple-choice questions (Q1–Q10), the bounding box [ymin, xmin, ymax, xmax] MUST encompass all four choices (A, B, C, and D) down to the bottom boundary before the next question begins. Ensure option D and its complete description are enclosed within the box.

4. SUBTOPIC ASSIGNMENT:
   - For each question, select 1 or 2 matching subtopics STRICTLY from the allowed subtopics list above.
   - Also provide the parent topic name.

5. STEM DEFINITION:
   - A stem is STRICTLY un-marked introductory context (e.g. preamble paragraph, circuit diagram, apparatus diagram, force diagram, or numerical data table) that precedes multiple sub-questions.

TASK OUTPUT FORMAT:
Return strictly a JSON object:
{{
  "page_type": "section_a_mcq" | "section_b_structured" | "cover" | "other",
  "section": "A" | "B" | null,
  "stem": {{ "parent_question": "...", "summary": "...", "box_1000": [ymin, xmin, ymax, xmax] }} | null,
  "questions": [
    {{
      "question_number": "...",
      "parent_question": "...",
      "sub_part": "...",
      "marks": 1,
      "topic": "...",
      "subtopics": ["<exact_string_from_allowed_list>", "<optional_second_exact_string>"],
      "box_1000": [ymin, xmin, ymax, xmax],
      "depends_on_stem": true | false,
      "stem_source": "current_page" | "previous_page" | "none"
    }}
  ]
}}
"""

        gemini_res = self._call_gemini_with_fallback(image_150, prompt)
        if gemini_res and "questions" in gemini_res:
            for q in gemini_res["questions"]:
                subs = q.get("subtopics", [])
                cleaned_subs = [s for s in subs if s in official_subtopics]
                if not cleaned_subs and official_subtopics:
                    cleaned_subs = [official_subtopics[0]]
                q["subtopics"] = cleaned_subs[:2]
                q["subtopic"] = cleaned_subs[0] if cleaned_subs else (q.get("subtopic") or official_subtopics[0])
                q["topic"] = get_physics_parent_topic_for_subtopic(q["subtopic"])

            gemini_res = self._sanitize_analysis(gemini_res, page_doc, unit_name=unit_name)
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(gemini_res, f, indent=2)
            return gemini_res

        print(f"    [PyMuPDF Fallback] Using local layout parser for Page {page_index + 1}", flush=True)
        fallback_res = self._pymupdf_fallback_parser(page_doc, unit_name, active_parent_question)
        fallback_res = self._sanitize_analysis(fallback_res, page_doc, unit_name=unit_name)
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(fallback_res, f, indent=2)
        return fallback_res

    def _sanitize_analysis(self, data: Dict[str, Any], page_doc: pymupdf.Page, unit_name: str = "") -> Dict[str, Any]:
        """
        Sanitizes page analysis according to Edexcel IAL Physics rules:
        - Units 1, 2, 4, 5: Section A is strictly Questions 1 to 10 (10 MCQs, 1 mark each).
        - Section B starts at Question 11.
        - Units 3, 6: 0 MCQs, Section B structured.
        """
        if not data:
            return data

        page_text = page_doc.get_text()
        stem = data.get("stem")
        if stem and stem.get("box_1000"):
            s_box = stem["box_1000"]
            while isinstance(s_box, (list, tuple)) and len(s_box) > 0 and isinstance(s_box[0], (list, tuple)):
                s_box = s_box[0]

            pw, ph = page_doc.rect.width, page_doc.rect.height
            clip_rect = pymupdf.Rect(s_box[1]/1000*pw, s_box[0]/1000*ph, s_box[3]/1000*pw, s_box[2]/1000*ph)
            stem_txt = page_doc.get_text("text", clip=clip_rect)
            if re.search(r"\(\d+\)\s*$", stem_txt.strip()) and not any(k in stem.get("summary", "").lower() for k in ["table", "diagram", "circuit", "apparatus"]):
                data["stem"] = None
            elif any(k in stem.get("summary", "").lower() or k in stem_txt.lower() for k in ["total for section", "total for paper"]):
                data["stem"] = None

        is_practical_unit = "unit 3" in unit_name.lower() or "unit 6" in unit_name.lower()
        if is_practical_unit:
            data["page_type"] = "section_b_structured"
            data["section"] = "B"
        else:
            page_full_text = page_doc.get_text()
            has_sec_a_text = "TOTAL FOR SECTION A" in page_full_text.upper() or "SECTION A" in page_full_text.upper()
            has_sec_b_text = "SECTION B" in page_full_text.upper()
            raw_qs = data.get("questions", [])
            if raw_qs and not has_sec_b_text:
                # Physics: Section A is strictly Questions 1-10
                all_sec_a_range = all(
                    str(q.get("parent_question", "")).strip().isdigit()
                    and 1 <= int(str(q.get("parent_question", "")).strip()) <= 10
                    and not bool(re.search(r"\([ivx]+\)", str(q.get("question_number", "")).lower()))
                    for q in raw_qs
                )
                if all_sec_a_range or has_sec_a_text:
                    data["page_type"] = "section_a_mcq"
                    data["section"] = "A"

        pw, ph = page_doc.rect.width, page_doc.rect.height
        drawings = page_doc.get_drawings()
        blocks = page_doc.get_text("blocks")

        total_lines: Dict[str, float] = {}
        for b in blocks:
            m = re.search(r"\(Total for Question\s+(\d+)\s*=", b[4], re.I)
            if m:
                total_lines[m.group(1)] = b[1]

        cleaned_questions = []
        for q in data.get("questions", []):
            q_box = q.get("box_1000")
            if not q_box:
                continue

            while isinstance(q_box, (list, tuple)) and len(q_box) > 0 and isinstance(q_box[0], (list, tuple)):
                q_box = q_box[0]

            q_box[1] = 70
            q_box[3] = 940

            qn = str(q.get("question_number") or "").strip()
            sub = str(q.get("sub_part") or "").strip()
            m_sub = re.findall(r"\(([a-z0-9]+)\)", f"{qn} {sub}".lower())
            if m_sub and not (data.get("page_type") == "section_a_mcq" or data.get("section") == "A"):
                target_marker = m_sub[-1]
                scale = 1000.0 if max(q_box) > 1.0 else 1.0
                clip_rect = pymupdf.Rect(q_box[1]/scale*pw, q_box[0]/scale*ph, q_box[3]/scale*pw, q_box[2]/scale*ph)
                curr_txt = page_doc.get_text("text", clip=clip_rect)
                marker_pat = re.compile(rf"^\s*(?:\([a-z]\)\s*)?\({re.escape(target_marker)}\)", re.I)

                if not marker_pat.search(curr_txt):
                    found_marker_b = None
                    for b in blocks:
                        if marker_pat.search(b[4].strip()):
                            found_marker_b = b
                            break
                    if found_marker_b:
                        b_y0_1000 = int(max(0, found_marker_b[1] - 2) / ph * 1000)
                        b_y1_1000 = int(min(ph, found_marker_b[3] + 150) / ph * 1000)
                        q_box[0] = b_y0_1000
                        q_box[2] = max(q_box[2], b_y1_1000)

            parent_q = str(q.get("parent_question") or "").strip()
            if parent_q in total_lines and (data.get("page_type") == "section_a_mcq" or data.get("section") == "A"):
                tot_y0 = total_lines[parent_q]
                tot_y0_1000 = int((tot_y0 - 4) / ph * 1000)
                if q_box[2] > tot_y0_1000:
                    q_box[2] = tot_y0_1000

            scale = 1000.0 if max(q_box) > 1.0 else 1.0
            clip_rect = pymupdf.Rect(q_box[1]/scale*pw, q_box[0]/scale*ph, q_box[3]/scale*pw, q_box[2]/scale*ph)
            q_text = page_doc.get_text("text", clip=clip_rect)
            is_graph_or_grid = (
                any(w in q_text.lower() for w in ["grid", "plot", "draw the line", "draw a line", "axes", "curve"])
                or ("graph" in q_text.lower() and "use your graph" not in q_text.lower())
            )

            subseq_marker_y0 = None
            for b in blocks:
                if b[1] >= clip_rect.y0 + 20:
                    b_txt = b[4].strip()
                    if re.match(r"^\s*(?:\d{1,2}\s*)?(?:\([a-z]\)\s*)?\([ivx]{1,4}\)", b_txt, re.I) or re.match(r"^\s*(?:\d{1,2}\s*)?\([a-z]\)", b_txt, re.I):
                        if subseq_marker_y0 is None or b[1] < subseq_marker_y0:
                            subseq_marker_y0 = b[1]

            max_allowed_y = min(ph * 0.92, (subseq_marker_y0 - 8) if subseq_marker_y0 else (ph * 0.92))
            if subseq_marker_y0 is not None:
                max_subseq_1000 = int((subseq_marker_y0 - 8) / ph * 1000)
                q_box[2] = min(q_box[2], max_subseq_1000)

            if is_graph_or_grid:
                if drawings:
                    grid_max_y = max((d["rect"].y1 for d in drawings if d["rect"].y1 > clip_rect.y0 and d["rect"].y1 < max_allowed_y), default=0)
                    if grid_max_y > clip_rect.y1:
                        new_ymax = int(min(max_allowed_y, grid_max_y + 10) / ph * 1000)
                        q_box[2] = max(q_box[2], new_ymax)
                for b in blocks:
                    if b[1] >= clip_rect.y0 and b[3] <= max_allowed_y:
                        txt = b[4].strip()
                        if "DO NOT WRITE" not in txt and "*" not in txt and "Turn over" not in txt and "Total for Question" not in txt:
                            b_ymax = int(min(max_allowed_y, b[3] + 12) / ph * 1000)
                            if b_ymax > q_box[2]:
                                q_box[2] = b_ymax

            # Filter out phantom subparts
            final_txt = page_doc.get_text("text", clip=clip_rect).strip()
            final_words = re.findall(r"[A-Za-z]{2,}", final_txt)
            if len(final_words) == 0 and not (data.get("page_type") == "section_a_mcq" or data.get("section") == "A"):
                page_full_txt = page_doc.get_text("text")
                qn_str = str(q.get("question_number") or "").lower()
                sub_str = str(q.get("sub_part") or "").lower()
                has_marker_on_page = bool(re.search(r"\(([a-z0-9ivx]+)\)", f"{qn_str} {sub_str}")) and any(
                    m in page_full_txt.lower() for m in re.findall(r"\(([a-z]|[ivx]+)\)", f"{qn_str} {sub_str}")
                )
                if not has_marker_on_page:
                    continue

            q["box_1000"] = q_box
            cleaned_questions.append(q)

        data["questions"] = cleaned_questions

        # Physics: Section A MCQs (Q1 to Q10) boundary snapping
        sec_a_qs = []
        if not is_practical_unit:
            for q in data.get("questions", []):
                pq = str(q.get("parent_question") or "").strip()
                qn = str(q.get("question_number") or "").strip()
                has_roman = bool(re.search(r"\([ivx]+\)", f"{pq} {qn}".lower()))
                # Physics: Exactly 1 to 10
                if (pq.isdigit() and int(pq) <= 10 and not has_roman) or data.get("page_type") == "section_a_mcq" or data.get("section") == "A":
                    if q.get("box_1000"):
                        sec_a_qs.append(q)

        if sec_a_qs:
            sec_a_qs.sort(key=lambda item: item["box_1000"][0])
            footer_candidates = []
            for b in blocks:
                txt = b[4].strip()
                if re.search(r"rough working|TOTAL FOR SECTION A|TOTAL FOR PAPER|Turn over|\*P\d+", txt, re.I):
                    footer_candidates.append(b[1])
                elif b[1] > ph * 0.85 and re.match(r"^\s*\d{1,2}\s*$", txt):
                    footer_candidates.append(b[1])
            footer_y0_pts = min(footer_candidates) if footer_candidates else (ph * 0.92)
            footer_y0_1000 = int(min(ph * 0.92, footer_y0_pts) / ph * 1000)

            for i, sq in enumerate(sec_a_qs):
                box = sq["box_1000"]
                sq_pq = str(sq.get("parent_question") or "").strip()
                if i < len(sec_a_qs) - 1:
                    next_ymin = sec_a_qs[i + 1]["box_1000"][0]
                    target_ymax = max(box[0] + 50, next_ymin - 10)
                    box[2] = max(box[2], target_ymax)
                else:
                    if sq_pq in total_lines:
                        tot_y1 = total_lines[sq_pq]
                        tot_y1_1000 = int(min(ph * 0.95, tot_y1 + 10) / ph * 1000)
                        box[2] = tot_y1_1000
                    else:
                        target_ymax = min(920, footer_y0_1000 - 10)
                        if target_ymax > box[0] + 50:
                            box[2] = max(box[2], target_ymax)
                sq["box_1000"] = box
                sq["marks"] = 1

        return data

    def _pymupdf_fallback_parser(
        self,
        page_doc: pymupdf.Page,
        unit_name: str,
        active_parent_question: Optional[str] = None,
        current_question_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        pw, ph = page_doc.rect.width, page_doc.rect.height
        blocks = page_doc.get_text("blocks")
        page_text = page_doc.get_text()

        is_practical_unit = "unit 3" in unit_name.lower() or "unit 6" in unit_name.lower()
        is_sec_a = False if is_practical_unit else ("SECTION A" in page_text.upper() or "TOTAL FOR SECTION A" in page_text.upper() or bool(re.search(r"\bQuestion \d+ = 1 mark\b", page_text)))
        is_sec_b = True if is_practical_unit else ("SECTION B" in page_text.upper())

        questions = []
        stem = None

        official_subtopics = get_all_physics_subtopics_for_unit(unit_name)
        default_subtopic = official_subtopics[0] if official_subtopics else "1.1: Physical Quantities, SI Units & Vectors"
        default_topic = get_physics_parent_topic_for_subtopic(default_subtopic)

        # Detect stem if present
        for b in blocks:
            txt = b[4].strip()
            stem_match = re.search(r"^(\d{1,2}):\s*([^\n\r]+(?:is about|investigates|concerns|shows|studies)[^\n\r]*)", txt, re.IGNORECASE)
            if stem_match:
                pq = stem_match.group(1)
                summary = stem_match.group(2).strip()
                stem = {
                    "parent_question": pq,
                    "summary": summary,
                    "box_1000": [
                        int(max(0, b[1] - 8) / ph * 1000),
                        50,
                        int(min(ph, b[3] + 8) / ph * 1000),
                        950
                    ]
                }
                break

        context_pq = current_question_context.get("parent_question") if current_question_context else active_parent_question
        current_pq = stem["parent_question"] if stem else context_pq

        for b in blocks:
            txt = b[4].strip()

            # Compound MCQ: e.g. "14:\t(a)\t..."
            mcq_compound = re.search(r"^(\d{1,2})[:\.\t]\s*\(([a-z])\)\s*(.*)", txt, re.DOTALL)
            if mcq_compound and int(mcq_compound.group(1)) <= 10:
                p_num = mcq_compound.group(1)
                sub_part = f"({mcq_compound.group(2).lower()})"
                full_q = f"{p_num}{sub_part}"
                current_pq = p_num
                questions.append({
                    "question_number": full_q,
                    "parent_question": p_num,
                    "sub_part": sub_part,
                    "marks": 1,
                    "topic": default_topic,
                    "subtopic": default_subtopic,
                    "subtopics": [default_subtopic],
                    "box_1000": [
                        int(max(0, b[1] - 10) / ph * 1000),
                        int(max(0, b[0] - 15) / pw * 1000),
                        int(min(ph, b[3] + 160) / ph * 1000),
                        int(min(pw, b[2] + 60) / pw * 1000)
                    ],
                    "depends_on_stem": bool(stem is not None and stem["parent_question"] == p_num),
                    "stem_source": "current_page" if stem else "none"
                })
                continue

            # Standard Section A MCQ: e.g. "1\t...", "10:\t..."
            mcq_match = re.search(r"^\*?\s*(\d{1,2})[\t:\.]\s*([A-Z].*)", txt)
            if mcq_match and int(mcq_match.group(1)) <= 10 and is_sec_a:
                qnum = mcq_match.group(1)
                current_pq = qnum
                questions.append({
                    "question_number": qnum,
                    "parent_question": qnum,
                    "sub_part": "",
                    "marks": 1,
                    "topic": default_topic,
                    "subtopic": default_subtopic,
                    "subtopics": [default_subtopic],
                    "box_1000": [
                        int(max(0, b[1] - 10) / ph * 1000),
                        int(max(0, b[0] - 15) / pw * 1000),
                        int(min(ph, b[3] + 160) / ph * 1000),
                        int(min(pw, b[2] + 60) / pw * 1000)
                    ],
                    "depends_on_stem": False,
                    "stem_source": "none"
                })
                continue

            # Section B question starts: e.g. "11\t...", "12\t..."
            if mcq_match and (int(mcq_match.group(1)) > 10 or is_sec_b):
                qnum = mcq_match.group(1)
                current_pq = qnum
                # Could be parent stem or standalone question
                continue

            # Section B subparts: e.g. "(a)", "(b)(i)", "(b)(iv)"
            sub_match = re.search(r"^\(([a-z])\)(?:\s*\(([ivx]+)\))?", txt)
            if sub_match:
                parent_q = current_pq or (stem["parent_question"] if stem else "11")
                sub_label = f"({sub_match.group(1)})"
                if sub_match.group(2):
                    sub_label += f"({sub_match.group(2)})"
                full_qnum = f"{parent_q}{sub_label}"

                mark_match = re.search(r"\((\d+)\)\s*$", txt)
                mark_val = int(mark_match.group(1)) if mark_match else (1 if is_sec_a else 2)

                questions.append({
                    "question_number": full_qnum,
                    "parent_question": parent_q,
                    "sub_part": sub_label,
                    "marks": mark_val,
                    "topic": default_topic,
                    "subtopic": default_subtopic,
                    "subtopics": [default_subtopic],
                    "box_1000": [
                        int(max(0, b[1] - 10) / ph * 1000),
                        int(max(0, b[0] - 15) / pw * 1000),
                        int(min(ph, b[3] + 200) / ph * 1000),
                        960
                    ],
                    "depends_on_stem": bool(stem is not None or current_pq is not None),
                    "stem_source": "current_page" if stem else "previous_page"
                })

        return {
            "page_type": "section_a_mcq" if is_sec_a else ("section_b_structured" if is_sec_b else "question_page"),
            "section": "A" if is_sec_a else ("B" if is_sec_b else None),
            "stem": stem,
            "questions": questions
        }
