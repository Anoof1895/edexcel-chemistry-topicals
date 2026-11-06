"""
Standalone High-Throughput Gemini Topic & Subtopic Classifier for Edexcel IAL
(Chemistry, Physics, and Mathematics)
=============================================================================
Re-classifies questions across `dataset.json` (Chemistry), `dataset_physics.json`
(Physics), and `dataset_math.json` (Mathematics) strictly into the canonical
Pearson Edexcel IAL specification taxonomies (`pipeline/syllabus*.py` and
`frontend/src/constants/taxonomy.ts`).

Key Features:
1. **Rich Question + Stem + Mark Scheme Text Extraction (`EdexcelPDFTextCache`)**:
   - Parses each paper's Question Paper PDF (`que_path`) and Mark Scheme PDF (`rms_path`)
     once per paper in ~60ms using normalized PyMuPDF block & anchor analysis.
   - Combines parent stem context, branch stem context, leaf question prompt, and
     mark scheme answer/guidance points so even brief sub-questions (e.g. `21(b)(ii)`)
     carry complete scientific/mathematical context.
2. **Unit-Scoped Canonical Taxonomy Enforcement**:
   - Batches questions by Unit (`WCH11`..`WCH16`, `WPH11`..`WPH16`, `WMA11`..`WMA14`,
     `WME01`, `WST01`) and restricts Gemini to that unit's exact official subtopics.
   - Derives `topic` deterministically from the primary `subtopic` via
     `get_*_parent_topic_for_subtopic()` so `topic` and `subtopic` match
     `frontend/src/constants/taxonomy.ts` 100% of the time.
3. **Multi-Key, Multi-Model Cascade Pool with Persistent Caching**:
   - Uses all configured `GEMINI_API_KEY*` keys with `HttpRetryOptions(attempts=1)`
     for zero-hang failover across `gemini-3-flash-preview`, `gemini-3.5-flash-lite`,
     `gemini-3.1-flash-lite`, `gemini-3.1-flash-lite-preview`, and `gemini-2.5-flash`.
   - Saves progress incrementally to `pipeline/classification_cache_<subject>.json`
     and syncs updated datasets to both root and `frontend/public/`.
"""

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from pathlib import Path
import re
import shutil
import sys
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import dotenv
from google import genai
from google.genai import types
import pymupdf

# Ensure root workspace is importable
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.batch_scanner import scan_papers_directory
from pipeline.batch_scanner_math import scan_math_papers_directory
from pipeline.batch_scanner_physics import scan_physics_papers_directory
from pipeline.gemini_extractor import load_gemini_api_keys
from pipeline.ms_matcher import canonical_id
from pipeline.syllabus import (
    OFFICIAL_SYLLABUS,
    get_all_subtopics_for_unit,
    get_parent_topic_for_subtopic,
)
from pipeline.syllabus_math import (
    OFFICIAL_MATH_SYLLABUS,
    get_all_math_subtopics_for_unit,
    get_math_parent_topic_for_subtopic,
)
from pipeline.syllabus_physics import (
    OFFICIAL_PHYSICS_SYLLABUS,
    get_all_physics_subtopics_for_unit,
    get_physics_parent_topic_for_subtopic,
)

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

dotenv.load_dotenv(ROOT_DIR / ".env")

ROMAN_SET = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"}
DELIMITER_REGEX = re.compile(
    r"TOTAL\s+FOR\s+(?:SECTION\s+[BC]|PAPER)\s*=\s*(?:50|70|75|80|90|\d+)\s*MARKS?",
    re.I,
)
Q_HDR_RE = re.compile(
    r"^\s*\*?\s*(\d{1,2})(?:[\s\t\x00-\x1f\.\:\$\u2009]+|\s+(?=[A-Za-z\(])|$)(.*)",
    re.I,
)
UNIVERSAL_SUB_RE = re.compile(
    r"^\s*\*?\s*(?:(\d{1,2})\s+)?\*?\s*\(([a-z])\)(?:\s*\(([ivx]+)\))?",
    re.I,
)
SUB_ROM_RE = re.compile(
    r"^\s*\*?\s*(?:(\d{1,2})\s+)?\*?\s*\(([ivx]+)\)",
    re.I,
)
TOT_RE = re.compile(
    r"\(Total\s+for\s+Question\s+(\d{1,2})\s*=\s*(\d+)\s*marks?\)",
    re.I,
)
UNIT_QUANTITY_RE = re.compile(
    r"^\d{1,2}\s*(?:cm|dm|mm|g|mg|kg|mol|pa|kpa|kj|°|%|n|m|s|ms|v|mv|w|kw|j|hz|mhz|Ω|ohm|passengers)\b",
    re.I,
)

MATH_UNIT_ALIASES: Dict[str, str] = {
    "P1": "WMA11",
    "P2": "WMA12",
    "P3": "WMA13",
    "P4": "WMA14",
    "M1": "WME01",
    "M2": "WME02",
    "M3": "WME03",
    "S1": "WST01",
    "S2": "WST02",
    "S3": "WST03",
    "WMA11": "WMA11",
    "WMA12": "WMA12",
    "WMA13": "WMA13",
    "WMA14": "WMA14",
    "WME01": "WME01",
    "WST01": "WST01",
}

PHYSICS_UNIT_ALIASES: Dict[str, str] = {
    "U1": "WPH11",
    "U2": "WPH12",
    "U3": "WPH13",
    "U4": "WPH14",
    "U5": "WPH15",
    "U6": "WPH16",
    "WPH11": "WPH11",
    "WPH12": "WPH12",
    "WPH13": "WPH13",
    "WPH14": "WPH14",
    "WPH15": "WPH15",
    "WPH16": "WPH16",
}

CHEMISTRY_UNIT_ALIASES: Dict[str, str] = {
    "U1": "WCH11",
    "U2": "WCH12",
    "U3": "WCH13",
    "U4": "WCH14",
    "U5": "WCH15",
    "U6": "WCH16",
    "WCH11": "WCH11",
    "WCH12": "WCH12",
    "WCH13": "WCH13",
    "WCH14": "WCH14",
    "WCH15": "WCH15",
    "WCH16": "WCH16",
}

SYNOPTIC_ALLOWED_UNITS: Dict[str, Dict[str, List[str]]] = {
    "chemistry": {
        "WCH11": ["WCH11"],
        "WCH12": ["WCH12", "WCH11"],
        "WCH13": ["WCH13", "WCH11", "WCH12"],
        "WCH14": ["WCH14", "WCH11", "WCH12"],
        "WCH15": ["WCH15", "WCH11", "WCH12", "WCH14"],
        "WCH16": ["WCH16", "WCH11", "WCH12", "WCH14", "WCH15"],
    },
    "physics": {
        "WPH11": ["WPH11"],
        "WPH12": ["WPH12", "WPH11"],
        "WPH13": ["WPH13", "WPH11", "WPH12"],
        "WPH14": ["WPH14", "WPH11", "WPH12"],
        "WPH15": ["WPH15", "WPH11", "WPH12", "WPH14"],
        "WPH16": ["WPH16", "WPH11", "WPH12", "WPH14", "WPH15"],
    },
    "mathematics": {
        "WMA11": ["WMA11"],
        "WMA12": ["WMA12", "WMA11"],
        "WMA13": ["WMA13", "WMA11", "WMA12"],
        "WMA14": ["WMA14", "WMA11", "WMA12", "WMA13"],
        "WME01": ["WME01", "WMA11"],
        "WST01": ["WST01"],
    },
}



def normalize_span(text: str) -> str:
    """Normalizes font shift (-29 codepoints) and control characters from legacy exam PDFs."""
    if "\x03" in text or "\x0b" in text or "\x0c" in text:
        res = []
        for c in text:
            if c in "\r\n\t":
                res.append(c)
            elif ord(c) == 3:
                res.append(" ")
            elif ord(c) < 128:
                res.append(chr(ord(c) + 29))
            else:
                res.append(c)
        return "".join(res)
    return text


def get_page_normalized_blocks(
    page: pymupdf.Page,
) -> List[Tuple[float, float, float, float, str]]:
    """Extracts text blocks with per-span font normalization."""
    blocks = []
    page_dict = page.get_text("dict")
    for b in page_dict.get("blocks", []):
        if b.get("type") != 0:
            continue
        lines_text = []
        for l in b.get("lines", []):
            line_str = "".join(
                normalize_span(s.get("text", "")) for s in l.get("spans", [])
            )
            lines_text.append(line_str)
        full_text = "\n".join(lines_text).strip()
        if full_text:
            blocks.append(
                (b["bbox"][0], b["bbox"][1], b["bbox"][2], b["bbox"][3], full_text)
            )
    return blocks


def clean_extracted_text(raw: str, max_len: int = 550) -> str:
    """Removes dotted answer lines, barcode strings, and excess whitespace."""
    if not raw:
        return ""
    s = re.sub(r"DO NOT WRITE IN THIS AREA", " ", raw, flags=re.I)
    s = re.sub(r"\*P\d+[A-Z0-9]+\*", " ", s)
    s = re.sub(r"[\.\_]{4,}", " ", s)
    s = re.sub(r"[\s\t\r\n\u2009\uf070\uf020]+", " ", s).strip()
    if len(s) > max_len:
        s = s[:max_len].rstrip() + "..."
    return s


class EdexcelPDFTextCache:
    """
    Fast, paper-level Question Paper + Mark Scheme text extractor.
    Parses each paper's QP and MS PDFs once and caches question stems, subpart
    prompts, and mark scheme answers by canonical question ID.
    """

    def __init__(self, pairs_by_paper_id: Dict[str, Dict[str, Any]]):
        self.pairs = pairs_by_paper_id
        self._paper_cache: Dict[str, Dict[str, Dict[str, str]]] = {}
        self._lock = threading.Lock()

    def _parse_qp_pdf(self, que_path: str) -> Dict[str, str]:
        qp_texts: Dict[str, str] = {}
        if not que_path or not os.path.exists(que_path):
            return qp_texts

        try:
            doc = pymupdf.open(que_path)
        except Exception:
            return qp_texts

        cur_q: Optional[str] = None
        cur_let: Optional[str] = None
        cur_key: Optional[str] = None

        try:
            for p_idx in range(len(doc)):
                page = doc[p_idx]
                ph = page.rect.height
                blocks = sorted(get_page_normalized_blocks(page), key=lambda x: x[1])
                hit_delimiter = False

                for x0, y0, x1, y1, text in blocks:
                    if y0 > ph - 55 or y0 < 32:
                        continue
                    if (
                        "DO NOT WRITE" in text
                        or "*P" in text
                        or "BLANK PAGE" in text
                        or "Turn over" in text
                    ):
                        continue
                    if DELIMITER_REGEX.search(text):
                        hit_delimiter = True
                        break
                    if TOT_RE.search(text):
                        continue

                    lines = [l.strip() for l in text.split("\n") if l.strip()]
                    if not lines:
                        continue
                    fl = lines[0]
                    if (
                        len(lines) > 1
                        and re.fullmatch(r"\*?\s*(?:\d{1,2})?\s*\*?", fl)
                        and re.match(
                            r"^\*?\s*\(?[a-z]+\)", " ".join(lines[1:3]).lstrip("* ")
                        )
                    ):
                        fl = re.sub(r"[\s\*]+", " ", " ".join(lines[:3])).strip()

                    if x0 < 82:
                        mq = Q_HDR_RE.match(fl)
                        if (
                            mq
                            and 1 <= int(mq.group(1)) <= 35
                            and not UNIT_QUANTITY_RE.match(fl)
                            and not re.match(r"^[\s\d:.]*[\._\-]{2,}", fl)
                        ):
                            cur_q = mq.group(1)
                            cur_let = None
                            cur_key = cur_q
                            ms = UNIVERSAL_SUB_RE.match(fl)
                            if ms and ms.group(2).lower() not in ROMAN_SET:
                                cur_let = ms.group(2).lower()
                                rom = ms.group(3).lower() if ms.group(3) else ""
                                cur_key = f"{cur_q}{cur_let}{rom}"

                    if x0 < 135 and cur_q:
                        ms = UNIVERSAL_SUB_RE.match(fl)
                        if ms:
                            let = ms.group(2).lower()
                            rom = ms.group(3).lower() if ms.group(3) else ""
                            if let in ROMAN_SET and cur_let:
                                cur_key = f"{cur_q}{cur_let}{let}"
                            else:
                                cur_let = let
                                cur_key = f"{cur_q}{cur_let}{rom}"
                        else:
                            mr = SUB_ROM_RE.match(fl)
                            if mr and cur_let:
                                cur_key = f"{cur_q}{cur_let}{mr.group(2).lower()}"

                    if cur_key:
                        qp_texts[cur_key] = qp_texts.get(cur_key, "") + " " + text

                if hit_delimiter:
                    break
        finally:
            doc.close()

        return qp_texts

    def _parse_ms_pdf(self, rms_path: str) -> Dict[str, str]:
        ms_texts: Dict[str, str] = {}
        if not rms_path or not os.path.exists(rms_path):
            return ms_texts

        try:
            ms_doc = pymupdf.open(rms_path)
        except Exception:
            return ms_texts

        last_p: Optional[str] = None
        last_let: Optional[str] = None
        cur_cid: Optional[str] = None

        try:
            for p_idx in range(len(ms_doc)):
                blocks = get_page_normalized_blocks(ms_doc[p_idx])
                if p_idx < 3:
                    joined_page = " ".join(b[4] for b in blocks[:8])
                    if "General Marking Guidance" in joined_page or (
                        "Pearson Edexcel" in joined_page and "Question" not in joined_page
                    ):
                        continue

                anchors: List[Tuple[float, str]] = []
                for x0, y0, x1, y1, text in sorted(blocks, key=lambda b: b[1]):
                    t = text.strip()
                    if not t or ("Question" in t and ("Answer" in t or "Number" in t)):
                        continue
                    if x0 < 110:
                        c0 = t.split("\n")[0].strip()
                        mp = re.match(r"^(\d{1,2})(.*)", c0)
                        cid = None
                        if mp and 1 <= int(mp.group(1)) <= 35:
                            last_p = mp.group(1)
                            rest = mp.group(2).strip()
                            m_let = re.search(r"\(([a-z])\)", rest, re.I)
                            if m_let and m_let.group(1).lower() not in ROMAN_SET:
                                last_let = m_let.group(1).lower()
                            cid = canonical_id(c0)
                        elif c0.startswith("(") and last_p:
                            m_inner = re.findall(r"\(([a-z0-9]+)\)", c0.lower())
                            if m_inner:
                                if m_inner[0] in ROMAN_SET and last_let:
                                    cid = canonical_id(
                                        f"{last_p}({last_let})({m_inner[0]})"
                                    )
                                else:
                                    last_let = m_inner[0]
                                    cid = canonical_id(f"{last_p}{c0}")
                        if cid:
                            anchors.append((y0, cid))
                            if len(t) > len(c0) + 2 or x1 > 130:
                                ms_texts[cid] = ms_texts.get(cid, "") + " " + t

                # Sort right-side blocks so main Answer column (x0 < 435) precedes Guidance
                right_blocks = [
                    b for b in blocks if 105 <= b[0] <= 695 and not (432 <= b[0] <= 456)
                ]
                right_blocks.sort(key=lambda b: (0 if b[0] < 435 else 1, b[1], b[0]))

                for x0, y0, x1, y1, text in right_blocks:
                    t = text.strip()
                    if not t or ("Question" in t and "Answer" in t):
                        continue
                    if t in (
                        "Answer",
                        "Additional guidance",
                        "Additional Guidance",
                        "Mark",
                        "Acceptable Answers",
                        "Notes",
                    ):
                        continue
                    if re.fullmatch(r"\(\d+\)|\d+", t):
                        continue

                    matched_cid = cur_cid
                    for ay0, acid in anchors:
                        if ay0 <= y0 + 15:
                            matched_cid = acid
                        else:
                            break
                    if matched_cid:
                        ms_texts[matched_cid] = ms_texts.get(matched_cid, "") + " " + t

                if anchors:
                    cur_cid = anchors[-1][1]
        finally:
            ms_doc.close()

        return ms_texts

    def get_paper_data(self, paper_id: str) -> Dict[str, Dict[str, str]]:
        with self._lock:
            if paper_id in self._paper_cache:
                return self._paper_cache[paper_id]

        pair = self.pairs.get(paper_id)
        if not pair:
            res = {"qp": {}, "ms": {}}
        else:
            qp = self._parse_qp_pdf(pair.get("que_path", ""))
            ms = self._parse_ms_pdf(pair.get("rms_path", ""))
            res = {"qp": qp, "ms": ms}

        with self._lock:
            self._paper_cache[paper_id] = res
        return res

    def build_rich_context_for_question(self, q: Dict[str, Any]) -> str:
        """
        Builds a rich, compact text representation of a question combining:
        - Existing `text` and `stemSummary` fields
        - Parent question stem + branch stem + subpart prompt from QP PDF
        - Mark scheme answer & guidance from MS PDF
        """
        paper_id = q.get("paperId") or q.get("paper_id") or ""
        qnum = str(q.get("questionNumber") or q.get("question_number") or "").strip()
        parent_q = str(q.get("parentQuestion") or "").strip()
        cid = canonical_id(qnum)
        parent_cid = canonical_id(parent_q)

        parts: List[str] = []

        # 1. Existing text / stemSummary
        existing_txt = clean_extracted_text(str(q.get("text") or ""), max_len=450)
        stem_sum = clean_extracted_text(str(q.get("stemSummary") or ""), max_len=200)
        if stem_sum and stem_sum.lower() not in (
            "none",
            f"question {parent_q} setup and context",
            f"question {parent_q} context and setup",
        ):
            parts.append(f"Stem: {stem_sum}")

        pdata = self.get_paper_data(paper_id)
        qp_map = pdata["qp"]
        ms_map = pdata["ms"]

        # 2. Parent & branch stem from QP if this is a sub-question
        if parent_cid and parent_cid != cid and parent_cid in qp_map:
            p_stem = clean_extracted_text(qp_map[parent_cid], max_len=260)
            if p_stem:
                parts.append(f"Context: {p_stem}")

        # Check intermediate letter branch stem e.g. 21(a)(i) -> check 21a
        m_let = re.match(r"^(\d+[a-z])[ivx]+$", cid)
        if m_let:
            branch_cid = m_let.group(1)
            if branch_cid in qp_map and branch_cid != cid:
                b_stem = clean_extracted_text(qp_map[branch_cid], max_len=220)
                if b_stem:
                    parts.append(f"Part Setup: {b_stem}")

        # 3. Direct Question Text
        q_txt = clean_extracted_text(qp_map.get(cid, ""), max_len=420)
        if existing_txt and len(existing_txt) > len(q_txt):
            q_txt = existing_txt
        elif not q_txt and parent_cid in qp_map:
            q_txt = clean_extracted_text(qp_map[parent_cid], max_len=420)

        if q_txt:
            parts.append(f"Q: {q_txt}")
        elif existing_txt:
            parts.append(f"Q: {existing_txt}")

        # 4. Mark Scheme Answer / Guidance Text
        ms_txt = clean_extracted_text(ms_map.get(cid, ""), max_len=320)
        if not ms_txt and m_let and m_let.group(1) in ms_map:
            ms_txt = clean_extracted_text(ms_map[m_let.group(1)], max_len=260)
        if not ms_txt and parent_cid in ms_map and not q.get("subPart"):
            ms_txt = clean_extracted_text(ms_map[parent_cid], max_len=260)

        ans_key = q.get("correctAnswer") or q.get("answer")
        if ans_key and not ms_txt:
            parts.append(f"Answer Key: {ans_key}")
        elif ms_txt:
            parts.append(f"MS: {ms_txt}")

        return " | ".join(parts) if parts else f"Question {qnum}"


class UnitTaxonomyResolver:
    """
    Resolves unit-scoped subtopic codes or strings strictly into canonical
    (`topic`, `subtopic`, `subtopics`) tuples matching `frontend/src/constants/taxonomy.ts`.
    """

    def __init__(self, subject: str):
        self.subject = subject
        if subject == "chemistry":
            self.syllabus = OFFICIAL_SYLLABUS
            self.parent_fn = get_parent_topic_for_subtopic
        elif subject == "physics":
            self.syllabus = OFFICIAL_PHYSICS_SYLLABUS
            self.parent_fn = get_physics_parent_topic_for_subtopic
        elif subject == "mathematics":
            self.syllabus = OFFICIAL_MATH_SYLLABUS
            self.parent_fn = get_math_parent_topic_for_subtopic
        else:
            raise ValueError(f"Unsupported subject: {subject}")

        # Precompute per-unit code maps
        self.unit_subtopics: Dict[str, List[str]] = {}
        self.unit_code_to_subtopic: Dict[str, Dict[str, str]] = {}
        self.unit_subtopic_to_topic: Dict[str, Dict[str, str]] = {}

        for ucode, udata in self.syllabus.items():
            subs: List[str] = []
            code_map: Dict[str, str] = {}
            topic_map: Dict[str, str] = {}
            for topic_name, topic_subs in udata["topics"].items():
                for s in topic_subs:
                    subs.append(s)
                    topic_map[s] = topic_name
                    prefix = s.split(":")[0].strip()
                    code_map[prefix.upper()] = s
                    code_map[s.upper()] = s

                    # Index exact leading token e.g. "P1 1.1-1.2", "P1 5.2a", "M1 3.1a", "1.3.1", "1.4.3"
                    m_lead = re.match(
                        r"^([A-Z0-9]+(?:\s+[0-9]+(?:\.[0-9]+)+[a-z]?|[0-9]+(?:\.[0-9]+)+[a-z]?))",
                        prefix,
                        re.I,
                    )
                    if m_lead:
                        lead = m_lead.group(1).upper()
                        code_map[lead] = s
                        parts = lead.split()
                        if len(parts) > 1:
                            code_map[parts[1]] = s

                    # Index 3-part dotted numbers (e.g. 1.3.1, 1.4.2, 2.3.5, 4.3.1, 5.6.3)
                    for num3 in re.findall(r"\b\d+\.\d+\.\d+[a-z]?\b", prefix, re.I):
                        code_map[num3.upper()] = s

                    # Index 2-part dotted numbers with optional letters (e.g. 1.1, 1.12, 1.5, 5.2a, 7.1b, 3.3, 6.5)
                    for num2 in re.findall(r"\b\d+\.\d+[a-z]?\b", prefix, re.I):
                        code_map.setdefault(num2.upper(), s)

                    # Index ranges like "1.1-1.4", "2.1-2.5", "3.1-3.7", "11.1-11.5", "17.1-17.6"
                    for m in re.finditer(r"(\d+)\.(\d+)\s*-\s*(?:\1\.)?(\d+)", prefix):
                        maj = m.group(1)
                        lo, hi = int(m.group(2)), int(m.group(3))
                        for n in range(lo, hi + 1):
                            code_map.setdefault(f"{maj}.{n}".upper(), s)

                    # Index letter codes like 3A, 3B, 4A, 4B, 8A, 8B, 8C, 9A, 9B, 10A, 12A, 15A
                    m_let = re.match(r"^([0-9]+[A-Za-z])\b", prefix)
                    if m_let:
                        code_map.setdefault(m_let.group(1).upper(), s)

                    # Index Practical codes U3.1, U6.2
                    m_u = re.match(r"^(U\d+\.\d+)", prefix)
                    if m_u:
                        code_map[m_u.group(1).upper()] = s
                        code_map[m_u.group(1)[1:].upper()] = s

                    # Index Spec ranges and single spec numbers (e.g. Spec 1-3, Spec 27, 29, 32)
                    m_spec = re.search(r"Spec\s+(\d+)\s*-\s*(\d+)", prefix, re.I)
                    if m_spec:
                        s_lo, s_hi = int(m_spec.group(1)), int(m_spec.group(2))
                        for sn in range(s_lo, s_hi + 1):
                            code_map.setdefault(f"SPEC {sn}", s)
                            code_map.setdefault(f"SPEC{sn}", s)
                    for sn in re.findall(r"Spec\s+(\d+)", prefix, re.I):
                        code_map.setdefault(f"SPEC {sn}", s)
                        code_map.setdefault(f"SPEC{sn}", s)

            self.unit_subtopics[ucode] = subs
            self.unit_code_to_subtopic[ucode] = code_map
            self.unit_subtopic_to_topic[ucode] = topic_map

    def normalize_unit_code(self, raw_unit_code: str, paper_id: str = "") -> str:
        candidates = [raw_unit_code, paper_id]
        aliases = (
            MATH_UNIT_ALIASES
            if self.subject == "mathematics"
            else PHYSICS_UNIT_ALIASES
            if self.subject == "physics"
            else CHEMISTRY_UNIT_ALIASES
        )
        for candidate in candidates:
            if not candidate:
                continue
            cleaned = str(candidate).strip().upper()
            cleaned = re.sub(r"(_UNUSED|_OLD)$", "", cleaned)
            if cleaned in self.syllabus:
                return cleaned
            if cleaned in aliases and aliases[cleaned] in self.syllabus:
                return aliases[cleaned]
            m_code = re.match(r"^(W[CPE][HMAEST]\d\d)", cleaned)
            if m_code and m_code.group(1) in self.syllabus:
                return m_code.group(1)
            for token in re.split(r"[/_]", cleaned):
                token = token.strip()
                if token in self.syllabus:
                    return token
                if token in aliases and aliases[token] in self.syllabus:
                    return aliases[token]
                m_sub = re.match(r"^(W[CPE][HMAEST]\d\d)", token)
                if m_sub and m_sub.group(1) in self.syllabus:
                    return m_sub.group(1)
                m_alias = re.match(r"^([PMSU][1-6])\b", token)
                if m_alias and m_alias.group(1) in aliases and aliases[m_alias.group(1)] in self.syllabus:
                    return aliases[m_alias.group(1)]
        return next(iter(self.syllabus.keys()))

    def get_allowed_synoptic_units(self, unit_code: str) -> List[str]:
        subject_map = SYNOPTIC_ALLOWED_UNITS.get(self.subject, {})
        return subject_map.get(unit_code, [unit_code])

    def format_unit_taxonomy_prompt(self, unit_code: str) -> str:
        udata = self.syllabus[unit_code]
        uname = udata.get("unit") or udata.get("unit_name") or unit_code
        utitle = udata.get("title") or ""
        lines = [
            f"PRIMARY UNIT: {uname} — {utitle} ({unit_code})",
            "ALLOWED PRIMARY SUBTOPICS (mainSubtopic MUST come from this unit):",
        ]
        for topic_name, subs in udata["topics"].items():
            lines.append(f"  {topic_name}:")
            for s in subs:
                code = s.split(":")[0].strip()
                lines.append(f'    - Code: "{code}" => Subtopic: {s}')

        synoptic_units = [u for u in self.get_allowed_synoptic_units(unit_code) if u != unit_code]
        if synoptic_units:
            lines.append("\nALLOWED SYNOPTIC UNITS (for optional relatedSubtopics ONLY):")
            for s_ucode in synoptic_units:
                s_data = self.syllabus.get(s_ucode)
                if not s_data:
                    continue
                s_name = s_data.get("unit") or s_ucode
                lines.append(f"  {s_name} ({s_ucode}):")
                for s_topic, s_subs in s_data["topics"].items():
                    sub_codes = [sub.split(":")[0].strip() for sub in s_subs]
                    lines.append(f'    * {s_topic}: {", ".join(sub_codes)}')
        return "\n".join(lines)

    def _match_single(self, unit_code: str, raw: Any) -> Optional[str]:
        if not raw or not isinstance(raw, str):
            return None
        c_clean = raw.strip()
        c_upper = c_clean.upper()
        code_map = self.unit_code_to_subtopic.get(unit_code, {})
        allowed_subs = self.unit_subtopics.get(unit_code, [])

        if c_upper in code_map:
            return code_map[c_upper]

        if ":" in c_clean:
            prefix = c_clean.split(":")[0].strip().upper()
            if prefix in code_map:
                return code_map[prefix]

        # 1. 3-part dotted numbers (e.g. 1.3.1, 2.3.5, 4.3.1)
        m_num3 = re.search(r"\b\d+\.\d+\.\d+[a-z]?\b", c_clean, re.I)
        if m_num3 and m_num3.group(0).upper() in code_map:
            return code_map[m_num3.group(0).upper()]

        # 2. Unit prefix + dotted number e.g. "P1 5.2a", "M1 3.1a"
        m_unit_num = re.search(
            r"\b(?:P[1-4]|M[1-3]|S[1-3]|WPH\d\d|WCH\d\d)\s+\d+\.\d+[a-z]?\b",
            c_clean,
            re.I,
        )
        if m_unit_num and m_unit_num.group(0).upper() in code_map:
            return code_map[m_unit_num.group(0).upper()]

        # 3. 2-part dotted numbers (e.g. 1.5, 5.2a, 7.1b, 3.3, 6.5)
        m_num2 = re.search(r"\b\d+\.\d+[a-z]?\b", c_clean, re.I)
        if m_num2 and m_num2.group(0).upper() in code_map:
            return code_map[m_num2.group(0).upper()]

        # 4. Letter code inside string e.g. "3A", "8C", "15D"
        m_let = re.search(r"\b(\d+[A-Za-z])\b", c_clean)
        if m_let and m_let.group(1).upper() in code_map:
            return code_map[m_let.group(1).upper()]

        # 5. Spec numbers e.g. "Spec 35"
        m_spec = re.search(r"\bSpec(?:ification)?\s*(\d+)\b", c_clean, re.I)
        if m_spec and f"SPEC {m_spec.group(1)}" in code_map:
            return code_map[f"SPEC {m_spec.group(1)}"]

        # 6. Substring / keyword match
        c_low = c_clean.lower()
        for s in allowed_subs:
            if c_low in s.lower() or s.lower() in c_low:
                return s

        return None

    def _match_single_in_units(self, unit_codes: List[str], raw: Any) -> Optional[str]:
        for u in unit_codes:
            m = self._match_single(u, raw)
            if m:
                return m
        return None

    def resolve_classification(
        self, unit_code: str, cand: Any
    ) -> Optional[Tuple[str, str, List[str], List[str]]]:
        """
        Resolves candidate classification (dict, list, str) into:
        (mainTopic, mainSubtopic, relatedSubtopics, topics).

        Rules:
        - mainSubtopic MUST belong strictly to the paper's own unit_code.
        - mainTopic is automatically derived via self.parent_fn(main_subtopic) so mismatch is impossible.
        - relatedSubtopics must be valid canonical subtopics from allowed synoptic units (max 3),
          excluding mainSubtopic.
        - topics is the deduplicated list of parent topics tested, with mainTopic always at index 0.
        """
        main_raw = None
        rel_raw = []

        if isinstance(cand, dict):
            main_raw = cand.get("mainSubtopic") or cand.get("main_subtopic") or cand.get("subtopic")
            rel_raw = cand.get("relatedSubtopics") or cand.get("related_subtopics") or cand.get("subtopics") or []
            if main_raw is None and isinstance(cand.get("subtopics"), list) and cand["subtopics"]:
                main_raw = cand["subtopics"][0]
                rel_raw = cand["subtopics"][1:]
        elif isinstance(cand, list):
            main_raw = cand[0] if cand else None
            rel_raw = cand[1:] if len(cand) > 1 else []
        elif isinstance(cand, str):
            main_raw = cand
            rel_raw = []

        main_sub = self._match_single(unit_code, main_raw)
        if not main_sub:
            return None

        # Derive mainTopic automatically
        main_top = self.parent_fn(main_sub)

        # Match relatedSubtopics strictly across allowed synoptic units
        allowed_units = self.get_allowed_synoptic_units(unit_code)
        related_subs: List[str] = []

        if not isinstance(rel_raw, list):
            rel_raw = [rel_raw]

        for r in rel_raw:
            r_match = self._match_single_in_units(allowed_units, r)
            if r_match and r_match != main_sub and r_match not in related_subs:
                related_subs.append(r_match)

        # Enforce max 3 relatedSubtopics
        related_subs = related_subs[:3]

        # Derive topics list with mainTopic always at index 0
        topics: List[str] = [main_top]
        for r in related_subs:
            p_top = self.parent_fn(r)
            if p_top and p_top not in topics:
                topics.append(p_top)

        return main_top, main_sub, related_subs, topics

    def resolve(
        self, unit_code: str, raw_candidates: List[str]
    ) -> Optional[Tuple[str, str, List[str]]]:
        """
        Backward-compatible mapping: maps raw candidates to
        (canonical_topic, primary_subtopic, canonical_subtopics_list).
        """
        res = self.resolve_classification(unit_code, raw_candidates)
        if not res:
            return None
        m_top, m_sub, rel_subs, _ = res
        all_subs = [m_sub] + [r for r in rel_subs if r != m_sub]
        return m_top, m_sub, all_subs


class GeminiClassifierPool:
    """
    Thread-safe multi-key, multi-model Gemini client pool with instant failover.
    """

    MODELS = [
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
    ]

    def __init__(self):
        self.api_keys = load_gemini_api_keys()
        if not self.api_keys:
            raise RuntimeError("No GEMINI_API_KEY* found in .env or environment!")

        self.clients: List[genai.Client] = [
            genai.Client(
                api_key=k,
                http_options=types.HttpOptions(
                    timeout=25000,
                    retry_options=types.HttpRetryOptions(attempts=1),
                ),
            )
            for k in self.api_keys
        ]
        self._call_counter = 0
        self._lock = threading.Lock()

    def generate_json(
        self, prompt: str, preferred_key_idx: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        with self._lock:
            call_id = self._call_counter
            self._call_counter += 1

        num_keys = len(self.clients)
        start_key = (
            preferred_key_idx
            if preferred_key_idx is not None
            else (call_id % num_keys)
        )

        for cycle in range(3):
            for m_idx, model in enumerate(self.MODELS):
                for k_offset in range(num_keys):
                    k_idx = (start_key + k_offset) % num_keys
                    client = self.clients[k_idx]
                    try:
                        cfg_kwargs: Dict[str, Any] = {
                            "response_mime_type": "application/json",
                            "temperature": 0.0,
                        }
                        if "gemini-3-flash" in model or "gemini-2.5-flash" in model:
                            cfg_kwargs["thinking_config"] = types.ThinkingConfig(
                                thinking_budget=0
                            )
                        resp = client.models.generate_content(
                            model=model,
                            contents=prompt,
                            config=types.GenerateContentConfig(**cfg_kwargs),
                        )
                        text = (resp.text or "").strip()
                        if text.startswith("```json"):
                            text = text[7:]
                        if text.startswith("```"):
                            text = text[3:]
                        if text.endswith("```"):
                            text = text[:-3]
                        parsed = json.loads(text.strip())
                        if isinstance(parsed, dict):
                            return parsed
                    except Exception as e:
                        err = str(e)
                        if "429" in err or "RESOURCE_EXHAUSTED" in err:
                            time.sleep(0.3)
                            continue
                        elif "503" in err or "UNAVAILABLE" in err or "404" in err:
                            continue
                        else:
                            time.sleep(0.2)
                            continue
            time.sleep(1.5 * (cycle + 1))

        return None


def classify_unit_batch(
    batch_items: List[Tuple[int, Dict[str, Any], str]],
    unit_code: str,
    subject: str,
    resolver: UnitTaxonomyResolver,
    pool: GeminiClassifierPool,
    worker_id: int = 0,
) -> Dict[str, Tuple[str, str, List[str], List[str]]]:
    """
    Classifies a batch of questions belonging to the same `unit_code`.
    Returns a dict mapping `question_id -> (mainTopic, mainSubtopic, relatedSubtopics, topics)`.
    """
    taxonomy_block = resolver.format_unit_taxonomy_prompt(unit_code)
    q_lines: List[str] = []
    key_to_qid: Dict[str, str] = {}
    prefix_to_qid: Dict[str, str] = {}

    for local_idx, (_, q, rich_text) in enumerate(batch_items):
        qnum = str(q.get("questionNumber") or q.get("question_number") or "").strip()
        marks = q.get("marks") or 1
        qtype = q.get("questionType") or q.get("question_type") or "theory"
        item_key = f"I{local_idx:02d}_Q{qnum}"
        key_to_qid[item_key] = q["id"]
        prefix_to_qid[f"I{local_idx:02d}"] = q["id"]
        q_lines.append(f'"{item_key}" ({marks}m, {qtype}): {rich_text}')

    questions_block = "\n".join(q_lines)
    sample_key_0 = f"I00_Q{batch_items[0][1].get('questionNumber', '1')}"
    sample_key_1 = (
        f"I01_Q{batch_items[1][1].get('questionNumber', '2')}"
        if len(batch_items) > 1
        else sample_key_0
    )
    sample_code_0 = resolver.unit_subtopics[unit_code][0].split(':')[0].strip()
    sample_code_1 = resolver.unit_subtopics[unit_code][-1].split(':')[0].strip()

    allowed_syn_units = [u for u in resolver.get_allowed_synoptic_units(unit_code) if u != unit_code]
    if allowed_syn_units:
        synoptic_scope_text = f"relatedSubtopics may come from the paper's own unit ({unit_code}) or allowed synoptic units ({', '.join(allowed_syn_units)})."
    else:
        synoptic_scope_text = f"all relatedSubtopics MUST come strictly from the paper's own unit ({unit_code})."

    if subject == "physics":
        subject_advice = "3. For practical papers (WPH13, WPH16), carefully distinguish between experimental planning/apparatus selection, uncertainty and error analysis, graph linearisation (log/power law), and specific core practical investigations."
    elif subject == "mathematics":
        subject_advice = "3. For Pure Mathematics (P1–P4), Mechanics (M1), and Statistics (S1), ensure questions testing multiple techniques identify the primary objective as mainSubtopic and supplementary techniques in relatedSubtopics."
    else:
        subject_advice = "3. For practical papers (e.g. WCH13, WCH16), carefully distinguish between quantitative/volumetric analysis, thermochemistry/kinetics, qualitative inorganic tests, qualitative organic tests, organic preparation/techniques, spectroscopies, experimental errors/uncertainties, and graph analysis/planning."

    prompt = f"""You are a senior Pearson Edexcel International Advanced Level (IAL) {subject.capitalize()} examiner.
Classify each examination question below into its primary mainSubtopic and any secondary relatedSubtopics strictly from the official specification.

{taxonomy_block}

STRICT UNIT-BOUNDARY AND CLASSIFICATION RULES:
1. "mainSubtopic" MUST come from the PRIMARY UNIT ({unit_code}). It represents the primary theme and core concept tested by the question (majority of marks).
2. "relatedSubtopics" is an optional array of 0 to 3 secondary subtopics tested in other sub-parts of the question.
   - It MUST NOT include "mainSubtopic" (no duplicates).
   - Synoptic rule: {synoptic_scope_text}
   - If the question tests only one concept, use [] for relatedSubtopics.
{subject_advice}
4. Return ONLY a valid JSON object mapping each exact item key to:
{{
  "{sample_key_0}": {{
    "mainSubtopic": "{sample_code_0}",
    "relatedSubtopics": []
  }},
  "{sample_key_1}": {{
    "mainSubtopic": "{sample_code_1}",
    "relatedSubtopics": ["{sample_code_0}"]
  }}
}}

QUESTIONS TO CLASSIFY ({len(batch_items)} items):
{questions_block}
"""

    raw_res = pool.generate_json(prompt, preferred_key_idx=worker_id % len(pool.clients))
    results: Dict[str, Tuple[str, str, List[str], List[str]]] = {}
    if not raw_res:
        return results

    for raw_k, cand in raw_res.items():
        rk = str(raw_k).strip()
        qid = key_to_qid.get(rk)
        if not qid:
            m_pref = re.match(r"^(I\d{2,3})\b", rk)
            if m_pref:
                qid = prefix_to_qid.get(m_pref.group(1))
        if not qid:
            continue

        resolved = resolver.resolve_classification(unit_code, cand)
        if resolved:
            results[qid] = resolved

    return results


def process_subject(
    subject: str,
    pool: GeminiClassifierPool,
    batch_size: int = 70,
    max_workers: int = 2,
    force_reclassify: bool = False,
    paper_filter: Optional[str] = None,
) -> Dict[str, Any]:
    if subject == "chemistry":
        dataset_path = ROOT_DIR / "dataset.json"
        public_path = ROOT_DIR / "frontend" / "public" / "dataset.json"
        cache_path = ROOT_DIR / "pipeline" / "classification_cache_chemistry.json"
        pairs = {p["paper_id"]: p for p in scan_papers_directory(str(ROOT_DIR / "papers"))}
    elif subject == "physics":
        dataset_path = ROOT_DIR / "dataset_physics.json"
        public_path = ROOT_DIR / "frontend" / "public" / "dataset_physics.json"
        cache_path = ROOT_DIR / "pipeline" / "classification_cache_physics.json"
        pairs = {
            p["paper_id"]: p
            for p in scan_physics_papers_directory(str(ROOT_DIR / "papers_physics"))
        }
    elif subject == "mathematics":
        dataset_path = ROOT_DIR / "dataset_math.json"
        public_path = ROOT_DIR / "frontend" / "public" / "dataset_math.json"
        cache_path = ROOT_DIR / "pipeline" / "classification_cache_mathematics.json"
        pairs = {
            p["paper_id"]: p
            for p in scan_math_papers_directory(str(ROOT_DIR / "papers_math"))
        }
    else:
        raise ValueError(f"Unknown subject: {subject}")

    print(f"\n{'=' * 78}", flush=True)
    print(
        f"  EDEXCEL IAL {subject.upper()} TOPIC RE-CLASSIFICATION ({dataset_path.name})",
        flush=True,
    )
    print(f"{'=' * 78}", flush=True)

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset: List[Dict[str, Any]] = json.load(f)

    cache: Dict[str, Dict[str, Any]] = {}
    if not force_reclassify and cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cache = json.load(f)
            print(
                f"[CACHE] Loaded {len(cache):,} cached classifications from {cache_path.name}",
                flush=True,
            )
        except Exception:
            cache = {}

    resolver = UnitTaxonomyResolver(subject)
    pdf_cache = EdexcelPDFTextCache(pairs)

    # Apply cached classifications first and collect pending items by unit_code
    pending_by_unit: Dict[str, List[Tuple[int, Dict[str, Any], str]]] = {}
    cached_applied = 0

    t_extract = time.time()
    for idx, q in enumerate(dataset):
        pid = q.get("paperId") or q.get("paper_id") or ""
        if paper_filter and paper_filter.lower() not in pid.lower():
            continue

        ucode = resolver.normalize_unit_code(q.get("unitCode", ""), pid)
        qid = q["id"]

        if not force_reclassify and qid in cache:
            c_entry = cache[qid]
            if c_entry.get("unitCode") == ucode:
                c_main = c_entry.get("mainSubtopic") or c_entry.get("subtopic")
                c_rel = c_entry.get("relatedSubtopics") or (c_entry.get("subtopics")[1:] if len(c_entry.get("subtopics", [])) > 1 else [])
                if c_main in resolver.unit_subtopics.get(ucode, []):
                    resolved = resolver.resolve_classification(ucode, {"mainSubtopic": c_main, "relatedSubtopics": c_rel})
                    if resolved:
                        m_top, m_sub, rel_subs, topics = resolved
                        all_subs = [m_sub] + [r for r in rel_subs if r != m_sub]
                        q["mainTopic"] = m_top
                        q["mainSubtopic"] = m_sub
                        q["relatedSubtopics"] = rel_subs
                        q["topic"] = m_top
                        q["subtopic"] = m_sub
                        q["subtopics"] = all_subs
                        q["topics"] = topics
                        cached_applied += 1
                        continue

        rich_txt = pdf_cache.build_rich_context_for_question(q)
        pending_by_unit.setdefault(ucode, []).append((idx, q, rich_txt))

    total_pending = sum(len(v) for v in pending_by_unit.values())
    print(
        f"[INDEXED] Built rich QP+MS context for {total_pending:,} pending questions in {time.time() - t_extract:.1f}s "
        f"(cached applied: {cached_applied:,})",
        flush=True,
    )

    # Slice pending items into unit-homogeneous batches
    all_batches: List[Tuple[str, List[Tuple[int, Dict[str, Any], str]]]] = []
    for ucode in sorted(pending_by_unit.keys()):
        items = pending_by_unit[ucode]
        for i in range(0, len(items), batch_size):
            all_batches.append((ucode, items[i : i + batch_size]))

    total_batches = len(all_batches)
    classified_count = 0
    failed_items: List[Tuple[str, Tuple[int, Dict[str, Any], str]]] = []
    save_lock = threading.Lock()

    def save_checkpoint(sync_datasets: bool = False):
        with save_lock:
            with open(cache_path, "w", encoding="utf-8") as cf:
                json.dump(cache, cf, indent=2, ensure_ascii=False)
            if sync_datasets:
                with open(dataset_path, "w", encoding="utf-8") as df:
                    json.dump(dataset, df, indent=2, ensure_ascii=False)
                if public_path.parent.exists():
                    shutil.copy2(dataset_path, public_path)

    if total_batches > 0:
        print(
            f"[DISPATCH] Classifying {total_pending:,} questions across {total_batches} unit-scoped batches "
            f"(batch_size={batch_size}, workers={max_workers})...",
            flush=True,
        )

        completed_batches = 0
        t_start = time.time()

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_batch = {
                executor.submit(
                    classify_unit_batch,
                    b_items,
                    ucode,
                    subject,
                    resolver,
                    pool,
                    b_idx % max_workers,
                ): (b_idx, ucode, b_items)
                for b_idx, (ucode, b_items) in enumerate(all_batches)
            }

            for fut in as_completed(future_to_batch):
                b_idx, ucode, b_items = future_to_batch[fut]
                completed_batches += 1
                try:
                    batch_res = fut.result()
                except Exception as exc:
                    print(
                        f"  [ERROR] Batch {b_idx + 1}/{total_batches} ({ucode}) raised: {exc}",
                        flush=True,
                    )
                    batch_res = {}

                with save_lock:
                    for item_tuple in b_items:
                        q_idx, q_obj, _ = item_tuple
                        qid = q_obj["id"]
                        if qid in batch_res:
                            m_top, m_sub, rel_subs, topics = batch_res[qid]
                            all_subs = [m_sub] + [r for r in rel_subs if r != m_sub]
                            dataset[q_idx]["mainTopic"] = m_top
                            dataset[q_idx]["mainSubtopic"] = m_sub
                            dataset[q_idx]["relatedSubtopics"] = rel_subs
                            dataset[q_idx]["topic"] = m_top
                            dataset[q_idx]["subtopic"] = m_sub
                            dataset[q_idx]["subtopics"] = all_subs
                            dataset[q_idx]["topics"] = topics
                            cache[qid] = {
                                "mainTopic": m_top,
                                "mainSubtopic": m_sub,
                                "relatedSubtopics": rel_subs,
                                "topic": m_top,
                                "subtopic": m_sub,
                                "subtopics": all_subs,
                                "topics": topics,
                                "unitCode": ucode,
                            }
                            classified_count += 1
                        else:
                            failed_items.append((ucode, item_tuple))

                elapsed = time.time() - t_start
                rate = classified_count / max(0.1, elapsed)
                print(
                    f"  [{completed_batches}/{total_batches}] {ucode}: matched {len(batch_res)}/{len(b_items)} Qs | "
                    f"Total classified: {classified_count:,}/{total_pending:,} ({rate:.1f} Qs/s)",
                    flush=True,
                )

                if completed_batches % 10 == 0:
                    save_checkpoint(sync_datasets=True)

        # Retry any missed individual items in smaller cleanup batches of 25
        if failed_items:
            print(
                f"[RETRY] Retrying {len(failed_items)} missed questions in smaller batches...",
                flush=True,
            )
            retry_by_unit: Dict[str, List[Tuple[int, Dict[str, Any], str]]] = {}
            for ucode, it in failed_items:
                retry_by_unit.setdefault(ucode, []).append(it)

            for ucode, r_items in retry_by_unit.items():
                for i in range(0, len(r_items), 25):
                    sub_batch = r_items[i : i + 25]
                    res = classify_unit_batch(
                        sub_batch, ucode, subject, resolver, pool, 0
                    )
                    for q_idx, q_obj, _ in sub_batch:
                        qid = q_obj["id"]
                        if qid in res:
                            m_top, m_sub, rel_subs, topics = res[qid]
                            all_subs = [m_sub] + [r for r in rel_subs if r != m_sub]
                            dataset[q_idx]["mainTopic"] = m_top
                            dataset[q_idx]["mainSubtopic"] = m_sub
                            dataset[q_idx]["relatedSubtopics"] = rel_subs
                            dataset[q_idx]["topic"] = m_top
                            dataset[q_idx]["subtopic"] = m_sub
                            dataset[q_idx]["subtopics"] = all_subs
                            dataset[q_idx]["topics"] = topics
                            cache[qid] = {
                                "mainTopic": m_top,
                                "mainSubtopic": m_sub,
                                "relatedSubtopics": rel_subs,
                                "topic": m_top,
                                "subtopic": m_sub,
                                "subtopics": all_subs,
                                "topics": topics,
                                "unitCode": ucode,
                            }
                            classified_count += 1

    # Final validation pass: guarantee 100% canonical taxonomy compliance
    invalid_fixed = 0
    for q in dataset:
        pid = q.get("paperId") or q.get("paper_id") or ""
        ucode = resolver.normalize_unit_code(q.get("unitCode", ""), pid)
        c_main = q.get("mainSubtopic") or q.get("subtopic")
        c_rel = q.get("relatedSubtopics") or (q.get("subtopics")[1:] if len(q.get("subtopics", [])) > 1 else [])

        resolved = None
        if c_main in resolver.unit_subtopics.get(ucode, []):
            resolved = resolver.resolve_classification(ucode, {"mainSubtopic": c_main, "relatedSubtopics": c_rel})

        if resolved:
            m_top, m_sub, rel_subs, topics = resolved
            all_subs = [m_sub] + [r for r in rel_subs if r != m_sub]
            q["mainTopic"] = m_top
            q["mainSubtopic"] = m_sub
            q["relatedSubtopics"] = rel_subs
            q["topic"] = m_top
            q["subtopic"] = m_sub
            q["subtopics"] = all_subs
            q["topics"] = topics
        else:
            default_sub = resolver.unit_subtopics[ucode][0]
            default_top = resolver.unit_subtopic_to_topic[ucode][default_sub]
            q["mainTopic"] = default_top
            q["mainSubtopic"] = default_sub
            q["relatedSubtopics"] = []
            q["topic"] = default_top
            q["subtopic"] = default_sub
            q["subtopics"] = [default_sub]
            q["topics"] = [default_top]
            invalid_fixed += 1

        if q["id"] in cache:
            cache[q["id"]]["topics"] = q["topics"]

    save_checkpoint(sync_datasets=True)

    # Print distribution summary per unit
    first_sub_count = 0
    for q in dataset:
        pid = q.get("paperId") or q.get("paper_id") or ""
        ucode = resolver.normalize_unit_code(q.get("unitCode", ""), pid)
        if q.get("subtopic") == resolver.unit_subtopics[ucode][0]:
            first_sub_count += 1

    print(
        f"[DONE] {subject.upper()}: {len(dataset):,} total questions saved & synced to {public_path.relative_to(ROOT_DIR)}.",
        flush=True,
    )
    print(
        f"       1st-subtopic share: {first_sub_count}/{len(dataset)} ({first_sub_count / max(1, len(dataset)) * 100:.1f}%) | "
        f"Fallback repairs: {invalid_fixed}",
        flush=True,
    )

    return {
        "subject": subject,
        "total": len(dataset),
        "classified_new": classified_count,
        "cached_applied": cached_applied,
        "first_subtopic_pct": round(first_sub_count / max(1, len(dataset)) * 100, 1),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Re-classify Edexcel IAL questions using Gemini and official unit syllabuses."
    )
    parser.add_argument(
        "--subject",
        choices=["chemistry", "physics", "mathematics", "all"],
        default="all",
        help="Subject dataset(s) to classify (default: all)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=65,
        help="Number of questions per Gemini request (default: 65)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=2,
        help="Concurrent worker threads (default: 2)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore existing classification_cache_<subject>.json and re-classify all questions",
    )
    parser.add_argument(
        "--paper",
        type=str,
        default=None,
        help="Optional paper_id substring filter for testing on a single paper",
    )
    args = parser.parse_args()

    pool = GeminiClassifierPool()
    print(
        f"[INIT] GeminiClassifierPool ready with {len(pool.clients)} API key(s) and {len(pool.MODELS)} cascade models.",
        flush=True,
    )

    subjects = (
        ["chemistry", "physics", "mathematics"]
        if args.subject == "all"
        else [args.subject]
    )

    summaries = []
    for subj in subjects:
        s = process_subject(
            subject=subj,
            pool=pool,
            batch_size=args.batch_size,
            max_workers=args.workers,
            force_reclassify=args.force,
            paper_filter=args.paper,
        )
        summaries.append(s)

    print(f"\n{'=' * 78}", flush=True)
    print("  ALL REQUESTED SUBJECTS COMPLETED", flush=True)
    for s in summaries:
        print(
            f"  - {s['subject'].capitalize():12s}: {s['total']:,} Qs "
            f"(newly classified: {s['classified_new']:,}, cached: {s['cached_applied']:,}, "
            f"1st-subtopic share: {s['first_subtopic_pct']}%)",
            flush=True,
        )
    print(f"{'=' * 78}", flush=True)


if __name__ == "__main__":
    main()
