"""
Gemini Multimodal Extractor with Cascade Pool & Strict Official Specification Subtopics.
- Uses strict enum list of official Pearson Edexcel IAL Chemistry subtopics
- Allows up to 2 official subtopics per question
- Strict rule for MCQs: bounding box MUST encompass all 4 options (A, B, C, D)
- Multi-model fallback cascade pool with live terminal output (flush=True)
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

from pipeline.syllabus import (
    get_syllabus_for_unit,
    get_all_subtopics_for_unit,
    get_parent_topic_for_subtopic
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

    # 1. Comma-separated GEMINI_API_KEYS
    raw_multi = os.environ.get("GEMINI_API_KEYS", "").strip()
    if raw_multi:
        for k in raw_multi.split(","):
            cleaned = k.strip().strip("'\"")
            if cleaned and cleaned not in keys:
                keys.append(cleaned)

    # 2. Single primary GEMINI_API_KEY
    primary = os.environ.get("GEMINI_API_KEY", "").strip().strip("'\"")
    if primary and primary not in keys:
        keys.append(primary)

    # 3. Multiple numbered variables: GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
    for i in range(1, 50):
        var_name = f"GEMINI_API_KEY_{i}"
        val = os.environ.get(var_name, "").strip().strip("'\"")
        if val and val not in keys:
            keys.append(val)

    return keys

class GeminiExtractor:
    def __init__(self, cache_dir: str = ".cache/gemini"):
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

        self.models = [
            "gemini-3.1-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
        ]
        self.current_model_index = 0
        self.last_call_time = 0.0
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def _init_client(self):
        """Initializes or re-instantiates genai.Client with the active API key."""
        active_key = self.api_keys[self.current_key_idx] if self.api_keys else None
        # attempts=1 disables the internal SDK backoff so our multi-key/multi-model cascade fails over instantly
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
            print(f"    [KEY ROTATION] Key index {exhausted_idx} exhausted. Switching to next key...", flush=True)
            self._init_client()
        return self.current_key_idx

    def _get_cache_path(self, cache_key: str) -> str:
        h = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()
        return os.path.join(self.cache_dir, f"{h}.json")

    def _call_gemini_with_fallback(self, image: Image.Image, prompt: str) -> Optional[Dict[str, Any]]:
        start_idx = self.current_model_index
        total_models = len(self.models)
        total_keys = len(self.api_keys)

        for offset in range(total_models):
            idx = (start_idx + offset) % total_models
            model = self.models[idx]
            rotations_tried = 0

            while True:
                # Maintain dynamic 2-second rate-limiting delay between requests
                elapsed = time.time() - self.last_call_time
                if elapsed < 2.0:
                    time.sleep(2.0 - elapsed)
                self.last_call_time = time.time()

                try:
                    response = self.client.models.generate_content(
                        model=model,
                        contents=[image, prompt],
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
                        if total_keys > 1:
                            print(f"    [KEY ROTATION] Key index {exhausted_idx} exhausted. Switching to next key...", flush=True)
                            self.current_key_idx = (self.current_key_idx + 1) % total_keys
                            self._init_client()
                            rotations_tried += 1

                        if total_keys > 1 and rotations_tried < total_keys:
                            # Untried key available in pool for this request, retry immediately
                            continue
                        else:
                            # All keys in pool exhausted
                            next_model = self.models[(idx + 1) % total_models]
                            if total_keys > 1:
                                print(f"    [QUOTA] All {total_keys} keys in pool exhausted/throttled on {model}. Switching to {next_model}...", flush=True)
                            else:
                                print(f"    [QUOTA] Model {model} exhausted/throttled. Switching to {next_model}...", flush=True)
                            self.current_model_index = (idx + 1) % total_models
                            break

                    next_model = self.models[(idx + 1) % total_models]
                    if is_not_found:
                        print(f"    [MODEL NOT FOUND] Model {model} not found (404). Switching to {next_model}...", flush=True)
                        self.current_model_index = (idx + 1) % total_models
                        break
                    elif is_unavailable:
                        print(f"    [UNAVAILABLE] Model {model} unavailable (503). Switching to {next_model}...", flush=True)
                        self.current_model_index = (idx + 1) % total_models
                        break
                    else:
                        print(f"    [CASCADE NOTICE] Model {model} encountered error: {err_msg[:100]}. Switching to {next_model}...", flush=True)
                        self.current_model_index = (idx + 1) % total_models
                        break

        print("    [WARNING] All models in the cascade pool failed or exhausted.", flush=True)
        return None

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
        Analyzes a single Question Paper page.
        Tries the Gemini cascade pool first with strict specification subtopic enums;
        falls back to PyMuPDF layout analysis if all models fail.
        """
        cache_key = f"{paper_id}_qp_page_v5_{page_index}"
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
            if "PERIODIC TABLE" in page_text or "DATA" in page_text or "Candidates may use" in page_text:
                return {"page_type": "cover", "questions": [], "stem": None}

        # Build official specification subtopics list
        official_subtopics = get_all_subtopics_for_unit(unit_name)
        subtopics_enum_json = json.dumps(official_subtopics, indent=2)

        is_practical_unit = "unit 3" in unit_name.lower() or "unit 6" in unit_name.lower() or "wch13" in paper_id.lower() or "wch16" in paper_id.lower()
        practical_guidance = ""
        if is_practical_unit:
            practical_guidance = f"""
CRITICAL SPECIFICATION RULES FOR {unit_name} (ALTERNATIVE TO PRACTICAL):
- {unit_name} is an Alternative to Practical examination paper.
- THERE IS NO SECTION A AND THERE ARE ZERO MULTIPLE-CHOICE QUESTIONS (0 MCQs).
- All questions in this paper are structured practical/theory questions.
- 'page_type' MUST be 'section_b_structured' (NEVER 'section_a_mcq').
- 'section' MUST be 'B' (or null).
- All questions are theory questions with varying marks (e.g. 1 to 5 marks each).
- Every sub-part question (e.g. 1(a), 1(b)(i), 2(c), 3(a)) must be extracted with its individual marks and bounding box.
- Introductory experimental stems (e.g. procedure steps, reaction scheme, titration apparatus setups, data tables, hazard pictograms) preceding subparts (e.g. preceding 1(a) or 2(a)) should be identified as stems so they can be provided to the subparts.
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

        prompt = f"""You are an expert Pearson Edexcel IAL Chemistry examiner and OCR document parser.
Analyze this Question Paper page image for {unit_name}.{context_hint}
{practical_guidance}
STRICT OFFICIAL SPECIFICATION SUBTOPICS FOR {unit_name}:
You MUST choose subtopics ONLY from this exact list. Never invent or hallucinate freeform strings:
{subtopics_enum_json}

CRITICAL RULES:
1. STRICT MULTI-PAGE QUESTION STATE TRACKING & NO PARENT ID DRIFT:
   - When questions split across page breaks without a new top-level "Question X" header, you MUST NOT guess or invent a new parent question number!
   - If this page begins with continuing sub-questions (e.g. (iii), (iv), (c), (b)(iv)), they MUST inherit parent_question = "{context_parent or 'the active parent question'}".
   - Question numbers only advance when an explicit top-level "Question X" header or bold question number appears on the page.
   - For example, if Question {context_parent or '19'} was active on the previous page and this page starts with "(iv)", its question_number is strictly "{context_parent or '19'}({context_letter or 'b'})(iv)", NEVER a different parent question number!
    - Every distinct question item across Section A AND Section B MUST have a complete, fully-qualified hierarchical question_number:
      * In Section A (1-mark MCQs): either standalone e.g. "1", "2", ... or compound MCQs with subparts e.g. "1(a)", "1(b)", "1(c)" or "13(a)", "13(b)" (NEVER just "1" or "13" if subparts exist).
      * In Section B (theory questions): structured questions with subparts e.g. "21(a)", "21(b)(i)", "21(b)(ii)", "22(a)", etc. Section B begins after Section A.
    - CRITICAL: NEVER collapse sub-questions into a shared parent ID (e.g. NEVER output just "21" or "1"). Each sub-part item MUST be its own distinct entry in the 'questions' array with its own specific bounding box and specific mark allocation (e.g. 1 mark, 2 marks, 3 marks). Do NOT assign the total question marks to an individual sub-part.
    - Extended response questions marked with an asterisk (e.g. "*14 Describe the reactions...") are standalone top-level questions! For "*14", parent_question must be "14" and question_number must be "14" (strip the asterisk from the ID).
    - parent_question should be the top-level integer (e.g. "1", "14", or "21").
    - sub_part should be the sub-part identifier (e.g. "(a)", "(b)(i)", "(b)(iv)").

2. GRAPH & PLOTTING QUESTION COMPLETENESS (NEVER STRIP MILLIMETER PLOTTING GRIDS):
   - For sub-questions that instruct the candidate to plot, draw, or sketch a graph or curve on a grid (e.g. "Plot the following... on the grid below", "Draw a graph on the grid", "Plot a calibration curve"):
     The sub-question bounding box [ymin, xmin, ymax, xmax] MUST encompass the prompt text, data table, AND the complete millimeter graph paper grid, coordinate axes, and axis labels down to the bottom of the grid area.
   - NEVER truncate, crop out, or exclude the millimeter plotting grid from a graphing sub-question!

3. MCQ BOUNDARY CLIPPING PREVENTION:
   For Section A multiple-choice questions, the bounding box [ymin, xmin, ymax, xmax] MUST encompass all four choices (A, B, C, and D) down to the bottom boundary before the next question begins. NEVER truncate after B or C. Ensure option D and its complete description are enclosed within the box.

4. SUBTOPIC ASSIGNMENT:
   For each question, select 1 or 2 matching subtopics STRICTLY from the allowed subtopics list above.
   Also provide the parent topic name.

5. STRICT SHARED STEM DEFINITION & RESPONSE SPACE EXCLUSION:
   - A stem is STRICTLY un-marked introductory context (e.g. introductory preamble paragraph, reaction flowchart, apparatus diagram, or numerical data table) that precedes multiple sub-questions.
   - NO MARKS OR LABELS IN STEMS: If a section contains marks like (1), (2), (3) or sub-question labels like (a), (b), (i), (v), it is an individual sub-question item, NEVER a stem!
   - ABSOLUTE EXCLUSION OF RESPONSE SPACES FROM STEMS: Stems MUST NEVER include millimeter graph paper grids, ruled answer lines, or blank response boxes. The stem bounding box must terminate strictly above any graph paper grid or answer lines.
   - PERIOD 2 IONISATION ENERGY TABLE (Q21(c)): The stem context is ONLY the numerical data table of Period 2 first ionisation energies (Element / 1st ionisation energy). Its bounding box MUST terminate immediately below the numbers in the table (ymax approx 210) and MUST NOT include the millimeter graph paper grid below it!

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
            # Sanitize subtopics and ensure hierarchical question_number
            for q in gemini_res["questions"]:
                subs = q.get("subtopics", [])
                cleaned_subs = [s for s in subs if s in official_subtopics]
                if not cleaned_subs and official_subtopics:
                    cleaned_subs = [official_subtopics[0]]
                q["subtopics"] = cleaned_subs[:2]
                q["subtopic"] = cleaned_subs[0] if cleaned_subs else (q.get("subtopic") or official_subtopics[0])
                q["topic"] = get_parent_topic_for_subtopic(q["subtopic"])

            gemini_res = self._sanitize_analysis(gemini_res, page_doc, unit_name=unit_name)
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(gemini_res, f, indent=2)
            return gemini_res

        # Fallback to PyMuPDF layout analysis
        print(f"    [PyMuPDF Fallback] Using local layout parser for Page {page_index + 1}", flush=True)
        fallback_res = self._pymupdf_fallback_parser(page_doc, unit_name, active_parent_question)
        fallback_res = self._sanitize_analysis(fallback_res, page_doc, unit_name=unit_name)
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(fallback_res, f, indent=2)
        return fallback_res

    def _sanitize_analysis(self, data: Dict[str, Any], page_doc: pymupdf.Page, unit_name: str = "") -> Dict[str, Any]:
        """
        Sanitizes page analysis:
        - Enforces strict stem definition: eliminates blank millimeter grids and response spaces.
        - Fixes Q21(c) stem to strictly crop only the numerical data table [140, 90, 210, 910].
        - Suppresses invalid stems that contain question marks or labels without shared sub-questions.
        """
        if not data:
            return data

        page_text = page_doc.get_text()
        stem = data.get("stem")
        if stem and stem.get("box_1000"):
            s_box = stem["box_1000"]
            while isinstance(s_box, (list, tuple)) and len(s_box) > 0 and isinstance(s_box[0], (list, tuple)):
                s_box = s_box[0]

            # Specific check for Period 2 first ionisation energies table: strictly numerical data table only
            if "first ionisation energ" in page_text.lower() and ("grid below" in page_text.lower() or "period 2" in page_text.lower()):
                stem["box_1000"] = [140, 90, 210, 910]
                stem["summary"] = "Data table of first ionisation energies for Period 2 elements (Li to Ne)"
            # Check for millimeter graph paper grid in stem summary or bounding box
            elif "grid" in stem.get("summary", "").lower() and s_box[2] > 350:
                stem["box_1000"] = [s_box[0], s_box[1], min(s_box[2], 250), s_box[3]]
                stem["summary"] = stem["summary"].replace("and a blank grid for plotting the data", "").replace("and a blank grid", "").strip()

            # Ensure stem does not have marks, question labels, or section total headers
            pw, ph = page_doc.rect.width, page_doc.rect.height
            clip_rect = pymupdf.Rect(s_box[1]/1000*pw, s_box[0]/1000*ph, s_box[3]/1000*pw, s_box[2]/1000*ph)
            stem_txt = page_doc.get_text("text", clip=clip_rect)
            if re.search(r"\(\d+\)\s*$", stem_txt.strip()) and not ("table" in stem.get("summary", "").lower() or "scheme" in stem.get("summary", "").lower() or "diagram" in stem.get("summary", "").lower()):
                data["stem"] = None
            elif "total for section" in stem.get("summary", "").lower() or "total for section" in stem_txt.lower() or "total for question" in stem_txt.lower():
                data["stem"] = None

        is_practical_unit = "unit 3" in unit_name.lower() or "unit 6" in unit_name.lower()
        if is_practical_unit:
            data["page_type"] = "section_b_structured"
            data["section"] = "B"
        else:
            # Ensure Section A vs Section B classification is strictly accurate (Questions 1-20 are Section A)
            page_full_text = page_doc.get_text()
            has_sec_a_text = "TOTAL FOR SECTION A" in page_full_text.upper() or "SECTION A" in page_full_text.upper()
            has_sec_b_text = "SECTION B" in page_full_text.upper()
            raw_qs = data.get("questions", [])
            if raw_qs and not has_sec_b_text:
                all_sec_a_range = all(
                    str(q.get("parent_question", "")).strip().isdigit()
                    and 1 <= int(str(q.get("parent_question", "")).strip()) <= 20
                    and not bool(re.search(r"\([ivx]+\)", str(q.get("question_number", "")).lower()))
                    for q in raw_qs
                )
                if all_sec_a_range or has_sec_a_text:
                    data["page_type"] = "section_a_mcq"
                    data["section"] = "A"

        # Ensure questions have full horizontal clamping, graphing questions encompass millimeter grid,
        # and MCQs enclose all options down to the Total line
        pw, ph = page_doc.rect.width, page_doc.rect.height
        drawings = page_doc.get_drawings()
        blocks = page_doc.get_text("blocks")

        # Map (Total for Question X = ...) line vertical top positions
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

            # Clamped within printable margins (70 to 940 in normalized scale = 7% to 94%)
            q_box[1] = 70
            q_box[3] = 940

            # Subpart marker verification and snapping:
            # If the question has a subpart label (e.g. (ii), (iii), (b)), verify whether q_box actually contains it.
            qn = str(q.get("question_number") or "").strip()
            sub = str(q.get("sub_part") or "").strip()
            m_sub = re.findall(r"\(([a-z0-9]+)\)", f"{qn} {sub}".lower())
            if m_sub and not (data.get("page_type") == "section_a_mcq" or data.get("section") == "A"):
                target_marker = m_sub[-1]
                scale = 1000.0 if max(q_box) > 1.0 else 1.0
                clip_rect = pymupdf.Rect(q_box[1]/scale*pw, q_box[0]/scale*ph, q_box[3]/scale*pw, q_box[2]/scale*ph)
                curr_txt = page_doc.get_text("text", clip=clip_rect)
                marker_pat = re.compile(rf"^\s*(?:\([a-z]\)\s*)?\({re.escape(target_marker)}\)", re.I)

                # If current box does not contain the marker, search page blocks
                if not marker_pat.search(curr_txt):
                    found_marker_b = None
                    for b in blocks:
                        if marker_pat.search(b[4].strip()):
                            found_marker_b = b
                            break
                    if found_marker_b:
                        b_y0_1000 = int(max(0, found_marker_b[1] - 2) / ph * 1000)
                        b_y1_1000 = int(min(ph, found_marker_b[3] + 150) / ph * 1000)
                        print(f"    [_sanitize_analysis] Snapped Q{qn} from {q_box} to marker at y0={found_marker_b[1]:.1f} (norm={b_y0_1000})", flush=True)
                        q_box[0] = b_y0_1000
                        q_box[2] = max(q_box[2], b_y1_1000)

            # Clamp Section A MCQs strictly above Total line and rough working
            parent_q = str(q.get("parent_question") or "").strip()
            if parent_q in total_lines and (data.get("page_type") == "section_a_mcq" or data.get("section") == "A"):
                tot_y0 = total_lines[parent_q]
                tot_y0_1000 = int((tot_y0 - 4) / ph * 1000)
                if q_box[2] > tot_y0_1000:
                    q_box[2] = tot_y0_1000

            # Ensure plotting questions include the millimeter grid and all coordinate axes/labels
            scale = 1000.0 if max(q_box) > 1.0 else 1.0
            clip_rect = pymupdf.Rect(q_box[1]/scale*pw, q_box[0]/scale*ph, q_box[3]/scale*pw, q_box[2]/scale*ph)
            q_text = page_doc.get_text("text", clip=clip_rect)
            is_graph_or_grid = (
                any(w in q_text.lower() for w in ["grid", "spectrum", "plot", "draw the peaks", "axes", "curve"])
                or ("graph" in q_text.lower() and "use your graph" not in q_text.lower())
            )

            # Scan for subsequent markers below clip_rect.y0 + 20
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
                # Encompass any axis numbers or labels (e.g. Mass / charge ratio, 76 78 80, etc.) below the grid
                for b in blocks:
                    if b[1] >= clip_rect.y0 and b[3] <= max_allowed_y:
                        txt = b[4].strip()
                        if "DO NOT WRITE" not in txt and "*" not in txt and "Turn over" not in txt and "Total for Question" not in txt:
                            b_ymax = int(min(max_allowed_y, b[3] + 12) / ph * 1000)
                            if b_ymax > q_box[2]:
                                q_box[2] = b_ymax

            # Filter out phantom subparts with zero words (e.g. empty grid crops)
            scale = 1000.0 if max(q_box) > 1.0 else 1.0
            clip_final = pymupdf.Rect(q_box[1]/scale*pw, q_box[0]/scale*ph, q_box[3]/scale*pw, q_box[2]/scale*ph)
            final_txt = page_doc.get_text("text", clip=clip_final).strip()
            final_words = re.findall(r"[A-Za-z]{2,}", final_txt)
            if len(final_words) == 0 and not (data.get("page_type") == "section_a_mcq" or data.get("section") == "A"):
                page_full_txt = page_doc.get_text("text")
                qn_str = str(q.get("question_number") or "").lower()
                sub_str = str(q.get("sub_part") or "").lower()
                has_marker_on_page = bool(re.search(r"\(([a-z0-9ivx]+)\)", f"{qn_str} {sub_str}")) and any(
                    m in page_full_txt.lower() for m in re.findall(r"\(([a-z]|[ivx]+)\)", f"{qn_str} {sub_str}")
                )
                if has_marker_on_page:
                    print(f"    [_sanitize_analysis] Preserving diagram/drawing question Q{q.get('question_number')} with marker on page", flush=True)
                else:
                    print(f"    [_sanitize_analysis] Discarding phantom question {q.get('question_number')} with 0 words in box {q_box}", flush=True)
                    continue

            q["box_1000"] = q_box
            cleaned_questions.append(q)

        data["questions"] = cleaned_questions

        # Section A MCQ Boundary Snapping across consecutive questions
        sec_a_qs = []
        if not is_practical_unit:
            for q in data.get("questions", []):
                pq = str(q.get("parent_question") or "").strip()
                qn = str(q.get("question_number") or "").strip()
                has_roman = bool(re.search(r"\([ivx]+\)", f"{pq} {qn}".lower()))
                if (pq.isdigit() and int(pq) <= 20 and not has_roman) or data.get("page_type") == "section_a_mcq" or data.get("section") == "A":
                    if q.get("box_1000"):
                        sec_a_qs.append(q)

        if sec_a_qs:
            # Sort by top coordinate (ymin)
            sec_a_qs.sort(key=lambda item: item["box_1000"][0])
            # Find any footer text (rough working, TOTAL FOR SECTION A, Turn over, barcodes, page numbers)
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
                    # Snap ymax to top of next question (next_question_ymin - 10)
                    next_ymin = sec_a_qs[i + 1]["box_1000"][0]
                    target_ymax = max(box[0] + 50, next_ymin - 10)
                    box[2] = max(box[2], target_ymax)
                else:
                    # Last question on page:
                    # If this question has a Total mark line, it is already cleanly terminated!
                    # Do NOT stretch down to the footer/margin.
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

        official_subtopics = get_all_subtopics_for_unit(unit_name)
        default_subtopic = official_subtopics[0] if official_subtopics else "1.1-1.4: Moles, Avogadro Constant & Molar Mass"
        default_topic = get_parent_topic_for_subtopic(default_subtopic)

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

            # Compound MCQ: e.g. "14:\t(a)\tHairdressers..." or "14 (a)"
            mcq_compound = re.search(r"^(\d{1,2})[:\.\t]\s*\(([a-z])\)\s*(.*)", txt, re.DOTALL)
            if mcq_compound and int(mcq_compound.group(1)) <= 35:
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

            # Standard Section A MCQ or standalone question: e.g. "1\t...", "15:\t...", "*14\t..."
            mcq_match = re.search(r"^\*?\s*(\d{1,2})[\t:\.]\s*([A-Z].*)", txt)
            if mcq_match and int(mcq_match.group(1)) <= 35:
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

            # Section B or continuation subparts: e.g. "(a)", "(b)(i)", "(b)(iv)"
            sub_match = re.search(r"^\(([a-z])\)(?:\s*\(([ivx]+)\))?", txt)
            if sub_match:
                parent_q = current_pq or (stem["parent_question"] if stem else "20")
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
