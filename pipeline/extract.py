"""
Master Extraction Pipeline CLI:
- Automated batch ingestion across papers/ and sample_papers/
- Checkpointing & incremental caching with pipeline_manifest.json
- Converts pages to 150 DPI for Gemini detection & 300 DPI for student crops
- Performs cross-page stem tracking and stitching
- Crops matching mark scheme table rows / MCQ answer blocks
- Emits structured dataset.json with rich metadata (year, session, series, unit, paper_code)
- Multi-model fallback cascade pool with safe 1.5s pacing and flush=True
"""

import os
import re
import sys
import json
import time
import argparse
from typing import Dict, Any, List, Optional
from PIL import Image
import pymupdf

from pipeline.pdf_processor import PDFProcessor, is_subsequent_marker
from pipeline.gemini_extractor import GeminiExtractor
from pipeline.ms_matcher import MSMatcher
from pipeline.syllabus import (
    get_unit_from_code,
    get_parent_topic_for_subtopic,
    get_unit_for_subtopic
)
from pipeline.batch_scanner import scan_papers_directory, compute_file_hash
from pipeline.manifest import ManifestManager

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def sanitize_filename(name: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_")
    return clean.lower()

ROMAN_NUMERALS = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"}
ROMAN_NUMS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]

UNIT_OR_TIME_FILTER = re.compile(
    r"^\s*(?:question\s+|q\.?\s*)?\d{1,3}[:.]?\s+(?:cm|dm|mm|m|g|mg|kg|mol|°|%|k?j|k?pa|v|s|sec|seconds?|min|minutes?|hours?|h|days?|weeks?|months?|years?|drops?|times?|marks?)[0-9\-–−/]*\b",
    re.I
)

def get_alpha_letter(text: str) -> Optional[str]:
    """
    Extracts the true alphabetical subpart letter from a question label or subpart string,
    ignoring Roman numerals like (i), (ii), (iv), (v), (x).
    Supports optional asterisks e.g. *(a), * (a), (a)*.
    """
    for m in re.finditer(r"\*?\s*\(([a-z]+)\)\s*\*?", text, re.I):
        cand = m.group(1).lower()
        if cand not in ROMAN_NUMS:
            return cand
    return None

def resolve_hierarchical_id(
    raw_qnum: str,
    raw_parent: Optional[str],
    raw_subpart: Optional[str],
    active_parent: Optional[str],
    active_sub_letter: Optional[str] = None
) -> tuple[str, str, str]:
    """
    Resolves (full_question_number, parent_question, sub_part) ensuring universal hierarchical indexing.
    Guarantees that compound MCQs (e.g. 14(a), 14(b)) and structured sub-questions
    (e.g. 20(a), 20(b)(iv)) are never collapsed into top-level parent IDs.
    """
    raw_qnum = (raw_qnum or "").strip()
    raw_parent = (raw_parent or "").strip()
    raw_subpart = (raw_subpart or "").strip()
    active_parent = (active_parent or "").strip()

    # 1. Clean leading 'Q', 'Question', or asterisks '*' (for extended response questions e.g. *14, *(b), *23(a))
    clean_q = re.sub(r"^(?:Question|Q|\*+)\s*", "", raw_qnum, flags=re.IGNORECASE).strip()
    clean_q = re.sub(r"[\*]+", "", clean_q).strip()
    raw_parent = re.sub(r"^(?:Question|Q|\*+)\s*", "", raw_parent, flags=re.IGNORECASE).strip()
    raw_parent = re.sub(r"[\*]+", "", raw_parent).strip()
    raw_subpart = re.sub(r"[\*]+", "", raw_subpart).strip()
    active_parent = re.sub(r"[\*]+", "", active_parent).strip()

    # 2. Check if clean_q already has parent + subparts e.g. "20(b)(iv)" or "14(a)"
    m_full = re.match(r"^(\d+)\s*(\([a-z0-9]+\)(?:\s*\([a-z0-9]+\))*)$", clean_q, re.IGNORECASE)
    if m_full:
        p_num = m_full.group(1)
        sub = re.sub(r"\s+", "", m_full.group(2))
        m_parts = re.findall(r"\(([a-z0-9]+)\)", sub.lower())
        if len(m_parts) == 1 and m_parts[0] in ROMAN_NUMERALS and active_sub_letter:
            if not (m_parts[0] == "i" and active_sub_letter in ("h", "i")):
                sub = f"({active_sub_letter})({m_parts[0]})"
        elif len(m_parts) >= 2 and m_parts[0] in ROMAN_NUMERALS and active_sub_letter:
            sub = f"({active_sub_letter})({m_parts[1]})"
        return f"{p_num}{sub}", p_num, sub

    m_letter = re.match(r"^(\d+)\s*([a-z])$", clean_q, re.IGNORECASE)
    if m_letter:
        p_num = m_letter.group(1)
        sub = f"({m_letter.group(2).lower()})"
        return f"{p_num}{sub}", p_num, sub

    # 3. If clean_q starts with parenthesis e.g. "(a)" or "(b)(i)"
    m_sub_only = re.match(r"^(\([a-z0-9]+\)(?:\s*\([a-z0-9]+\))*)$", clean_q, re.IGNORECASE)
    if m_sub_only:
        sub = re.sub(r"\s+", "", m_sub_only.group(1))
        p_num = raw_parent or active_parent or "1"
        m_parts = re.findall(r"\(([a-z0-9]+)\)", sub.lower())
        if len(m_parts) == 1 and m_parts[0] in ROMAN_NUMERALS and active_sub_letter:
            if not (m_parts[0] == "i" and active_sub_letter in ("h", "i")):
                sub = f"({active_sub_letter})({m_parts[0]})"
        elif len(m_parts) >= 2 and m_parts[0] in ROMAN_NUMERALS and active_sub_letter:
            sub = f"({active_sub_letter})({m_parts[1]})"
        return f"{p_num}{sub}", p_num, sub

    # 4. If clean_q is an integer e.g. "20" or "14"
    if clean_q.isdigit():
        p_num = clean_q
        if raw_subpart:
            sub_clean = raw_subpart.strip()
            sub_parts = re.findall(r"[a-z0-9]+", sub_clean.lower())
            if sub_parts:
                if len(sub_parts) == 1 and sub_parts[0] in ROMAN_NUMERALS and active_sub_letter:
                    if not (sub_parts[0] == "i" and active_sub_letter in ("h", "i")):
                        formatted_sub = f"({active_sub_letter})({sub_parts[0]})"
                elif len(sub_parts) >= 2 and sub_parts[0] in ROMAN_NUMERALS and active_sub_letter:
                    formatted_sub = f"({active_sub_letter})({sub_parts[1]})"
                else:
                    formatted_sub = "".join(f"({sp})" for sp in sub_parts)
                return f"{p_num}{formatted_sub}", p_num, formatted_sub
        return p_num, p_num, ""

    # 5. Fallback
    p_num = raw_parent or active_parent or clean_q
    return clean_q, p_num, raw_subpart

def score_question_content(text: str, marks: int, box: List[float], qnum: Optional[str] = None) -> float:
    """
    Scores the prompt quality of a question candidate.
    Real question prompts contain substantive text, command keywords (e.g. explain, calculate),
    and mark indicators, while ghost duplicates consist of blank dotted lines, empty boxes, or grids.
    """
    clean_text = re.sub(r"[\.\s\_\-\t\n\r\u2009]+", " ", text).strip()
    words = [w for w in re.findall(r"[A-Za-z]{2,}", clean_text)]
    score = float(len(words) * 2)

    # Command keywords typical of actual Edexcel question prompts
    keywords = {
        "calculate", "explain", "describe", "state", "determine", "identify",
        "give", "write", "suggest", "deduce", "show", "draw", "plot",
        "outline", "complete", "predict", "name", "compare", "justify", "comment"
    }
    for w in words:
        if w.lower() in keywords:
            score += 25.0

    # Marks in text like (1), (2), (3)
    if re.search(r"\(\d+\)", text):
        score += 20.0

    if marks > 0:
        score += marks * 5.0

    # Reward matching subpart marker if qnum provided
    if qnum:
        m_parts = re.findall(r"\(([a-z0-9]+)\)", qnum.lower())
        if m_parts:
            target_marker = m_parts[-1]
            if re.search(rf"\({re.escape(target_marker)}\)", text, re.I):
                score += 30.0

    # Heavy penalty for purely empty/dotted content or 0 words
    if len(words) == 0:
        score -= 100.0
    elif len(words) < 3:
        score -= 50.0

    return score

def detect_page_top_level_questions(page_doc: pymupdf.Page) -> List[tuple[str, float]]:
    """
    Scans page text blocks for explicit top-level question headers (e.g. 'Question 19', '19  This question...', '20\t (a)', '*21').
    Returns deduplicated, sorted list of (parent_q_str, y0_pts).
    """
    blocks = page_doc.get_text("blocks")
    headers = []
    ph = page_doc.rect.height
    for b in sorted(blocks, key=lambda x: x[1]):
        if b[1] > ph * 0.85 or b[1] > ph - 80 or b[3] < 30:
            continue
        txt = b[4].strip()
        # Ignore totals, turns over, barcodes
        if re.search(r"total\s+for|turn\s+over|\*P\d+", txt, re.I):
            continue
        # Ignore scientific quantities / measurement units (e.g. '25 cm3 of ...')
        if re.search(r"^\s*(?:question\s+|q\.?\s*)?\d{1,3}[:.]?\s+(?:cm|dm|g|mol|°|%|k?j|k?pa|v|s|m|h|min)[0-9\-–−]*\b", txt, re.I):
            continue
        # Ignore blocks that are predominantly dotted or underscore response lines (e.g. '1 ...........')
        if re.search(r"^[\s\d:.]*[\._\-]{2,}", txt):
            continue
        m = re.match(r"^\s*(?:(?:question|q\.?)\s*|\*+\s*)+(\d{1,2})\b", txt, re.IGNORECASE)
        if m and 1 <= int(m.group(1)) <= 35:
            headers.append((m.group(1), b[1]))
        elif b[0] < 120:
            m2 = re.match(r"^\s*\*?\s*(\d{1,2})[:.]?[ \t]+(?:\([a-z0-9]+\)|[A-Za-z0-9\(\[\"\'\u2018\u201c])", txt)
            if m2 and 1 <= int(m2.group(1)) <= 35:
                headers.append((m2.group(1), b[1]))
    # Also inspect line-level spans for standalone bold Section C question numbers (e.g. 14, 20, 21, 25)
    page_dict = page_doc.get_text("dict")
    for bl in page_dict.get("blocks", []):
        if bl.get("type") != 0:
            continue
        for l in bl.get("lines", []):
            ltxt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
            lx0, ly0 = l["bbox"][0], l["bbox"][1]
            if ly0 > ph * 0.85 or ly0 > ph - 80 or ly0 < 30:
                continue
            if lx0 < 60 and ly0 < ph * 0.80:
                m3 = re.match(r"^\s*\*?\s*(\d{1,2})[:.]?\s*$", ltxt)
                if m3 and 14 <= int(m3.group(1)) <= 35:
                    is_bold = any(("bold" in s.get("font", "").lower() or (s.get("flags", 0) & 16 != 0)) for s in l.get("spans", []))
                    if is_bold:
                        headers.append((m3.group(1), ly0))

    seen = set()
    dedup_headers = []
    for q_str, y0 in sorted(headers, key=lambda x: x[1]):
        if q_str not in seen:
            dedup_headers.append((q_str, y0))
            seen.add(q_str)
    return dedup_headers


def is_response_grid_page(page_doc: pymupdf.Page) -> bool:
    """
    Detects if a page contains no question text/prompts/marks,
    but contains a large vector millimeter plotting grid or coordinate axes
    (used as response space for a plotting question on the previous page).
    """
    text = page_doc.get_text()
    cleaned = re.sub(r"\s+", "", text)
    cleaned = re.sub(r"(?i)donotwriteinthisarea", "", cleaned)
    cleaned = re.sub(r"\*P\d+A\d+\*", "", cleaned)
    cleaned = re.sub(r"\b\d+\b", "", cleaned) # page numbers

    has_marks = bool(re.search(r"\(\d+\)", text))
    has_question_word = "question" in text.lower()
    drawings = page_doc.get_drawings()

    # A continuation grid page has no marks, negligible text, and many vector lines (grid)
    return not has_marks and not has_question_word and len(cleaned) < 40 and len(drawings) >= 25


def is_blank_or_continuation_page(page_doc: pymupdf.Page) -> Optional[str]:
    """
    Detects if a page is a BLANK PAGE, cover/instruction blank page,
    or purely candidate writing space / dotted answer lines / continuation diagram
    containing no new question prompt, no subparts, and no question headers.
    """
    txt = page_doc.get_text()
    if re.search(r"\bBLANK\s+PAGE\b", txt, re.I) and not re.search(r"(?<!Total for Question )\(\d+\)", txt):
        return "blank"

    headers = detect_page_top_level_questions(page_doc)
    has_subparts = bool(re.search(r"\([a-z]\)", txt, re.I)) or bool(re.search(r"\([ivx]+\)", txt, re.I))
    has_standalone_mark = bool(re.search(r"(?<!Total for Question )\(\d+\)", txt))
    has_mcq_options = bool(re.search(r"^\s*[A-D]\b", txt, re.M))

    if not headers and not has_subparts and not has_standalone_mark and not has_mcq_options:
        return "continuation"
    return None


def find_answer_book_start_page(doc: pymupdf.Document) -> Optional[int]:
    """
    Detects the start page of the bundled Answer Book in R and A variant papers
    (which combine the Question Booklet and the Answer Book into a single PDF).
    Returns the 0-indexed page number of the Answer Book cover/start, or None if standard QP.
    """
    total_pages = len(doc)
    if total_pages < 18:
        return None
    for p_idx in range(5, total_pages):
        txt = doc[p_idx].get_text("text")
        is_second_cover = ("candidate surname" in txt.lower() or "candidate number" in txt.lower()) and "centre number" in txt.lower()
        has_ans_title = bool(re.search(r"\banswer\s+book\b", txt, re.I)) and ("pearson" in txt.lower() or "edexcel" in txt.lower() or is_second_cover)
        has_barcode = bool(re.search(r"\*P\d+[A-Z]*01\d+\*", txt))
        if is_second_cover or (has_ans_title and has_barcode):
            return p_idx
    return None

def find_question_level_stems_on_page(page_doc: pymupdf.Page, questions: List[Dict[str, Any]], current_section: str = "B") -> List[Dict[str, Any]]:
    """
    Detects un-marked introductory question stems that precede sub-questions on a page
    (e.g. '8  The equation for a reversible reaction is shown...' preceding 8(a) and 8(b),
     or '10 The structure of the sweetener aspartame is shown...' preceding 10(a) and 10(b)).
    """
    ph = page_doc.rect.height
    pw = page_doc.rect.width
    page_dict = page_doc.get_text("dict")
    blocks = page_doc.get_text("blocks")
    blocks = [b for b in blocks if b[1] > 30 and b[1] < ph - 30 and "DO NOT WRITE" not in b[4] and "britishstudentroom" not in b[4]]
    blocks.sort(key=lambda b: b[1])

    rubric_pats = [
        re.compile(r"^\s*SECTION\s+[A-Z]", re.I),
        re.compile(r"^\s*Answer\s+ALL\s+the\s+questions", re.I),
        re.compile(r"^\s*Write\s+your\s+answers\s+in\s+the\s+spaces\s+provided", re.I),
    ]

    lines = []
    for b in page_dict.get("blocks", []):
        if b.get("type") == 0:
            for l in b.get("lines", []):
                txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                lines.append({
                    "y0": l["bbox"][1],
                    "y1": l["bbox"][3],
                    "text": txt,
                    "bbox": l["bbox"]
                })
    lines.sort(key=lambda x: x["y0"])

    subpart_pat = re.compile(r"^\s*\*?\s*(?:(?:\d{1,2}\s*)?\*?\s*\(([a-z])\)|\(([a-z])\)|(?:\([a-z]\)\s*)?\(([ivx]{1,4})\))\s*\*?(?:\s+|$)", re.I)
    headers = detect_page_top_level_questions(page_doc)

    parents_with_subs = set()
    for q in questions:
        pq = str(q.get("parent_question") or "").strip()
        sub = str(q.get("sub_part") or "").strip()
        qn = str(q.get("question_number") or "").strip()
        if not pq and qn:
            m_lead = re.match(r"^\*?\s*(\d+)", qn)
            if m_lead:
                pq = m_lead.group(1)
        if pq and (sub or re.search(r"\([a-z]\)", qn) or re.search(r"\b[a-z]\b", qn)):
            parents_with_subs.add(pq)

    candidate_parents = []
    seen_parents = set()
    for idx, (h_pnum, h_y0) in enumerate(headers):
        next_h_y0 = headers[idx + 1][1] if idx + 1 < len(headers) else (ph - 30)
        has_sub_in_range = any(h_y0 <= l["y0"] < next_h_y0 and subpart_pat.match(l["text"]) for l in lines)
        if (h_pnum in parents_with_subs or has_sub_in_range) and h_pnum not in seen_parents:
            candidate_parents.append(h_pnum)
            seen_parents.add(h_pnum)

    for pq in parents_with_subs:
        if pq not in seen_parents:
            candidate_parents.append(pq)
            seen_parents.add(pq)

    if not candidate_parents and current_section != "A":
        for h_pnum, _ in headers:
            if h_pnum not in seen_parents:
                candidate_parents.append(h_pnum)
                seen_parents.add(h_pnum)

    if not candidate_parents:
        return []

    stems = []
    for pq in candidate_parents:
        # 1. Identify the exact line containing the question header for pq (e.g. '^17\s+[A-Z]' or '^21\s+' or '^3\s+')
        header_line_y0 = None
        for l in lines:
            if l["y0"] > ph - 60 or re.match(r"^\s*\d{1,2}\s*$", l["text"]):
                continue
            if any(rp.match(l["text"]) for rp in rubric_pats):
                continue
            m_hdr = re.match(rf"^\s*(?:(?:question|q\.?|\*+)\s*)?{pq}[:.]?\s+(?:[A-Z]|[0-9])", l["text"], re.I) or re.match(rf"^\s*(?:(?:question|q\.?|\*+)\s*)?{pq}[:.]?\b", l["text"], re.I)
            if m_hdr and not re.match(rf"^\s*(?:(?:question|q\.?|\*+)\s*)?{pq}\s*\*?\s*\([a-z0-9]+\)", l["text"], re.I):
                header_line_y0 = l["y0"]
                break

        if header_line_y0 is None:
            for h_pnum, h_y0 in headers:
                if h_pnum == pq:
                    header_line_y0 = h_y0
                    break

        if header_line_y0 is None:
            continue

        # Bound search strictly before the next question header on this page
        next_header_y0 = ph - 30
        for h_pnum, h_y0 in headers:
            if h_y0 > header_line_y0 + 5 and h_pnum != pq:
                next_header_y0 = min(next_header_y0, h_y0)

        # 2. Find first subpart marker (a) below the question header and BEFORE next_header_y0
        first_sub_y0 = None
        for l in lines:
            if l["y0"] < header_line_y0 - 2 or l["y0"] >= next_header_y0:
                continue
            if subpart_pat.match(l["text"]) or re.match(rf"^\s*(?:question|q)?\s*{pq}\s*\*?\s*\([a-z]\)\s*\*?(?:\s+|$)", l["text"], re.I):
                first_sub_y0 = l["y0"]
                break

        if first_sub_y0 is not None:
            # Case A: Subparts exist on this page - crop from header down to immediately above subpart (a)
            start_y = header_line_y0
            stem_blocks = []
            for b in blocks:
                txt = b[4].strip()
                if any(rp.match(txt) for rp in rubric_pats):
                    continue
                if b[3] > start_y - 2 and b[3] <= first_sub_y0:
                    if not re.match(r"^\s*\*?\s*(?:\d{1,2}\s*)?\*?\s*\([a-z]\)", txt, re.I):
                        if not re.search(r"(?:\(\s*\d{1,2}\s*\)|\[\s*\d{1,2}\s*\])\s*$", txt) and "total for" not in txt.lower():
                            stem_blocks.append(b)

            if stem_blocks and (first_sub_y0 > header_line_y0 + 15):
                y0 = header_line_y0
                stem_y1 = first_sub_y0 - 4
                prev_blocks_y1 = [b_prev[3] for b_prev in blocks if b_prev[3] <= y0 - 1 and "DO NOT WRITE" not in b_prev[4] and "*" not in b_prev[4]]
                prev_y1 = max(prev_blocks_y1, default=None)
                stem_y0 = max(prev_y1 + 1.5, y0 - 12) if prev_y1 is not None else max(0, y0 - 12)
                rubric_blocks = [b for b in blocks if any(rp.search(b[4]) for rp in rubric_pats) and b[3] <= y0 + 5]
                rubric_ceiling = (max(b[3] for b in rubric_blocks) + 1.5) if rubric_blocks else 0
                stem_y0 = max(stem_y0, rubric_ceiling)
                box_1000 = [
                    int(stem_y0 / ph * 1000),
                    80,
                    int(min(ph, stem_y1) / ph * 1000),
                    915
                ]
                summary_txt = " ".join(b[4].strip() for b in stem_blocks)
                summary_clean = re.sub(r"\s+", " ", summary_txt)[:120]
                stems.append({
                    "parent_question": pq,
                    "summary": summary_clean,
                    "box_1000": box_1000,
                    "is_dedicated_page": False,
                    "anchored_above_sub": True
                })
        else:
            # Case B: Dedicated preamble / case-study page (no subparts on this page)
            # Full-page stem accumulation is STRICTLY FORBIDDEN in Section A:
            if current_section == "A":
                continue

            page_full_text = page_doc.get_text("text")
            has_score_indicator = bool(re.search(r"(?:\(\s*\d{1,2}\s*\)|\[\s*\d{1,2}\s*\])\s*$", page_full_text, re.M))
            has_total_line = bool(re.search(r"\(Total\s+(?:for\s+Question\s+\d+\s*=\s*)?\d+\s*marks?\)", page_full_text, re.I))
            top_headers = detect_page_top_level_questions(page_doc)
            if has_score_indicator or has_total_line or len(top_headers) > 1:
                continue

            footer_pats = [
                re.compile(r"^\s*(?:\*?[A-Z0-9_]+\*?|\d{1,3}|turn over)\s*$", re.I),
                re.compile(r"pearson|edexcel", re.I),
                re.compile(r"^\s*DO NOT WRITE", re.I)
            ]
            footer_y0 = ph - 40
            for b in blocks:
                txt = b[4].strip()
                if b[1] > ph - 80 and (b[1] > ph - 50 or any(fp.search(txt) for fp in footer_pats)):
                    footer_y0 = min(footer_y0, b[1])

            start_y = header_line_y0
            stem_blocks = []
            for b in blocks:
                txt = b[4].strip()
                if any(rp.match(txt) for rp in rubric_pats):
                    continue
                if b[3] > start_y - 2 and b[1] < footer_y0:
                    if not any(fp.search(txt) for fp in footer_pats):
                        stem_blocks.append(b)

            if stem_blocks:
                y0 = header_line_y0
                y1 = max(b[3] for b in stem_blocks)
                for d in page_doc.get_drawings():
                    r = d["rect"]
                    if 5 <= r.height < ph * 0.8 and 5 <= r.width < pw * 0.85:
                        if r.y0 >= y0 - 5 and r.y1 < footer_y0:
                            y1 = max(y1, r.y1)

                if y1 > y0 + 15:
                    stem_y1 = min(footer_y0 - 6, y1 + 10)
                    prev_blocks_y1 = [b_prev[3] for b_prev in blocks if b_prev[3] <= y0 - 1 and "DO NOT WRITE" not in b_prev[4] and "*" not in b_prev[4]]
                    prev_y1 = max(prev_blocks_y1, default=None)
                    stem_y0 = max(prev_y1 + 1.5, y0 - 12) if prev_y1 is not None else max(0, y0 - 12)
                    rubric_blocks = [b for b in blocks if any(rp.search(b[4]) for rp in rubric_pats) and b[3] <= y0 + 5]
                    rubric_ceiling = (max(b[3] for b in rubric_blocks) + 1.5) if rubric_blocks else 0
                    stem_y0 = max(stem_y0, rubric_ceiling)
                    box_1000 = [
                        int(stem_y0 / ph * 1000),
                        80,
                        int(min(ph, stem_y1) / ph * 1000),
                        915
                    ]
                    summary_txt = " ".join(b[4].strip() for b in stem_blocks)
                    summary_clean = re.sub(r"\s+", " ", summary_txt)[:120]
                    stems.append({
                        "parent_question": pq,
                        "summary": summary_clean,
                        "box_1000": box_1000,
                        "is_dedicated_page": True
                    })
    return stems

def find_question_level_stem_on_page(page_doc: pymupdf.Page, questions: List[Dict[str, Any]], current_section: str = "B") -> Optional[Dict[str, Any]]:
    stems = find_question_level_stems_on_page(page_doc, questions, current_section)
    return stems[0] if stems else None

def find_part_stems_on_page(page_doc: pymupdf.Page, parent_q: Optional[str]) -> List[Dict[str, Any]]:
    """
    Detects part-level introductory preambles/stems on a page (e.g. '(b) The formula of boric acid can also be written as B(OH)3.').
    Supports optional question number prefix (e.g. '16 (b) First ionisation energies...').
    Characteristics:
    - Matches (a)-(g) introductory statement
    - Has no question marks or mark indicators (e.g. no (1), (2), [1])
    - Followed by roman numeral subparts like (i), (ii) on the page or across page breaks (apparatus/table diagrams)
    - Collects all continuation text blocks, tables, and drawing paths before the first roman subpart
    - Bottom boundary hard-clamped at min(text_ymax + 2, first_sub_y0 - 4) so next marker is never clipped
    """
    stems = []
    blocks = page_doc.get_text("blocks")
    ph = page_doc.rect.height
    pw = page_doc.rect.width
    mark_pat = re.compile(r"(?:\(\s*\d{1,2}\s*\)|\[\s*\d{1,2}\s*\])\s*$")
    for b_idx, b in enumerate(blocks):
        txt = b[4].strip()
        # Reject inline subparts like (a) (i) or 16 (b) (i) - these are question prompts, never stems!
        if re.match(r"^\s*(?:\d{1,2}\s*)?\(([a-z])\)\s*\(([ivx]+)\)", txt, re.I):
            continue
        m = re.match(r"^\s*(?:(?:question|q\.?)\s*)?(?:(\d{1,2})\s*)?\(([a-h|j-z])\)\s+([^\n]+)", txt, re.I)
        if not m:
            continue
        if re.match(r"^\s*\([ivx]+\)", m.group(3).strip(), re.I):
            continue
        if mark_pat.search(txt):
            continue
        if "total for" in txt.lower():
            continue
        sec_letter = m.group(2).lower()
        parent_detected = m.group(1) or parent_q
        has_subpart = False
        stem_blocks = [b]
        first_sub_y0 = None
        stop_pat = re.compile(
            r"^\s*(?:(?:\d{1,2}\s*)?\([a-z]\)|(?:question\s+|q\.?\s*)(\d{1,2})\b|(\d{1,2})\s*(?:\([a-z]\)|(?:\t|\.\s+|\s{2,}[A-Z])))",
            re.IGNORECASE
        )
        mark_hit = False
        for b2 in blocks[b_idx + 1:]:
            txt2 = b2[4].strip()
            if re.match(r"^\s*(?:\d{1,2}\s*)?(?:\([a-z]\)\s*)?\([ivx]+\)", txt2, re.I):
                has_subpart = True
                first_sub_y0 = b2[1]
                break
            # Halt block accumulation as soon as scored marks or new questions appear:
            if mark_pat.search(txt2):
                mark_hit = True
                break
            if stop_pat.match(txt2) or "total for" in txt2.lower():
                break
            stem_blocks.append(b2)

        if not has_subpart and not mark_hit:
            # Check if this is an end-of-page stem (e.g. apparatus setup or data table where subpart (i) starts on the next page)
            has_marks_on_blocks = any(mark_pat.search(sb[4].strip()) for sb in stem_blocks)
            if not has_marks_on_blocks and len(stem_blocks) >= 1:
                y0_check = min(sb[1] for sb in stem_blocks)
                y1_check = max(sb[3] for sb in stem_blocks)
                has_drawings = False
                for d in page_doc.get_drawings():
                    r = d["rect"]
                    if 5 <= r.height < ph * 0.75 and 5 <= r.width < pw * 0.85 and r.y0 >= y0_check - 5 and r.y1 < ph * 0.92:
                        y1_check = max(y1_check, r.y1)
                        has_drawings = True
                has_images = bool(page_doc.get_images())
                if (has_drawings or has_images or len(stem_blocks) >= 3) and y1_check > y0_check + 50:
                    has_subpart = True
                    first_sub_y0 = None

        if has_subpart:
            y0 = min(sb[1] for sb in stem_blocks)
            y1 = max(sb[3] for sb in stem_blocks)
            for d in page_doc.get_drawings():
                r = d["rect"]
                if r.height < ph * 0.7 and r.y0 >= y0 - 5 and (first_sub_y0 is None or r.y1 <= first_sub_y0 - 6) and r.y1 < ph * 0.90:
                    y1 = max(y1, r.y1)
            for info in page_doc.get_image_info():
                bbox = info.get("bbox")
                if bbox and (first_sub_y0 is None or bbox[3] <= first_sub_y0 - 6) and bbox[3] < ph * 0.90:
                    if bbox[1] >= y0 - 15:
                        y1 = max(y1, bbox[3])
            last_stem_line_y1 = y1
            next_marker_y0 = first_sub_y0
            if next_marker_y0 is not None:
                stem_y1 = min(next_marker_y0 - 4, last_stem_line_y1 + 10)
            else:
                stem_y1 = min(ph - 30, last_stem_line_y1 + 10)
            prev_blocks_y1 = [b_prev[3] for b_prev in blocks if b_prev[3] <= y0 - 1 and "DO NOT WRITE" not in b_prev[4] and "*" not in b_prev[4]]
            prev_y1 = max(prev_blocks_y1, default=None)
            stem_y0 = max(prev_y1 + 1.5, y0 - 12) if prev_y1 is not None else max(0, y0 - 12)
            rubric_pats_part = [
                re.compile(r"^\s*SECTION\s+[A-Z]", re.I),
                re.compile(r"^\s*Answer\s+ALL\s+the\s+questions", re.I),
                re.compile(r"^\s*Write\s+your\s+answers\s+in\s+the\s+spaces\s+provided", re.I),
            ]
            rubric_blocks = [b for b in blocks if any(rp.search(b[4]) for rp in rubric_pats_part) and b[3] <= y0 + 5]
            rubric_ceiling = (max(b[3] for b in rubric_blocks) + 1.5) if rubric_blocks else 0
            stem_y0 = max(stem_y0, rubric_ceiling)
            stem_box = [
                int(stem_y0 / ph * 1000),
                80,
                int(min(ph, stem_y1) / ph * 1000),
                915
            ]
            stems.append({
                "section_letter": sec_letter,
                "letter": sec_letter,
                "parent_question": parent_detected,
                "summary": txt.splitlines()[0][:80],
                "box_1000": stem_box,
                "y0_pts": y0,
                "y1_pts": stem_y1
            })
    return stems

def trim_prompt_box(
    page_doc: pymupdf.Page,
    box_1000: List[float],
    marks: int,
    question_type: str = "theory",
    next_q_y0: Optional[float] = None,
    current_qnum: Optional[str] = None
) -> List[float]:
    """
    Trims excessive blank answer space, dotted lines, or large blank drawing boxes from a question crop.
    Finds the lowest boundary of actual prompt text or diagrams, stopping right below the prompt or mark indicator.
    Filters markers using is_subsequent_marker so it never clamps above the prompt's own label (e.g. (a) or (i)).
    For questions containing graphing/plotting grids (e.g. mass spectrum or titration curves), expands ymax to enclose
    all vector drawing paths, coordinate numbers, and axis labels down to the footer margin.
    """
    pw, ph = page_doc.rect.width, page_doc.rect.height
    scale = 1000.0 if max(box_1000) > 1.0 else 1.0
    y0_pts = box_1000[0] / scale * ph
    y1_pts = box_1000[2] / scale * ph

    if question_type != "theory":
        # For MCQs, clamp cleanly above rough working or Total mark line, next question, or footer
        cur_y1_pts = y1_pts
        blocks = page_doc.get_text("blocks")

        cur_parent = None
        if current_qnum:
            m_p = re.match(r"^(\d+)", current_qnum)
            if m_p:
                try:
                    cur_parent = int(m_p.group(1))
                except ValueError:
                    pass

        # 1. Check rough working, Total mark lines, and section totals
        for b in blocks:
            if b[1] >= y0_pts + 10:
                # Rough working text
                if re.search(r"rough\s+working|anything\s+you\s+write\s+in\s+this\s+space", b[4], re.I):
                    cur_y1_pts = min(cur_y1_pts, b[1] - 6)
                # Total line for question
                elif re.search(r"\(Total\s+(?:for\s+Question\s+(\d+)\s*=\s*)?\d+\s*marks?\)", b[4], re.I):
                    m_tot_q = re.search(r"\(Total\s+(?:for\s+Question\s+(\d+)\s*=\s*)?\d+\s*marks?\)", b[4], re.I)
                    tot_q_num = m_tot_q.group(1) if m_tot_q else None
                    if tot_q_num and cur_parent is not None and int(tot_q_num) == cur_parent:
                        cur_y1_pts = min(cur_y1_pts, b[3] + 4)
                    else:
                        cur_y1_pts = min(cur_y1_pts, b[1] - 4)
                # Section A total
                elif re.search(r"TOTAL\s+FOR\s+SECTION\s+A\b", b[4], re.I):
                    cur_y1_pts = min(cur_y1_pts, b[1] - 4)

        # 2. Check next question top
        if next_q_y0 is not None:
            cur_y1_pts = min(cur_y1_pts, next_q_y0 / scale * ph - 4)

        # 3. Check footer lines (barcodes, page numbers, Turn over)
        for b in blocks:
            if b[1] >= y0_pts + 15 and b[1] > ph * 0.85:
                txt = b[4].strip()
                if re.search(r"\*P\d+|Turn\s+over", txt, re.I) or re.match(r"^\s*\d{1,2}\s*$", txt):
                    cur_y1_pts = min(cur_y1_pts, b[1] - 8)

        # 4. Check subsequent subpart letters or roman numerals for multi-part MCQs (e.g. (b) following (a), or (ii) following (i))
        cur_alpha = None
        cur_roman = None
        if current_qnum:
            m_a = re.search(r"(?:\(([a-z])\)|(?:^|\b\d{1,2})([a-z])\b)", current_qnum, re.I)
            if m_a:
                cur_alpha = (m_a.group(1) or m_a.group(2)).lower()
            m_r = re.search(r"\(([ivx]+)\)", current_qnum, re.I)
            if m_r:
                cur_roman = m_r.group(1).lower()

        if cur_alpha is not None or cur_roman is not None:
            page_dict = page_doc.get_text("dict")
            for b in page_dict.get("blocks", []):
                if b.get("type") != 0:
                    continue
                for l in b.get("lines", []):
                    line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                    line_y0 = l["bbox"][1]
                    line_x0 = l["bbox"][0]
                    if line_y0 >= y0_pts + 15 and line_x0 < 120:
                        if cur_alpha is not None:
                            m_sub = re.match(r"^\s*\*?\s*(?:\d{1,2}\s*)?\*?\s*\(([a-z])\)\s*\*?(?:\s+|$)", line_txt, re.I)
                            if m_sub:
                                found_alpha = m_sub.group(1).lower()
                                if ord(found_alpha) > ord(cur_alpha):
                                    cur_y1_pts = min(cur_y1_pts, line_y0 - 4)
                        if cur_roman is not None:
                            m_rom = re.match(r"^\s*\*?\s*(?:\d{1,2}\s*)?\*?\s*(?:\([a-z]\)\s*)?\*?\s*\(([ivx]+)\)\s*\*?(?:\s+|$)", line_txt, re.I)
                            if m_rom:
                                found_rom = m_rom.group(1).lower()
                                if found_rom in ROMAN_NUMS and cur_roman in ROMAN_NUMS:
                                    if ROMAN_NUMS.index(found_rom) > ROMAN_NUMS.index(cur_roman):
                                        cur_y1_pts = min(cur_y1_pts, line_y0 - 4)


        # 5. Check next sequential integer question for Section A MCQs (e.g. Q2 following Q1)
        if cur_parent is not None:
            page_dict = page_doc.get_text("dict")
            for b in page_dict.get("blocks", []):
                if b.get("type") != 0:
                    continue
                for l in b.get("lines", []):
                    line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                    line_y0 = l["bbox"][1]
                    line_x0 = l["bbox"][0]
                    if line_y0 >= y0_pts + 15 and line_x0 < 100:
                        m_q = re.match(r"^\s*(?:question\s+|q\.?\s*)?(\d{1,2})[:.]?(?:\s+|\t)+(?:\([a-z]\)|[A-Za-z])", line_txt, re.I)
                        if m_q and not re.search(r"^\s*(?:question\s+|q\.?\s*)?\d{1,3}[:.]?\s+(?:cm|dm|g|mol|°|%|k?j|k?pa|v|s|m|h|min)[0-9\-–−]*\b", line_txt, re.I):
                            try:
                                cand = int(m_q.group(1))
                                if cand > cur_parent and cand <= 20:
                                    cur_y1_pts = min(cur_y1_pts, line_y0 - 4)
                            except ValueError:
                                pass

        # Safety net: Guarantee ymax never terminates early before Option D of the current question
        opt_d_blocks = [
            b for b in blocks
            if b[1] >= y0_pts + 10 and re.match(r"^\s*D\b", b[4].strip(), re.I)
        ]
        if opt_d_blocks:
            b_d = min(opt_d_blocks, key=lambda b: b[1])
            cur_y1_pts = max(cur_y1_pts, b_d[3] + 4)

        return [box_1000[0], box_1000[1], int(cur_y1_pts / ph * 1000), box_1000[3]]

    cur_parent = None
    if current_qnum:
        m_p = re.match(r"^\*?\s*(\d+)", current_qnum)
        if m_p:
            try:
                cur_parent = int(m_p.group(1))
            except ValueError:
                pass

    if next_q_y0 is not None:
        y1_pts = min(y1_pts, next_q_y0 / scale * ph - 5)

    # Scan page for ANY subsequent marker ((a)-(g), (i)-(vi), Question X) or totals banner starting below current item:
    marker_pat = re.compile(
        r"^\s*\*?\s*(?:(?:\d{1,2}\s*)?\*?\s*\(([a-z])\)\s*\*?(?:\s*\(([ivx]{1,4})\))?|(?:\d{1,2}\s*)?\*?\s*\(([ivx]{1,4})\)|(?:question\s+|\*+\s*|q\.?\s*)(\d{1,2})\b|(?:\*+\s*)?(\d{1,2})\s*(?:\*?\s*\([a-z]\)|\.\s+|\t|\s{2,}(?-i:[A-Z])|\s+(?-i:[A-Z][a-z]+)))",
        re.IGNORECASE
    )
    totals_banner_pat = re.compile(
        r"^\s*(?:total\s+for\s+section\b|total\s+for\s+paper\b|\(total\s+(?:for\s+question\s+\d+\s*=\s*)?\d+\s*marks?\))",
        re.IGNORECASE
    )
    page_dict = page_doc.get_text("dict")
    subseq_marker_y0 = None
    for b in page_dict.get("blocks", []):
        if b.get("type") != 0:
            continue
        for l in b.get("lines", []):
            line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).replace("\xa0", " ").strip()
            line_y0 = l["bbox"][1]
            if line_y0 >= y0_pts + 15:
                m_tot_line = re.search(r"\(Total\s+(?:for\s+Question\s+(\d+)\s*=\s*)?\d+\s*marks?\)", line_txt, re.I)
                if m_tot_line:
                    tot_p = int(m_tot_line.group(1)) if m_tot_line.group(1) else None
                    if tot_p is not None and cur_parent is not None and tot_p == cur_parent:
                        pass
                    else:
                        if subseq_marker_y0 is None or line_y0 < subseq_marker_y0:
                            subseq_marker_y0 = line_y0
                elif re.search(r"total\s+for\s+(?:section|paper)\b", line_txt, re.I):
                    if subseq_marker_y0 is None or line_y0 < subseq_marker_y0:
                        subseq_marker_y0 = line_y0
                elif marker_pat.match(line_txt):
                    if not UNIT_OR_TIME_FILTER.search(line_txt):
                        if l["bbox"][0] < 120:
                            if not current_qnum or is_subsequent_marker(line_txt, current_qnum):
                                if subseq_marker_y0 is None or line_y0 < subseq_marker_y0:
                                    subseq_marker_y0 = line_y0

    if subseq_marker_y0 is not None:
        y1_pts = min(y1_pts, subseq_marker_y0 - 10)

    blocks = page_doc.get_text("blocks")
    clip_rect = pymupdf.Rect(box_1000[1] / scale * pw, y0_pts, box_1000[3] / scale * pw, y1_pts)
    q_text = page_doc.get_text("text", clip=clip_rect)
    is_graph_or_grid = (
        any(w in q_text.lower() for w in ["grid", "spectrum", "plot", "draw the peaks", "axes", "curve"])
        or ("graph" in q_text.lower() and "use your graph" not in q_text.lower())
    )

    # Active Table Detection in question prompt area:
    # Empty table cells are fill-in question prompts, NOT disposable blank writing lines.
    active_table_y1 = None
    table_limit_y = (subseq_marker_y0 - 10) if subseq_marker_y0 is not None else ph
    try:
        tables = page_doc.find_tables().tables
        for t in tables:
            if t.bbox[1] >= y0_pts - 15 and t.bbox[1] < table_limit_y:
                if active_table_y1 is None or t.bbox[3] > active_table_y1:
                    active_table_y1 = t.bbox[3]
    except Exception:
        pass

    # Vector Table Grid Fallback:
    # If find_tables() does not detect the table, inspect page_doc.get_drawings() for grid lines / boxes
    if active_table_y1 is None:
        grid_lines = []
        for d in page_doc.get_drawings():
            r = d["rect"]
            if r.y0 >= y0_pts - 15 and r.y0 < table_limit_y and r.y1 < ph * 0.92:
                if (r.width > pw * 0.35 and r.height <= 5) or (r.height > 40 and r.width > pw * 0.35) or (r.height > 40 and r.width <= 5):
                    grid_lines.append(r.y1)
        if grid_lines:
            active_table_y1 = max(grid_lines)

    cand_blocks = []
    for b in blocks:
        txt = b[4].strip()
        # Look for text blocks starting within or slightly above this question's vertical range
        if b[1] >= y0_pts - 10 and b[3] <= y1_pts + 10:
            is_dots = bool(re.match(r"^[\s\.\-_–—]+$", txt))
            is_area = "DO NOT WRITE" in txt
            is_footer = "*" in txt or "Turn over" in txt or (txt.isdigit() and len(txt) <= 2 and b[3] > ph * 0.90) or bool(re.search(r"total\s+for", txt, re.I))
            # Numbers inside table cells (e.g. product 1, 2, 3, 4) are NOT footer page numbers
            if active_table_y1 is not None and b[3] <= active_table_y1:
                is_footer = False
            is_marker = bool(marker_pat.match(txt)) and (not current_qnum or is_subsequent_marker(txt, current_qnum))
            if not is_dots and not is_area and not is_footer and not is_marker:
                cand_blocks.append(b)
    if not cand_blocks:
        return box_1000
    max_prompt_y1 = max(b[3] for b in cand_blocks)
    if active_table_y1 is not None:
        max_prompt_y1 = max(max_prompt_y1, active_table_y1 + 8)

    # Check for diagrams/drawings in the prompt area (excluding thin dividing lines and full-page borders)
    for d in page_doc.get_drawings():
        r = d["rect"]
        if r.height >= 5 and r.width >= 5 and r.height < ph * 0.75 and r.y0 >= y0_pts - 10 and r.y1 <= y1_pts + 10 and r.y1 < ph * 0.92:
            max_prompt_y1 = max(max_prompt_y1, r.y1)

    # Check for immediate fill-in dotted lines or writing spaces below the last prompt item before next marker
    dot_lines_below = [
        b for b in page_doc.get_text("blocks")
        if b[1] >= max_prompt_y1 - 2 and (subseq_marker_y0 is None or b[3] <= subseq_marker_y0)
        and re.match(r"^[\s\.\-_–—]+$", b[4].strip())
    ]
    if dot_lines_below:
        max_prompt_y1 = max(max_prompt_y1, max(b[3] for b in dot_lines_below))

    new_ymax_pts = min(ph * 0.95, max_prompt_y1 + 14)
    if active_table_y1 is not None:
        target_table_ymax = min(ph * 0.95, active_table_y1 + 8)
        if subseq_marker_y0 is not None:
            target_table_ymax = min(target_table_ymax, subseq_marker_y0 - 6)
        new_ymax_pts = max(new_ymax_pts, target_table_ymax)

    # Fix 4: Theory Prompt Mark Indicator Clamping (e.g. 2019 Jan Q24(b)):
    # If the theory prompt ends with a scored mark indicator line (e.g. '(3)', '(2)'),
    # and no vector drawings or tables exist below it, clamp ymax directly below the mark indicator.
    if not is_graph_or_grid:
        mark_pat_theory = re.compile(r"\(\s*(\d{1,2})\s*\)\s*$")
        last_mark_y1 = None
        for b in page_dict.get("blocks", []):
            if b.get("type") != 0:
                continue
            for l in b.get("lines", []):
                line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                line_y0 = l["bbox"][1]
                line_y1 = l["bbox"][3]
                if line_y0 >= y0_pts - 5 and line_y1 <= y1_pts + 5:
                    if mark_pat_theory.search(line_txt):
                        if last_mark_y1 is None or line_y1 > last_mark_y1:
                            last_mark_y1 = line_y1

        if last_mark_y1 is not None:
            drawings_below = [
                d for d in page_doc.get_drawings()
                if d["rect"].height >= 5 and d["rect"].width >= 5 and d["rect"].height < ph * 0.75
                and d["rect"].y0 >= last_mark_y1 - 2 and d["rect"].y1 <= y1_pts + 10 and d["rect"].y1 < ph * 0.92
            ]
            text_below = [
                b for b in cand_blocks
                if b[1] >= last_mark_y1 + 4 and not mark_pat_theory.search(b[4].strip())
            ]
            if not drawings_below and not text_below and active_table_y1 is None:
                if subseq_marker_y0 is not None and subseq_marker_y0 < ph * 0.85 and dot_lines_below:
                    last_dot_y1 = max(b[3] for b in dot_lines_below)
                    new_ymax_pts = min(new_ymax_pts, min(last_dot_y1 + 8, subseq_marker_y0 - 6))
                else:
                    new_ymax_pts = min(new_ymax_pts, last_mark_y1 + 8)

    if subseq_marker_y0 is not None:
        new_ymax_pts = min(new_ymax_pts, subseq_marker_y0 - 6)
    new_ymax_1000 = int(new_ymax_pts / ph * 1000)
    if is_graph_or_grid:
        # Enclose complete axes and labels down to the footer margin (ph - 45)
        if subseq_marker_y0 is not None:
            cutoff = int((subseq_marker_y0 - 6) / ph * 1000)
            return [box_1000[0], box_1000[1], min(box_1000[2], max(new_ymax_1000, cutoff)), box_1000[3]]
        elif next_q_y0 is not None:
            cutoff = int((next_q_y0 / scale * ph - 6) / ph * 1000)
            return [box_1000[0], box_1000[1], min(box_1000[2], max(new_ymax_1000, cutoff)), box_1000[3]]
        elif new_ymax_1000 > box_1000[2]:
            return [box_1000[0], box_1000[1], min(int((ph - 45) / ph * 1000), new_ymax_1000), box_1000[3]]
        return box_1000

    if active_table_y1 is not None:
        cand_ymax = max(box_1000[2], new_ymax_1000)
        if subseq_marker_y0 is not None:
            cand_ymax = min(cand_ymax, int((subseq_marker_y0 - 6) / ph * 1000))
        return [box_1000[0], box_1000[1], cand_ymax, box_1000[3]]

    # Only trim if new_ymax_1000 is meaningfully smaller than box_1000[2] and leaves enough height for prompt
    if subseq_marker_y0 is not None:
        new_ymax_1000 = min(new_ymax_1000, int((subseq_marker_y0 - 6) / ph * 1000))
        if new_ymax_1000 < box_1000[2]:
            return [box_1000[0], box_1000[1], new_ymax_1000, box_1000[3]]
    if new_ymax_1000 < box_1000[2] - 10 and new_ymax_1000 >= box_1000[0] + 25:
        return [box_1000[0], box_1000[1], new_ymax_1000, box_1000[3]]
    return box_1000

def run_extraction(
    papers_dir: str = "papers",
    output_dir: str = "frontend/public",
    manifest_path: str = "pipeline_manifest.json",
    unit_filter: Optional[str] = None,
    series_filter: Optional[str] = None,
    max_papers: Optional[int] = None,
    max_pages: Optional[int] = None,
    dry_run: bool = False,
    force: bool = False,
    process_all: bool = False
):
    print("=" * 65, flush=True)
    print("Edexcel IAL Chemistry Topical Past Paper Batch Ingestion Pipeline", flush=True)
    print("=" * 65, flush=True)

    # 1. Checkpoint Manifest & Existing Dataset Setup
    manifest_mgr = ManifestManager(manifest_path)

    dataset_out_path = os.path.join(output_dir, "dataset.json")
    root_dataset_path = "dataset.json"

    dataset_map: Dict[str, Dict[str, Any]] = {}

    # Load existing dataset if present
    load_path = dataset_out_path if os.path.exists(dataset_out_path) else (root_dataset_path if os.path.exists(root_dataset_path) else None)
    if load_path:
        try:
            with open(load_path, "r", encoding="utf-8") as f:
                existing_items = json.load(f)
                for item in existing_items:
                    dataset_map[item["id"]] = item
            print(f"Loaded {len(dataset_map)} existing questions from {load_path}.", flush=True)
        except Exception as e:
            print(f"Warning: Could not read existing dataset: {e}", flush=True)

    # Bootstrap manifest if manifest is empty
    if not manifest_mgr.data.get("papers") and len(dataset_map) > 0:
        manifest_mgr.bootstrap_from_dataset(load_path)
        print(f"Bootstrapped manifest with {len(manifest_mgr.data['papers'])} existing paper records.", flush=True)

    # 2. Automated Paper Discovery & Pairing
    effective_papers_dir = papers_dir
    if not os.path.exists(effective_papers_dir) and os.path.exists("sample_papers"):
        effective_papers_dir = "sample_papers"

    all_pairs = scan_papers_directory(
        papers_dir=effective_papers_dir,
        unit_filter=unit_filter,
        series_filter=series_filter
    )

    if not all_pairs and effective_papers_dir != "sample_papers" and os.path.exists("sample_papers"):
        print(f"No papers matched in '{effective_papers_dir}'. Checking 'sample_papers'...", flush=True)
        all_pairs = scan_papers_directory(
            papers_dir="sample_papers",
            unit_filter=unit_filter,
            series_filter=series_filter
        )

    if not all_pairs:
        print(f"No question papers found matching filters (Dir: {effective_papers_dir}, Unit: {unit_filter}, Series: {series_filter}).", flush=True)
        return

    print(f"\nDiscovered {len(all_pairs)} total paired past papers across '{effective_papers_dir}'.", flush=True)
    if unit_filter:
        print(f"  Unit filter: '{unit_filter}'", flush=True)
    if series_filter:
        print(f"  Series filter: '{series_filter}'", flush=True)

    # 3. Categorize into papers to process vs skip
    existing_paper_ids = set(q.get("paperId") for q in dataset_map.values() if q.get("paperId"))

    to_process = []
    to_skip = []

    for pair in all_pairs:
        is_done = manifest_mgr.is_paper_completed(pair, existing_dataset_paper_ids=existing_paper_ids)
        if is_done and not force:
            to_skip.append(pair)
        else:
            to_process.append(pair)

    print(f"\nStatus: {len(to_skip)} already completed (will skip) | {len(to_process)} queued for processing.", flush=True)

    if max_papers:
        print(f"  (--max-papers limit applied: processing first {max_papers} papers).", flush=True)
        to_process = to_process[:max_papers]

    # 4. Dry-run Mode
    if dry_run:
        print("\n" + "-" * 65, flush=True)
        print("DRY-RUN PREVIEW OF BATCH INGESTION QUEUE:", flush=True)
        print("-" * 65, flush=True)
        for idx, p in enumerate(to_process, 1):
            ms_indicator = "Matched MS" if p["rms_path"] else "NO MS"
            print(f"  [{idx:02d}] QUEUED: [{p['series']}] {p['unit_code']} ({p['paper_code']}) | QP: {p['que_filename']} | {ms_indicator}", flush=True)
        for idx, p in enumerate(to_skip[:10], 1):
            print(f"  [--] SKIP:   [{p['series']}] {p['unit_code']} ({p['paper_code']}) -> already in manifest/dataset", flush=True)
        if len(to_skip) > 10:
            print(f"  ... and {len(to_skip) - 10} more completed papers.", flush=True)
        print("-" * 65, flush=True)
        print("Dry-run complete. No extraction API calls or disk writes performed.", flush=True)
        return

    if not to_process:
        print("\nAll discovered papers are already extracted and checkpointed in manifest. Nothing to process!", flush=True)
        print("Use --force if you wish to re-extract completed papers.", flush=True)
        return

    # 5. Extraction Execution Setup
    questions_out_dir = os.path.join(output_dir, "extracted", "questions")
    ms_out_dir = os.path.join(output_dir, "extracted", "mark_schemes")
    os.makedirs(questions_out_dir, exist_ok=True)
    os.makedirs(ms_out_dir, exist_ok=True)

    extractor = GeminiExtractor()

    for paper_idx, pair in enumerate(to_process, 1):
        unit_code = pair["unit_code"]
        base_unit_code = pair.get("base_unit_code", unit_code)
        unit_name = pair.get("unit_name") or get_unit_from_code(base_unit_code)
        is_practical_unit = base_unit_code in ("WCH13", "WCH16")
        paper_id = pair["paper_id"]
        series_name = pair["series"]
        series_folder = pair.get("series_folder", series_name)
        paper_code = pair.get("paper_code", f"{base_unit_code}/01")

        print("\n" + "=" * 65, flush=True)
        print(f">>> [{paper_idx}/{len(to_process)}] Processing [Series: {series_name}] [Unit: {unit_code}] ({paper_code})", flush=True)
        print(f"    QP: {pair['que_path']}", flush=True)
        print(f"    MS: {pair.get('rms_path') or 'None'}", flush=True)
        print("=" * 65, flush=True)

        try:
            qp_proc = PDFProcessor(pair["que_path"])
        except Exception as e:
            print(f"Error opening QP PDF '{pair['que_path']}': {e}", flush=True)
            continue

        total_qp_pages = qp_proc.get_page_count()
        pages_to_process = min(total_qp_pages, max_pages) if max_pages else total_qp_pages

        ans_start = find_answer_book_start_page(qp_proc.doc)
        if ans_start:
            pages_to_process = min(pages_to_process, ans_start)
            print(f"    [ANSWER BOOK TRUNCATED] Detected Answer Book starting at page {ans_start + 1}. Limiting Question Paper extraction to pages 1..{ans_start}.", flush=True)

        # Initialize Mark Scheme Matcher
        ms_matcher = None
        if pair.get("rms_path") and os.path.exists(pair["rms_path"]):
            print(f"    Indexing Mark Scheme: {pair['rms_path']}...", flush=True)
            try:
                ms_proc = PDFProcessor(pair["rms_path"])
                ms_matcher = MSMatcher(ms_proc, paper_id=f"{paper_id}_ms")
                ms_matcher.index_mark_scheme(max_pages=max_pages * 2 if max_pages else None)
                print(f"    Found {len(ms_matcher.entries_by_qid)} mark scheme entries.", flush=True)
            except Exception as e:
                print(f"    Warning: Failed to index Mark Scheme: {e}", flush=True)
                ms_matcher = None

        # Prune any previous entries for this paper from dataset_map to eliminate ghost questions
        target_session = pair.get("session", "june").lower().replace("may/", "")
        qp_file_stem = os.path.splitext(os.path.basename(pair["que_path"]))[0]
        keys_to_remove = [
            k for k, v in dataset_map.items()
            if v.get("paperId") in (paper_id, qp_file_stem)
            or (
                v.get("unitCode") == unit_code
                and v.get("year") == pair["year"]
                and v.get("session", "").lower().replace("may/", "") == target_session
                and v.get("variant", "") == pair.get("variant", "")
            )
        ]
        if keys_to_remove:
            print(f"    Pruning {len(keys_to_remove)} existing entries for {paper_id} from dataset to prevent ghost duplicates...", flush=True)
            for k in keys_to_remove:
                del dataset_map[k]

        # Multi-Page Question State Tracking across page loops within each paper:
        # Prevents parent ID drift across page breaks
        current_question_context: Dict[str, Any] = {
            "parent_question": None,
            "active_sub_letter": None,
            "last_seen_qnum": None,
        }
        current_section = "B" if is_practical_unit else ("A" if base_unit_code in ("WCH11", "WCH12", "WCH14", "WCH15") else "B")
        active_question_stem: Optional[Dict[str, Any]] = None
        active_part_stem: Optional[Dict[str, Any]] = None
        active_stem: Optional[Dict[str, Any]] = None
        paper_question_stems: Dict[str, Dict[str, Any]] = {}
        seen_qnums: set[str] = set()

        paper_new_questions: List[Dict[str, Any]] = []
        paper_dedup_scores: Dict[str, float] = {}
        recent_subparts_by_parent: Dict[str, Dict[str, Any]] = {}

        for p_idx in range(pages_to_process):
            page_num = p_idx + 1
            print(f"  [Series: {series_folder}] [Unit: {unit_code}] Processing page {page_num}/{pages_to_process}...", flush=True)

            page_text = qp_proc.doc[p_idx].get_text()
            if not is_practical_unit and current_section == "A":
                if re.search(r"^\s*SECTION\s+B\b", page_text, re.IGNORECASE | re.MULTILINE):
                    current_section = "B"
                    print(f"    [SECTION DETECTED] Switched active section to SECTION B", flush=True)
            elif current_section == "B":
                if re.search(r"^\s*SECTION\s+C\b", page_text, re.IGNORECASE | re.MULTILINE):
                    current_section = "C"
                    print(f"    [SECTION DETECTED] Switched active section to SECTION C", flush=True)

            # Check if this page is a response grid continuation page (e.g. Page 21 for Q19(b)(ii))
            if p_idx > 0 and is_response_grid_page(qp_proc.doc[p_idx]):
                if paper_new_questions:
                    prev_entry = paper_new_questions[-1]
                    prev_img_path = os.path.join(questions_out_dir, f"{prev_entry['id']}.png")
                    if os.path.exists(prev_img_path):
                        pw, ph = qp_proc.doc[p_idx].rect.width, qp_proc.doc[p_idx].rect.height
                        drawings = qp_proc.doc[p_idx].get_drawings()
                        grid_rects = [d['rect'] for d in drawings if d['rect'].y0 > 40 and d['rect'].y1 < ph - 40]
                        if grid_rects:
                            y0 = max(0, min(r.y0 for r in grid_rects) - 15)
                            y1 = min(ph, max(r.y1 for r in grid_rects) + 15)
                            grid_box_1000 = [int(y0 / ph * 1000), 70, int(y1 / ph * 1000), 940]
                        else:
                            grid_box_1000 = [50, 70, 920, 940]

                        grid_crop = qp_proc.crop_box(p_idx, grid_box_1000, dpi=300, clamp_horizontal=True)
                        prev_img = Image.open(prev_img_path)
                        stitched_grid = PDFProcessor.stitch_stem_and_question(
                            stem_img=prev_img,
                            question_img=grid_crop,
                            stem_label=f"QUESTION {prev_entry['questionNumber']} PROMPT & DATA",
                            question_label="RESPONSE GRAPH PAPER GRID"
                        )
                        stitched_grid.save(prev_img_path, "PNG", optimize=True)
                        print(f"    -> [RESPONSE GRID STITCHED] Appended millimeter grid from Page {page_num} to Q{prev_entry['questionNumber']}", flush=True)
                continue

            # Check if this page is a blank or continuation page
            page_kind = is_blank_or_continuation_page(qp_proc.doc[p_idx])
            if page_kind:
                if page_kind == "continuation" and re.search(r"(?i)\bstep\s+\d+\b|\bintermediate\b", page_text):
                    if paper_new_questions:
                        prev_entry = paper_new_questions[-1]
                        prev_img_path = os.path.join(questions_out_dir, f"{prev_entry['id']}.png")
                        if os.path.exists(prev_img_path):
                            diag_box_1000 = [60, 70, 880, 940]
                            diag_crop = qp_proc.crop_box(p_idx, diag_box_1000, dpi=300, clamp_horizontal=True)
                            prev_img = Image.open(prev_img_path)
                            stitched_diag = PDFProcessor.stitch_stem_and_question(
                                stem_img=prev_img,
                                question_img=diag_crop,
                                stem_label=f"QUESTION {prev_entry['questionNumber']} (PART 1)",
                                question_label=f"QUESTION {prev_entry['questionNumber']} (PART 2 - CONTINUATION)"
                            )
                            stitched_diag.save(prev_img_path, "PNG", optimize=True)
                            print(f"    -> [CONTINUATION DIAGRAM STITCHED] Appended multi-step synthesis from Page {page_num} to Q{prev_entry['questionNumber']}", flush=True)
                print(f"    Skipping {page_kind} page {page_num}", flush=True)
                continue

            pw, ph = qp_proc.doc[p_idx].rect.width, qp_proc.doc[p_idx].rect.height

            # Detect explicit top-level question headers on this page
            page_headers = detect_page_top_level_questions(qp_proc.doc[p_idx])

            # Section A Continuation Page Stitcher (e.g. rate graph on previous page, prompt + options [A-D] on current page)
            if current_section == "A" and p_idx > 0 and len(page_headers) == 0:
                p_text = qp_proc.doc[p_idx].get_text()
                has_options = bool(re.search(r"^\s*[A-D]\b", p_text, re.M))
                has_total_for_prev = False
                prev_parent = current_question_context.get("parent_question")
                if prev_parent:
                    has_total_for_prev = bool(re.search(rf"\(Total\s+(?:for\s+Question\s+{re.escape(str(prev_parent))}\s*=\s*)?\d+\s*marks?\)", p_text, re.I))
                has_new_subpart = bool(re.search(r"^\s*(?:\d{1,2}\s*)?\(([a-z])\)", p_text, re.M))
                # Also treat Roman numeral subpart markers (i), (ii), (iii) etc. as new subparts.
                # If a page opens with (i) / (ii) before any A-D options, those are independent
                # question entries (e.g. 10(b)(i) and 10(b)(ii)) and must NOT be stitched onto
                # the previous MCQ -- they need their own question objects.
                has_roman_subpart = bool(re.search(r"^\s*\([ivx]+\)\s+\S", p_text, re.M))

                if (has_options or has_total_for_prev) and not has_new_subpart and not has_roman_subpart and paper_new_questions:
                    prev_entry = paper_new_questions[-1]
                    prev_img_path = os.path.join(questions_out_dir, f"{prev_entry['id']}.png")
                    if os.path.exists(prev_img_path):
                        # Crop continuation content down to Total line or Option D
                        cont_y0 = 40
                        cont_y1 = ph * 0.85
                        for b in qp_proc.doc[p_idx].get_text("blocks"):
                            m_tot = re.search(r"\(Total\s+(?:for\s+Question\s+\d+\s*=\s*)?\d+\s*marks?\)", b[4], re.I)
                            if m_tot:
                                cont_y1 = min(cont_y1, b[3] + 6)
                                break
                            elif re.match(r"^\s*D\b", b[4].strip(), re.I):
                                cont_y1 = max(cont_y1, b[3] + 8)

                        cont_box = [int(cont_y0 / ph * 1000), 60, int(cont_y1 / ph * 1000), 940]
                        cont_crop = qp_proc.crop_box(p_idx, cont_box, dpi=300, clamp_horizontal=True)
                        prev_img = Image.open(prev_img_path)
                        stitched_img = PDFProcessor.stitch_stem_and_question(
                            stem_img=prev_img,
                            question_img=cont_crop,
                            stem_label=f"QUESTION {prev_entry['questionNumber']} (PART 1 - GRAPH / DATA)",
                            question_label=f"QUESTION {prev_entry['questionNumber']} (PART 2 - OPTIONS)"
                        )
                        stitched_img.save(prev_img_path, "PNG", optimize=True)
                        print(f"    -> [SECTION A CONTINUATION STITCHED] Appended prompt and options from Page {page_num} to Q{prev_entry['questionNumber']}", flush=True)
                        continue

            # Roman-numeral page sub-letter correction (Bug 1 fix, part 2):
            # If the current page has (i)/(ii) markers but no letter subparts, check whether
            # the PREVIOUS page had a (b) or (c) stem marker that appeared AFTER the last
            # processed question on that page. If so, advance active_sub_letter to match,
            # so the existing letter-advance correction can relabel Gemini's (a)(i) → (b)(i).
            if (current_section == "A" and p_idx > 0 and
                    bool(re.search(r"^\s*\([ivx]+\)\s+\S", qp_proc.doc[p_idx].get_text(), re.M)) and
                    not bool(re.search(r"^\s*(?:\d{1,2}\s*)?\(([a-z])\)", qp_proc.doc[p_idx].get_text(), re.M))):
                prev_page_text = qp_proc.doc[p_idx - 1].get_text()
                active_sl = current_question_context.get("active_sub_letter")
                if active_sl:
                    # Find the next letter after active_sl that appears as a subpart marker on the previous page
                    for candidate_let in "bcdefg":
                        if ord(candidate_let) > ord(active_sl):
                            if re.search(rf"\({candidate_let}\)", prev_page_text, re.I):
                                current_question_context["active_sub_letter"] = candidate_let
                                print(f"    [ROMAN PAGE SUB-LETTER ADVANCE] Previous page has ({candidate_let}) stem; advancing active_sub_letter {active_sl}→{candidate_let} before processing roman numeral page", flush=True)
                                break


            img_150 = qp_proc.render_page(p_idx, dpi=150)

            try:
                analysis = extractor.analyze_qp_page(
                    image_150=img_150,
                    page_doc=qp_proc.doc[p_idx],
                    paper_id=paper_id,
                    page_index=p_idx,
                    unit_name=unit_name,
                    active_parent_question=current_question_context["parent_question"],
                    current_question_context=current_question_context
                )
            except Exception as e:
                print(f"    Warning: Failed page {page_num}: {e}", flush=True)
                continue

            page_type = analysis.get("page_type", "")
            if page_type in ["cover", "data_sheet_or_periodic_table", "blank"]:
                print(f"    Skipping non-question page ({page_type})", flush=True)
                continue

            # Part stems persist across page turns so continuation subparts on subsequent pages
            # (e.g. 23(d)(iv) on Page 18 following 23(d)(i)-(iii) on Page 17) retain their active part stem.
            # active_part_stem is invalidated ONLY when:
            #   a) A new part letter explicitly begins (e.g. reaching part (e) on Page 18), OR
            #   b) A new parent question begins (e.g. transitioning to Q24).

            # If explicit top-level question headers appear on this page, update parent_question
            if current_section != "A" and page_headers:
                first_hdr_q = page_headers[0][0]
                cur_pq = current_question_context.get("parent_question")
                if cur_pq is None or (str(cur_pq).isdigit() and str(first_hdr_q).isdigit() and int(first_hdr_q) > int(cur_pq)):
                    current_question_context["parent_question"] = first_hdr_q
                    current_question_context["active_sub_letter"] = None
                    active_question_stem = None
                    active_part_stem = None

            # Check if this page introduces Question Stem(s)
            stems_info = find_question_level_stems_on_page(qp_proc.doc[p_idx], analysis.get("questions", []), current_section=current_section)
            from_fallback = False
            if current_section == "A":
                # In Section A, fallback stems from Gemini are forbidden unless genuine letter subparts (a), (b) exist
                has_letter_subs = any(
                    bool(q.get("sub_part")) or bool(re.search(r"\([a-z]\)", str(q.get("question_number", ""))))
                    for q in analysis.get("questions", [])
                )
                if not has_letter_subs:
                    stems_info = []
            elif not stems_info:
                fb_stem = analysis.get("stem")
                if fb_stem and fb_stem.get("box_1000"):
                    stems_info = [fb_stem]
                    from_fallback = True

            for stem_info in stems_info:
                if not stem_info or not stem_info.get("box_1000"):
                    continue
                stem_box = stem_info["box_1000"]
                while isinstance(stem_box, (list, tuple)) and len(stem_box) > 0 and isinstance(stem_box[0], (list, tuple)):
                    stem_box = stem_box[0]
                # Clamp stem horizontally to printable margins with top safety breathing room
                stem_y0_pts = stem_box[0] / 1000.0 * ph
                stem_y1_pts = stem_box[2] / 1000.0 * ph

                # Fix 1 & 2: Stems can NEVER contain scored subparts, marks, or subpart markers
                mark_pat_stem = re.compile(r"(?:\(\s*\d{1,2}\s*\)|\[\s*\d{1,2}\s*\])\s*$")
                subpart_pat_stem = re.compile(r"^\s*(?:\([a-z]\)\s*)?\([ivx]{1,4}\)", re.I)
                letter_subpart_pat = re.compile(r"^\s*(?:\d{1,2}\s*)?\*?\s*\(([a-z])\)(?:\s+|$)", re.I)
                first_scored_or_sub_y0 = None
                is_dedicated = stem_info.get("is_dedicated_page", False)
                anchored_above_sub = stem_info.get("anchored_above_sub", False)
                if not is_dedicated and not anchored_above_sub:
                    page_dict = qp_proc.doc[p_idx].get_text("dict")
                    for b in page_dict.get("blocks", []):
                        if b.get("type") != 0:
                            continue
                        for l in b.get("lines", []):
                            line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                            line_y0 = l["bbox"][1]
                            if line_y0 >= stem_y0_pts + 10:
                                if (
                                    mark_pat_stem.search(line_txt)
                                    or subpart_pat_stem.match(line_txt)
                                    or letter_subpart_pat.match(line_txt)
                                ):
                                    if first_scored_or_sub_y0 is None or line_y0 < first_scored_or_sub_y0:
                                        first_scored_or_sub_y0 = line_y0

                    if first_scored_or_sub_y0 is not None:
                        stem_y1_pts = min(stem_y1_pts, first_scored_or_sub_y0 - 6)
                        if stem_y1_pts <= stem_y0_pts + 15:
                            continue
                        else:
                            stem_box[2] = int(stem_y1_pts / ph * 1000)

                stem_y0_pts = stem_box[0] / 1000.0 * ph
                prev_blocks_y1 = [b[3] for b in qp_proc.doc[p_idx].get_text("blocks") if b[3] <= stem_y0_pts - 1 and "DO NOT WRITE" not in b[4] and "*" not in b[4]]
                prev_y1_pts = max(prev_blocks_y1, default=None)
                safe_stem_y0 = max(prev_y1_pts + 1.5, stem_y0_pts) if prev_y1_pts is not None else stem_y0_pts
                rubric_pats_stem = [
                    re.compile(r"^\s*SECTION\s+[A-Z]", re.I),
                    re.compile(r"^\s*Answer\s+ALL\s+the\s+questions", re.I),
                    re.compile(r"^\s*Write\s+your\s+answers\s+in\s+the\s+spaces\s+provided", re.I),
                ]
                rubric_blocks = [b for b in qp_proc.doc[p_idx].get_text("blocks") if any(rp.search(b[4]) for rp in rubric_pats_stem) and b[3] <= stem_y0_pts + 5]
                rubric_ceiling = (max(b[3] for b in rubric_blocks) + 1.5) if rubric_blocks else None
                if rubric_ceiling is not None:
                    safe_stem_y0 = max(safe_stem_y0, rubric_ceiling)
                stem_box = [int(safe_stem_y0 / ph * 1000), 80, stem_box[2], 915]

                # Terminate stem crop strictly above the first sub-question below it on the page (for fallback stems)
                if from_fallback:
                    questions_below = [q for q in analysis.get("questions", []) if q.get("box_1000") and q["box_1000"][0] >= stem_box[0] + 15]
                    if questions_below:
                        first_q_y0 = min(q["box_1000"][0] for q in questions_below)
                        first_q_y0_pts = first_q_y0 / 1000.0 * ph
                        stem_y1_pts = first_q_y0_pts - 4
                        stem_box[2] = int(stem_y1_pts / ph * 1000)
                    else:
                        footer_y0 = ph * 0.88
                        for b in qp_proc.doc[p_idx].get_text("blocks"):
                            if b[1] > ph * 0.85 and re.search(r"\*P\d+|turn\s+over|^\s*\d{1,2}\s*$", b[4].strip(), re.I):
                                footer_y0 = min(footer_y0, b[1] - 10)
                        max_content_y1 = stem_box[2] / 1000.0 * ph
                        for b in qp_proc.doc[p_idx].get_text("blocks"):
                            if b[1] >= stem_box[0] / 1000.0 * ph and b[3] <= footer_y0:
                                if not re.search(r"DO NOT WRITE|\*P\d+|turn\s+over", b[4], re.I):
                                    max_content_y1 = max(max_content_y1, b[3])
                        for d in qp_proc.doc[p_idx].get_drawings():
                            r = d["rect"]
                            if 5 <= r.height < ph * 0.8 and 5 <= r.width < pw * 0.85:
                                if r.y0 >= stem_box[0] / 1000.0 * ph - 5 and r.y1 <= footer_y0:
                                    max_content_y1 = max(max_content_y1, r.y1)
                        stem_box[2] = int(min(footer_y0, max_content_y1 + 10) / ph * 1000)

                stem_parent = stem_info.get("parent_question", "")
                stem_summary = stem_info.get("summary", "Question Stem")
                print(f"    [STEM DETECTED] Parent Q{stem_parent}: '{stem_summary}'", flush=True)

                # Directional stem letter assignment:
                # If the stem has an explicit subpart letter e.g. '(b) The formula...', restrict to that letter.
                # Otherwise, it is a parent-level stem (e.g. '7 1 kg of seawater...' or '21 Boric acid...')
                # and applies to all subparts of that parent question.
                stem_section_letter = None
                raw_sec_letter = stem_info.get("section_letter")
                if raw_sec_letter:
                    stem_section_letter = str(raw_sec_letter).lower().strip("()")
                else:
                    m_sum_let = re.match(r"^\s*(?:(?:\d{1,2}\s*)?\*?\s*\(([a-z])\)|([a-z])\))", stem_summary, re.I)
                    if m_sum_let:
                        stem_section_letter = (m_sum_let.group(1) or m_sum_let.group(2)).lower()
                if stem_section_letter in ROMAN_NUMS:
                    stem_section_letter = None

                # Continuation page guard:
                # A fallback stem from Gemini CANNOT overwrite active_question_stem on a page
                # that does not contain the question's originating header.
                has_originating_header = any(h[0] == stem_parent for h in page_headers)
                if from_fallback and not has_originating_header and not stem_section_letter:
                    print(f"    [STEM OVERWRITE BLOCKED] Discarded fallback parent stem for Q{stem_parent} on continuation page without header", flush=True)
                    continue

                try:
                    # Crop stem at 300 DPI for crisp visual clarity with full horizontal clamping and clean bottom boundary
                    stem_crop_300 = qp_proc.crop_box(p_idx, stem_box, dpi=300, padding=16, padding_top=16, padding_bottom=16, clamp_horizontal=True, scan_markers=False, is_stem=True)
                    stem_entry = {
                        "parent_question": stem_parent,
                        "section_letter": stem_section_letter,
                        "letter": stem_section_letter,
                        "page_index": p_idx,
                        "summary": stem_summary,
                        "box_1000": stem_box,
                        "stem_img": stem_crop_300,
                        "subparts_seen": 0,
                        "source": "page_stem"
                    }
                    if stem_parent:
                        paper_question_stems[stem_parent] = stem_entry
                    if stem_section_letter:
                        active_part_stem = stem_entry
                    else:
                        active_question_stem = stem_entry
                        active_part_stem = None

                    if stem_parent:
                        if any(h[0] == stem_parent for h in page_headers):
                            if stem_parent != current_question_context["parent_question"]:
                                current_question_context["active_sub_letter"] = None
                            current_question_context["parent_question"] = stem_parent
                except Exception as e:
                    print(f"    Failed to crop stem: {e}", flush=True)

            # Detect part-level stems on this page (e.g. '(b) The formula of boric acid...')
            part_stems = [] if current_section == "A" else find_part_stems_on_page(qp_proc.doc[p_idx], current_question_context["parent_question"])
            if part_stems:
                latest_ps = part_stems[-1]
                ps_let = (latest_ps.get("letter") or latest_ps.get("section_letter") or "").lower().strip("()")
                if ps_let in ROMAN_NUMS:
                    ps_let = None
                if not analysis.get("questions") and ps_let:
                    current_question_context["active_sub_letter"] = ps_let
                    # If this page has no questions (e.g. dedicated part stem page like Page 32 for Q17(b)), crop and activate the part stem now
                    if latest_ps.get("box_1000"):
                        ps_box = [latest_ps["box_1000"][0], 80, latest_ps["box_1000"][2], 915]
                        ps_crop = qp_proc.crop_box(p_idx, ps_box, dpi=300, clamp_horizontal=True, is_stem=True)
                        active_part_stem = {
                            "parent_question": current_question_context["parent_question"],
                            "section_letter": ps_let,
                            "letter": ps_let,
                            "page_index": p_idx,
                            "summary": latest_ps["summary"],
                            "box_1000": ps_box,
                            "stem_img": ps_crop,
                            "subparts_seen": 0,
                            "source": "exact_part_stem"
                        }
                        print(f"    [PART STEM ACTIVATED ON STEM PAGE] Q{current_question_context['parent_question']}({ps_let}): '{latest_ps['summary'][:75]}'", flush=True)
                elif analysis.get("questions") and part_stems:
                    # If questions exist on this page, check if the first part stem appears BEFORE the first question
                    first_q_y0 = min((q.get("box_1000", [1000])[0] for q in analysis.get("questions", []) if q.get("box_1000")), default=1000)
                    first_ps = part_stems[0]
                    fps_let = (first_ps.get("letter") or first_ps.get("section_letter") or "").lower().strip("()")
                    if fps_let and fps_let not in ROMAN_NUMS and first_ps.get("box_1000", [0])[0] < first_q_y0 + 20:
                        current_question_context["active_sub_letter"] = fps_let
                        print(f"    [PART STEM ACTIVATED ON PAGE WITH QUESTIONS] Q{current_question_context['parent_question']}({fps_let}): '{first_ps['summary'][:75]}'", flush=True)

            # Process questions on this page
            questions_list = analysis.get("questions", [])
            for q in questions_list:
                box_1000 = q.get("box_1000")
                if box_1000:
                    while isinstance(box_1000, (list, tuple)) and len(box_1000) > 0 and isinstance(box_1000[0], (list, tuple)):
                        box_1000 = box_1000[0]
                    # Clamp horizontal margins inside printable area: 60 to 940
                    box_1000 = [box_1000[0], 60, box_1000[2], 940]

                if not box_1000:
                    continue

                ph = qp_proc.doc[p_idx].rect.height
                pw = qp_proc.doc[p_idx].rect.width

                raw_qnum = str(q.get("question_number") or "").strip()
                raw_parent = str(q.get("parent_question") or "").strip()
                raw_sub = str(q.get("sub_part") or "").strip()
                raw_qnum = re.sub(r"^\*+\s*", "", raw_qnum).strip()
                raw_parent = re.sub(r"^\*+\s*", "", raw_parent).strip()

                m_sub_parts = re.findall(r"\(([a-z0-9]+)\)", f"{raw_qnum} {raw_sub}".lower())

                # Section A: Specialized anchoring and boundary enforcement
                if current_section == "A":
                    page_blocks = qp_proc.doc[p_idx].get_text("blocks")
                    # Check if this is a subpart MCQ (e.g. 15(a), 4(b)) or a standalone MCQ (e.g. 4, 13)
                    if m_sub_parts:
                        target_marker = m_sub_parts[-1]
                        if target_marker in "abcdefghijklmnopqrstuvwxyz":
                            pat_sub = re.compile(rf"^\s*(?:{re.escape(raw_parent)}[:.]?\s*|[0-9]{{1,2}}[:.]?\s*)?\*?\s*\({re.escape(target_marker)}\)\s*", re.I)
                        else:
                            pat_sub = re.compile(rf"^\s*(?:{re.escape(raw_parent)}[:.]?\s*|[0-9]{{1,2}}[:.]?\s*)?(?:\([a-z]\)\s*)?\*?\s*\({re.escape(target_marker)}\)\s*", re.I)
                        
                        best_block = None
                        best_dist = 999999.0
                        q_y0_pts = (box_1000[0] / 1000.0) * ph
                        q_y1_pts = (box_1000[2] / 1000.0) * ph
                        for b in page_blocks:
                            if b[0] < 100 and pat_sub.match(b[4].strip()):
                                dist = abs(b[1] - q_y0_pts)
                                if dist < best_dist and b[1] <= q_y1_pts:
                                    best_dist = dist
                                    best_block = b
                        if best_block:
                            prev_blocks_y1 = [pb[3] for pb in page_blocks if pb[3] <= best_block[1] - 0.5 and "DO NOT WRITE" not in pb[4] and "*" not in pb[4]]
                            prev_y1_pts = max(prev_blocks_y1, default=None)
                            safe_anchor_y0 = max(prev_y1_pts + 1.5, best_block[1] - 6) if prev_y1_pts is not None else max(0, best_block[1] - 6)
                            b_y0_1000 = int(safe_anchor_y0 / ph * 1000)
                            print(f"    [SECTION A SUBPART ANCHORED] Q{raw_qnum} anchored to marker ({target_marker}) at norm={b_y0_1000} (was {box_1000[0]})", flush=True)
                            box_1000[0] = b_y0_1000
                    else:
                        # Standalone MCQ: Anchor at top-level question header (e.g. ^4\s+ or ^13\s+)
                        # Never allow ymin to snap down to prompt keywords ("Which...", "What..."),
                        # preserving diagrams, graphs, and intro sentences.
                        pat_header = re.compile(rf"^\s*(?:question\s+|q\.?\s*)?{re.escape(raw_parent)}[:.]?(?:\s+|\t)+\S", re.I)
                        pat_margin = re.compile(rf"^\s*\*?\s*{re.escape(raw_parent)}[:.]?\s*$", re.I)
                        header_block = None
                        sorted_blocks = sorted(page_blocks, key=lambda b: b[1])
                        for b in sorted_blocks:
                            if b[0] < 120 and 30 < b[1] < ph * 0.82 and b[3] < ph - 70:
                                txt_s = b[4].strip()
                                if re.search(r"total\s+for|turn\s+over|\*P\d+", txt_s, re.I):
                                    continue
                                if re.search(r"^\s*(?:question\s+|q\.?\s*)?\d{1,3}[:.]?\s+(?:cm|dm|g|mol|°|%|k?j|k?pa|v|s|m|h|min)[0-9\-–−]*\b", txt_s, re.I):
                                    continue
                                if pat_header.match(txt_s) or (pat_margin.match(txt_s) and b[0] < 80 and b[1] < ph * 0.80):
                                    header_block = b
                                    break
                        if header_block:
                            h_y0_1000 = int(max(0, header_block[1] - 8) / ph * 1000)
                            print(f"    [SECTION A STANDALONE ANCHORED] Q{raw_qnum} anchored to header at norm={h_y0_1000} (was {box_1000[0]})", flush=True)
                            box_1000[0] = h_y0_1000

                    # Ensure box_1000[2] extends past Option D and any Total line for this question
                    q_y0_pts = (box_1000[0] / 1000.0) * ph
                    opt_d_blocks = [
                        b for b in page_blocks
                        if b[1] >= q_y0_pts + 10 and re.match(r"^\s*D\b", b[4].strip(), re.I)
                    ]
                    if opt_d_blocks:
                        b_d = min(opt_d_blocks, key=lambda b: b[1])
                        d_y1_1000 = int(min(ph, b_d[3] + 8) / ph * 1000)
                        if d_y1_1000 > box_1000[2]:
                            box_1000[2] = d_y1_1000

                    # Sibling clamping for multi-part Section A MCQs (e.g. 4(a) preceding 4(b), 11(a) preceding 11(b)):
                    siblings_on_page = [
                        oq for oq in questions_list
                        if str(oq.get("parent_question") or "").strip() == raw_parent
                    ]
                    is_final_subpart_of_parent = True
                    if m_sub_parts and len(siblings_on_page) > 1:
                        cur_sub_str = m_sub_parts[-1].lower()
                        for oq in siblings_on_page:
                            if oq == q:
                                continue
                            o_raw_qnum = str(oq.get("question_number") or "").strip()
                            o_raw_sub = str(oq.get("sub_part") or "").strip()
                            o_subs = re.findall(r"\(([a-z0-9]+)\)", f"{o_raw_qnum} {o_raw_sub}".lower())
                            if not o_subs:
                                continue
                            next_cand = o_subs[-1].lower()
                            is_subseq = False
                            if cur_sub_str in ROMAN_NUMS and next_cand in ROMAN_NUMS:
                                is_subseq = ROMAN_NUMS.index(next_cand) > ROMAN_NUMS.index(cur_sub_str)
                            else:
                                is_subseq = next_cand > cur_sub_str

                            if is_subseq:
                                is_final_subpart_of_parent = False
                                next_target_marker = next_cand
                                pat_next = re.compile(rf"^\s*(?:{re.escape(raw_parent)}[:.]?\s*|[0-9]{{1,2}}[:.]?\s*)?(?:\([a-z]\)\s*)?\*?\s*\({re.escape(next_target_marker)}\)\s*", re.I)
                                for b in page_blocks:
                                    if b[0] < 120 and pat_next.match(b[4].strip()) and b[1] > q_y0_pts + 15:
                                        clamp_y1_1000 = int(max(0, b[1] - 4) / ph * 1000)
                                        box_1000[2] = min(box_1000[2], clamp_y1_1000)
                                        print(f"    [SECTION A SIBLING CLAMPED] Q{raw_qnum} clamped above ({next_target_marker}) at norm={clamp_y1_1000}", flush=True)
                                        break
                                break


                    # ONLY extend to Total line if this is the final subpart of raw_parent (or standalone parent)
                    if is_final_subpart_of_parent:
                        for b in page_blocks:
                            if b[1] >= q_y0_pts + 10:
                                m_tot_q = re.search(r"\(Total\s+(?:for\s+Question\s+(\d+)\s*=\s*)?\d+\s*marks?\)", b[4], re.I)
                                if m_tot_q:
                                    tot_q_num = m_tot_q.group(1)
                                    if tot_q_num and tot_q_num == raw_parent:
                                        tot_y1_1000 = int(min(ph, b[3] + 4) / ph * 1000)
                                        if tot_y1_1000 > box_1000[2]:
                                            box_1000[2] = tot_y1_1000
                else:
                    # Non-Section A subpart snapping & boundary logic (Section B/C & practical units):
                    page_blocks = qp_proc.doc[p_idx].get_text("blocks")
                    q_y0_pts = (box_1000[0] / 1000.0) * ph
                    q_y1_pts = (box_1000[2] / 1000.0) * ph

                    if m_sub_parts:
                        target_marker = m_sub_parts[-1]
                        cur_let = get_alpha_letter(f"{raw_qnum} {raw_sub}")
                        matching_ps = next((ps for ps in part_stems if (ps.get("letter") or ps.get("section_letter")) == cur_let), None) if cur_let else None
                        prev_sib_y0 = max((o["box_1000"][0] / 1000.0 * ph for o in questions_list if o != q and o.get("box_1000") and o["box_1000"][0] < box_1000[0] - 20), default=0)
                        min_y0_pts = (matching_ps["box_1000"][2] / 1000.0 * ph - 10) if (matching_ps and matching_ps.get("box_1000")) else max(prev_sib_y0 + 10, q_y0_pts - 250)
                        if matching_ps and q_y0_pts < min_y0_pts:
                            # Gemini coordinates hallucinated above this question's part stem
                            q_y0_pts = min_y0_pts
                            q_y1_pts = max(q_y1_pts, min_y0_pts + 150)

                        marker_pat = re.compile(rf"^\s*(?:\d{{1,2}}[:.]?\s*)?(?:\([a-z]\)\s*)?\*?\s*\({re.escape(target_marker)}\)", re.I)
                        best_block = None
                        best_dist = 999999.0
                        for b in page_blocks:
                            if b[0] < 120 and marker_pat.search(b[4].strip()):
                                if b[1] >= min_y0_pts:
                                    dist = abs(b[1] - q_y0_pts)
                                    if b[1] <= q_y1_pts or dist < 250:
                                        if dist < best_dist:
                                            best_dist = dist
                                            best_block = b
                        if best_block:
                            b_y0_1000 = int(max(0, best_block[1] - 8) / ph * 1000)
                            if abs(b_y0_1000 - box_1000[0]) > 4:
                                print(f"    [SUBPART SNAPPED TO MARKER] Q{raw_qnum} anchored to ({target_marker}) at norm={b_y0_1000} (was {box_1000[0]})", flush=True)
                                box_1000[0] = b_y0_1000
                                q_y0_pts = (box_1000[0] / 1000.0) * ph
                                if box_1000[2] <= box_1000[0]:
                                    box_1000[2] = int(min(ph, best_block[3] + 150) / ph * 1000)

                    # Sibling clamping for Section B / C and practical papers:
                    siblings_on_page = [
                        oq for oq in questions_list
                        if str(oq.get("parent_question", "")).strip() == str(raw_parent).strip()
                    ]
                    is_final_subpart_of_parent = True
                    if m_sub_parts and len(siblings_on_page) > 1:
                        cur_sub_str = m_sub_parts[-1].lower()
                        cur_alpha_let = get_alpha_letter(f"{raw_qnum} {raw_sub}")
                        for oq in siblings_on_page:
                            if oq == q:
                                continue
                            o_raw_qnum = str(oq.get("question_number") or "").strip()
                            o_raw_sub = str(oq.get("sub_part") or "").strip()
                            o_subs = re.findall(r"\(([a-z0-9]+)\)", f"{o_raw_qnum} {o_raw_sub}".lower())
                            if not o_subs:
                                continue
                            o_alpha_let = get_alpha_letter(f"{o_raw_qnum} {o_raw_sub}")
                            next_cand = o_subs[-1].lower()
                            is_subseq = False
                            next_target_marker = None

                            if cur_alpha_let and o_alpha_let:
                                if cur_alpha_let == o_alpha_let:
                                    if cur_sub_str in ROMAN_NUMS and next_cand in ROMAN_NUMS:
                                        if ROMAN_NUMS.index(next_cand) > ROMAN_NUMS.index(cur_sub_str):
                                            is_subseq = True
                                            next_target_marker = next_cand
                                elif ord(o_alpha_let) > ord(cur_alpha_let):
                                    is_subseq = True
                                    next_target_marker = o_alpha_let
                            elif cur_sub_str in ROMAN_NUMS and next_cand in ROMAN_NUMS:
                                is_subseq = ROMAN_NUMS.index(next_cand) > ROMAN_NUMS.index(cur_sub_str)
                                next_target_marker = next_cand
                            elif next_cand > cur_sub_str:
                                is_subseq = True
                                next_target_marker = next_cand

                            if is_subseq and next_target_marker:
                                is_final_subpart_of_parent = False
                                pat_next = re.compile(rf"^\s*(?:{re.escape(raw_parent)}[:.]?\s*|[0-9]{{1,2}}[:.]?\s*)?(?:\([a-z]\)\s*)?\*?\s*\({re.escape(next_target_marker)}\)\s*", re.I)
                                for b in page_blocks:
                                    if b[0] < 120 and pat_next.match(b[4].strip()) and b[1] > q_y0_pts + 15:
                                        clamp_y1_1000 = int(max(0, b[1] - 10) / ph * 1000)
                                        box_1000[2] = min(box_1000[2], clamp_y1_1000)
                                        print(f"    [SECTION B SIBLING CLAMPED] Q{raw_qnum} clamped above ({next_target_marker}) at norm={clamp_y1_1000}", flush=True)
                                        break
                                break

                    # ONLY extend to Total line if this is the final subpart of raw_parent (or standalone parent)
                    if is_final_subpart_of_parent:
                        for b in page_blocks:
                            if b[1] >= q_y0_pts + 10:
                                m_tot_q = re.search(r"\(Total\s+(?:for\s+Question\s+(\d+)\s*=\s*)?\d+\s*marks?\)", b[4], re.I)
                                if m_tot_q:
                                    tot_q_num = m_tot_q.group(1)
                                    if not tot_q_num or str(tot_q_num).strip() == str(raw_parent).strip():
                                        tot_y1_1000 = int(min(ph, b[3] + 4) / ph * 1000)
                                        if tot_y1_1000 > box_1000[2]:
                                            box_1000[2] = tot_y1_1000
                                            print(f"    [SECTION B EXTENDED TO TOTAL] Q{raw_qnum} extended to Total line at norm={tot_y1_1000}", flush=True)

                # Ensure box_1000 encloses full prompt text and trailing mark indicator
                if current_section != "A" and box_1000:
                    start_pts = (box_1000[0] / 1000.0) * ph
                    page_doc = qp_proc.doc[p_idx]
                    footer_blocks = [
                        b for b in page_doc.get_text("blocks")
                        if b[1] > ph * 0.85 and (
                            re.search(r"\*P\d+|Turn\s+over", b[4], re.I)
                            or (b[1] > ph * 0.91 and re.match(r"^\s*\d{1,2}\s*$", b[4].strip()))
                        )
                    ]
                    footer_y0 = min((b[1] for b in footer_blocks), default=ph * 0.95)

                    next_marker_pts = None
                    theory_marker_pat = re.compile(
                        r"^\s*(?:(?:\d{1,2}\s*)?\*?\s*\(([a-z])\)(?:\s*\(([ivx]{1,4})\))?|(?:\d{1,2}\s*)?\(([ivx]{1,4})\)|(?:question\s+|\*+\s*|q\.?\s*)(\d{1,2})\b|(?:\*+\s*)?(\d{1,2})\s*(?:\*?\s*\([a-z]\)|(?:\t|\.\s+|\s{2,}(?-i:[A-Z])|\s+(?-i:[A-Z])[a-z])))",
                        re.IGNORECASE
                    )
                    for b in page_doc.get_text("blocks"):
                        if b[1] >= start_pts + 15:
                            txt_c = b[4].strip()
                            if theory_marker_pat.match(txt_c) and not UNIT_OR_TIME_FILTER.search(txt_c):
                                if not raw_qnum or is_subsequent_marker(txt_c, raw_qnum):
                                    if next_marker_pts is None or b[1] < next_marker_pts:
                                        next_marker_pts = b[1]

                    boundary_y = (next_marker_pts - 10) if next_marker_pts is not None else (footer_y0 - 6)
                    clamp_boundary_1000 = int(boundary_y / ph * 1000)
                    box_1000[2] = min(box_1000[2], clamp_boundary_1000)

                    mark_indicator_pat = re.compile(r"\(\s*(\d{1,2})\s*\)")
                    sub_prompt_blocks = []
                    sub_mark_y1 = None
                    for b in page_doc.get_text("blocks"):
                        if b[1] >= start_pts - 5 and b[3] <= boundary_y + 8:
                            txt_c = b[4].strip()
                            if not txt_c or "DO NOT WRITE" in txt_c or "Turn over" in txt_c or "*" in txt_c or (b[1] > ph * 0.91 and re.match(r"^\s*\d{1,2}\s*$", txt_c)):
                                continue
                            sub_prompt_blocks.append(b)
                            m_mi = mark_indicator_pat.search(txt_c)
                            if m_mi:
                                if sub_mark_y1 is None or b[3] > sub_mark_y1:
                                    sub_mark_y1 = b[3]

                    if sub_prompt_blocks:
                        lowest_sub_text_y1 = max(b[3] for b in sub_prompt_blocks)
                        req_y1 = max(lowest_sub_text_y1 + 8, (sub_mark_y1 + 8) if sub_mark_y1 is not None else 0)
                        req_y1 = min(boundary_y, req_y1)
                        req_y1_1000 = int(req_y1 / ph * 1000)
                        if req_y1_1000 > box_1000[2]:
                            box_1000[2] = req_y1_1000

                q_y0_pts = (box_1000[0] / 1000.0) * ph

                # Authoritative parent question determination:
                if current_section != "A":
                    # Section B/C: Find the latest top-level question header that appears at or above this question
                    cur_p_int = int(current_question_context["parent_question"]) if (current_question_context.get("parent_question") and str(current_question_context["parent_question"]).isdigit()) else 0
                    authoritative_parent = None
                    for h_pnum, h_y0 in page_headers:
                        if h_y0 <= q_y0_pts + 25:
                            h_int = int(h_pnum) if h_pnum.isdigit() else 0
                            # Question numbers in Section B/C must never regress backwards or be 0!
                            if h_int >= cur_p_int and h_int >= 1:
                                authoritative_parent = h_pnum

                    # If no top-level header appeared before this question on the page,
                    # it strictly inherits the parent question from the previous page!
                    if not authoritative_parent:
                        authoritative_parent = current_question_context["parent_question"]

                    # Correct parent ID drift across page breaks:
                    m_lead = re.match(r"^\*?\s*(\d+)\s*(.*)", raw_qnum)
                    if m_lead:
                        detected_q_num = m_lead.group(1)
                        remainder = m_lead.group(2)
                        det_q_int = int(detected_q_num) if detected_q_num.isdigit() else 0

                        # When a question begins with an explicit question header (\d{1,2}) or *(\d{1,2}):
                        # NEVER allow drift correction to snap it back to an earlier question number!
                        # If detected_q_num > active_parent_q (e.g. 20 > 19, or 23 > 22):
                        # Treat it as a NEW QUESTION only if there is evidence in the page text
                        # (either in page_headers or a line starting with detected_q_num).
                        # Fix D: Only trust structural headers from detect_page_top_level_questions.
                        has_text_header = any(h[0] == detected_q_num for h in page_headers)
                        if det_q_int > cur_p_int and has_text_header:
                            authoritative_parent = detected_q_num
                            current_question_context["parent_question"] = authoritative_parent
                            current_question_context["active_sub_letter"] = None
                            active_question_stem = None
                            active_part_stem = None
                            raw_parent = authoritative_parent
                        elif authoritative_parent and detected_q_num != authoritative_parent and any(h[0] == detected_q_num for h in page_headers):
                            auth_int = int(authoritative_parent) if authoritative_parent.isdigit() else 0
                            if auth_int >= cur_p_int and auth_int >= 1:
                                authoritative_parent = detected_q_num
                                raw_parent = authoritative_parent
                        elif not has_text_header and authoritative_parent:
                            auth_int = int(authoritative_parent) if authoritative_parent.isdigit() else 0
                            if auth_int >= cur_p_int and auth_int >= 1:
                                raw_qnum = f"{authoritative_parent}{remainder}"
                                raw_parent = authoritative_parent
                    else:
                        # Only allow drift correction if an unnumbered subpart (e.g. lone '(ii)') appears with NO parent question header
                        if authoritative_parent:
                            auth_int = int(authoritative_parent) if authoritative_parent.isdigit() else 0
                            if auth_int >= cur_p_int and auth_int >= 1:
                                raw_parent = authoritative_parent
                else:
                    # Section A (MCQs strictly 1-20): NEVER apply Section B parent drift correction across page breaks!
                    authoritative_parent = None
                    m_lead = re.match(r"^(\d+)", raw_qnum) or re.match(r"^(\d+)", raw_parent)
                    if m_lead:
                        authoritative_parent = m_lead.group(1)
                    else:
                        authoritative_parent = current_question_context.get("parent_question")

                # Reset active_sub_letter and stems when transitioning to a new parent question
                if authoritative_parent and authoritative_parent != current_question_context.get("parent_question"):
                    current_question_context["active_sub_letter"] = None
                    if authoritative_parent in paper_question_stems:
                        active_question_stem = paper_question_stems[authoritative_parent]
                    elif active_question_stem and active_question_stem.get("parent_question") != authoritative_parent:
                        active_question_stem = None
                    active_part_stem = None

                full_qnum, parent_q, sub_part = resolve_hierarchical_id(
                    raw_qnum=raw_qnum,
                    raw_parent=authoritative_parent or raw_parent,
                    raw_subpart=raw_sub,
                    active_parent=authoritative_parent or current_question_context["parent_question"],
                    active_sub_letter=current_question_context["active_sub_letter"]
                )

                if parent_q:
                    if parent_q != current_question_context["parent_question"]:
                        current_question_context["active_sub_letter"] = None
                        if parent_q in paper_question_stems:
                            active_question_stem = paper_question_stems[parent_q]
                        elif active_question_stem and active_question_stem["parent_question"] != parent_q:
                            active_question_stem = None
                        active_part_stem = None
                    elif parent_q in paper_question_stems:
                        active_question_stem = paper_question_stems[parent_q]
                    current_question_context["parent_question"] = parent_q

                # Discard bare parent question if subparts exist for it on this page or next page
                if full_qnum == parent_q:
                    if current_section == "A":
                        # Section A Atomic MCQ Protection:
                        # In Section A, a question is ONLY a stem if followed by genuine letter subparts (a), (b)
                        # ON THE SAME QUESTION on the SAME page (e.g. 1(a), 1(b)).
                        # Never check next page, never discard standalone MCQs!
                        has_subparts_on_page = any(
                            other_q != q
                            and str(other_q.get("parent_question", "")).strip() == parent_q
                            and (bool(other_q.get("sub_part")) or bool(re.search(r"\([a-z]\)", str(other_q.get("question_number", "")))))
                            for other_q in questions_list
                        )
                        has_subparts_next_page = False
                    else:
                        # Theory Extended Question Protection:
                        # Top-level questions with marks (e.g. *21 with (6) or marks >= 4) have NO subparts.
                        # Never discard a top-level question as a stem if it is a scored question!
                        q_raw_text = qp_proc.doc[p_idx].get_text("text")
                        is_scored_extended = bool(re.search(rf"^\s*\*?\s*{parent_q}\b.*?(?:\(\s*[4-9]\s*\)|\b(?:6|5|4)\s*marks?\b)", q_raw_text, re.S | re.I))
                        if is_scored_extended or (q.get("marks") and q["marks"] >= 4):
                            has_subparts_on_page = False
                            has_subparts_next_page = False
                        else:
                            has_subparts_on_page = any(
                                other_q != q and str(other_q.get("parent_question", "")).strip() == parent_q and (other_q.get("sub_part") or re.search(r"\([a-z]\)", str(other_q.get("question_number", ""))))
                                for other_q in questions_list
                            )
                            has_subparts_next_page = False
                            if not has_subparts_on_page and p_idx + 1 < pages_to_process:
                                nxt_txt = qp_proc.doc[p_idx + 1].get_text()
                                # Check if next page starts with (a) before any new question header
                                m_sub_a = re.search(r"^\s*(?:Turn\s+over\s+)?\(\s*a\s*\)", nxt_txt, re.M | re.I)
                                next_top_headers = detect_page_top_level_questions(qp_proc.doc[p_idx + 1])
                                has_different_parent_header = any(h[0] != parent_q for h in next_top_headers)
                                if m_sub_a and not has_different_parent_header:
                                    has_subparts_next_page = True

                    if has_subparts_on_page or has_subparts_next_page:
                        print(f"    [STEM AS QUESTION DISCARD] Discarding bare parent Q{full_qnum} since subparts exist", flush=True)
                        if not active_question_stem or active_question_stem.get("parent_question") != parent_q:
                            bare_stem_box = [box_1000[0], 80, box_1000[2], 915]
                            stem_crop = qp_proc.crop_box(p_idx, bare_stem_box, dpi=300, clamp_horizontal=True, is_stem=True)
                            active_question_stem = {
                                "parent_question": parent_q,
                                "page_index": p_idx,
                                "summary": f"Question {parent_q} Context",
                                "box_1000": bare_stem_box,
                                "stem_img": stem_crop,
                                "subparts_seen": 0,
                                "source": "bare_parent_q"
                            }
                        continue

                # Discard bare part letter if roman numeral subparts exist for it on the same page (e.g. Q13(b) when (b)(i) is present)
                # Multi-page bare part duplicates are authoritatively purged in the paper completion pass
                m_single_sub = re.match(r"^\(([a-z])\)$", sub_part.strip(), re.IGNORECASE)
                if m_single_sub:
                    let = m_single_sub.group(1).lower()
                    if let not in ROMAN_NUMS:
                        has_roman_subparts = any(
                            other_q != q
                            and str(other_q.get("parent_question", "")).strip() == parent_q
                            and (
                                re.match(rf"^\({let}\)\([ivx]+\)", str(other_q.get("sub_part", "")).strip(), re.I)
                                or re.search(rf"\({let}\)\s*\([ivx]+\)", str(other_q.get("question_number", "")), re.I)
                            )
                            for other_q in questions_list
                        )
                        if has_roman_subparts:
                            print(f"    [PART STEM AS QUESTION DISCARD] Discarding bare part Q{full_qnum} since roman numeral subparts exist on page", flush=True)
                            continue

                # Track and correct active sub-letter: Edexcel part letters are [a-z], excluding Roman numerals (i, v, etc.)
                current_letter = get_alpha_letter(full_qnum)

                if current_letter:
                    active_sub_letter = current_question_context["active_sub_letter"]
                    if active_sub_letter and ord(current_letter) > ord(active_sub_letter):
                        # Fix C.2: Only advance the subpart letter if the new letter physically
                        # exists in the QP page text at this page index. Gemini sometimes emits
                        # a letter one step ahead of what is actually printed (e.g. (d) when the
                        # page only has (c)(iii) and (c)(iv)). If no literal '(X)' for the
                        # advancing letter appears in the page's raw text blocks, treat the
                        # advance as a Gemini artefact and retain the current active letter.
                        _page_raw_text = qp_proc.doc[p_idx].get_text()
                        _letter_present_in_page = bool(re.search(
                            rf"\({current_letter}\)", _page_raw_text, re.IGNORECASE
                        ))
                        if not _letter_present_in_page:
                            print(f"    [LETTER ADVANCE REJECTED] Gemini advanced ({active_sub_letter})->({current_letter}) for Q{parent_q} on P{p_idx+1} but '({current_letter})' not in page text. Retaining ({active_sub_letter}).", flush=True)
                            full_qnum = re.sub(rf"\({current_letter}\)", f"({active_sub_letter})", full_qnum)
                            sub_part = re.sub(rf"\({current_letter}\)", f"({active_sub_letter})", sub_part)
                            current_letter = active_sub_letter
                            current_question_context["active_sub_letter"] = current_letter
                        else:
                            # Scope isolation: Invalidate cached part stem only when transitioning strictly past the stem's section letter (e.g. 'b' -> 'c')
                            stem_let = (active_part_stem.get("letter") or active_part_stem.get("section_letter")) if active_part_stem else None
                            if active_part_stem and stem_let and ord(current_letter) > ord(stem_let):
                                print(f"    [SCOPE ISOLATION] Section transition ({active_sub_letter} -> {current_letter}) for Q{parent_q}. Invalidated part stem ({stem_let}).", flush=True)
                                active_part_stem = None
                            current_question_context["active_sub_letter"] = current_letter
                    elif active_sub_letter and (full_qnum in seen_qnums or ord(current_letter) < ord(active_sub_letter)):
                        # Correct continuation: e.g. 21(b)(ii) -> 21(c)(ii)
                        # Also corrects Section A mislabeled Roman numeral subparts:
                        # e.g. Gemini cached 10(a)(i) but active_sub_letter was advanced to "b"
                        # by the Roman-numeral page sub-letter advance, so relabel to 10(b)(i).
                        orig_letter = current_letter
                        full_qnum = re.sub(rf"\({current_letter}\)", f"({active_sub_letter})", full_qnum)
                        sub_part = re.sub(rf"\({current_letter}\)", f"({active_sub_letter})", sub_part)
                        current_letter = active_sub_letter
                        print(f"    [SUB-LETTER CORRECTION] Corrected ({orig_letter}) -> ({active_sub_letter}) in Q{parent_q} on P{p_idx+1}", flush=True)
                    else:
                        current_question_context["active_sub_letter"] = current_letter

                # If active part stem has a specific section letter that has been superseded by current_letter, clear it
                stem_let = (active_part_stem.get("letter") or active_part_stem.get("section_letter")) if active_part_stem else None
                if active_part_stem and stem_let and current_letter and ord(current_letter) > ord(stem_let):
                    print(f"    [SCOPE ISOLATION] Active part stem section ({stem_let}) superseded by question part ({current_letter}). Clearing part stem.", flush=True)
                    active_part_stem = None

                # Check if this question belongs to a part-level stem on this page.
                # Part stems ONLY apply to questions that have roman numeral subparts (e.g. 20(b)(i), 20(b)(ii)),
                # and NEVER to standalone part questions like 24(b) or 15(a)!
                has_roman_in_q = bool(re.search(r"\([ivx]+\)", full_qnum.lower())) or bool(re.search(r"\([ivx]+\)", sub_part.lower()))
                matching_part_stem = None
                if current_letter and has_roman_in_q:
                    matching_part_stem = next((ps for ps in part_stems if (ps.get("letter") or ps.get("section_letter")) == current_letter), None)
                    if matching_part_stem:
                        stem_let_match = matching_part_stem.get("letter") or matching_part_stem.get("section_letter")
                        curr_active_let = (active_part_stem.get("letter") or active_part_stem.get("section_letter")) if active_part_stem else None
                        if not active_part_stem or curr_active_let != current_letter or active_part_stem.get("page_index") != p_idx or active_part_stem.get("source") != "exact_part_stem":
                            part_stem_box = [matching_part_stem["box_1000"][0], 80, matching_part_stem["box_1000"][2], 915]
                            if current_letter == "a" and active_question_stem and active_question_stem.get("page_index") == p_idx:
                                part_stem_box[0] = min(active_question_stem["box_1000"][0], part_stem_box[0])

                            stem_crop_300 = qp_proc.crop_box(
                                p_idx,
                                part_stem_box,
                                dpi=300,
                                padding=16,
                                padding_top=16,
                                padding_bottom=16,
                                clamp_horizontal=True,
                                scan_markers=False,
                                is_stem=True
                            )
                            part_summary = matching_part_stem["summary"]
                            if current_letter == "a" and active_question_stem and active_question_stem.get("parent_question") == parent_q:
                                q_sum = active_question_stem.get("summary", "")
                                if q_sum and q_sum not in part_summary:
                                    part_summary = f"{q_sum} {part_summary}".strip()

                                if active_question_stem.get("page_index") != p_idx:
                                    stem_crop_300 = PDFProcessor.stitch_stem_and_question(
                                        stem_img=active_question_stem["stem_img"],
                                        question_img=stem_crop_300,
                                        stem_label=f"QUESTION {parent_q} STEM / SHARED CONTEXT",
                                        question_label=f"QUESTION {parent_q}({current_letter.upper()}) CONTEXT"
                                    )

                            active_part_stem = {
                                "parent_question": matching_part_stem.get("parent_question") or parent_q,
                                "section_letter": current_letter,
                                "letter": current_letter,
                                "page_index": p_idx,
                                "summary": part_summary,
                                "box_1000": part_stem_box,
                                "stem_img": stem_crop_300,
                                "subparts_seen": 0,
                                "source": "exact_part_stem"
                            }
                            print(f"    [PART STEM ACTIVATED] Q{parent_q}({current_letter}): '{active_part_stem['summary']}'", flush=True)

                        # If box_1000 included the stem at the top, adjust box_1000[0] to start below the stem
                        if box_1000[0] <= matching_part_stem["box_1000"][2]:
                            box_1000[0] = max(box_1000[0], matching_part_stem["box_1000"][2] + 2)

                # Two-Level Stem Resolution:
                # 1. Prefer matching part stem for current letter (only if question has roman subparts)
                # 2. Fall back to question-level stem for parent question
                active_stem = None
                stem_level = None
                part_stem_let = (active_part_stem.get("letter") or active_part_stem.get("section_letter")) if active_part_stem else None
                if active_part_stem and active_part_stem.get("parent_question") == parent_q and (not part_stem_let or part_stem_let == current_letter) and has_roman_in_q:
                    active_stem = active_part_stem
                    stem_level = "part"
                elif (active_question_stem and active_question_stem.get("parent_question") == parent_q) or parent_q in paper_question_stems:
                    if not active_question_stem and parent_q in paper_question_stems:
                        active_question_stem = paper_question_stems[parent_q]
                    active_stem = active_question_stem
                    stem_level = "question"

                current_question_context["last_seen_qnum"] = full_qnum
                seen_qnums.add(full_qnum)

                subtopics = q.get("subtopics") or ([q.get("subtopic")] if q.get("subtopic") else [])
                subtopic = subtopics[0] if subtopics else "General"
                canonical_topic = get_parent_topic_for_subtopic(subtopic) if subtopic and subtopic != "General" else None
                topic = canonical_topic or q.get("topic", "General Chemistry")
                depends_on_stem = q.get("depends_on_stem", False)

                # Adjust prompt box to start cleanly below active question stem if on same page
                if not active_question_stem and parent_q in paper_question_stems:
                    active_question_stem = paper_question_stems[parent_q]
                if active_question_stem and active_question_stem.get("parent_question") == parent_q and active_question_stem.get("page_index") == p_idx:
                    if bool(sub_part) or full_qnum != parent_q:
                        if current_section == "A" or not matching_part_stem:
                            if box_1000[0] <= active_question_stem["box_1000"][2]:
                                box_1000[0] = max(box_1000[0], active_question_stem["box_1000"][2] + 2)

                # In Section A, ensure subparts cleanly start at their own subpart marker (preventing sibling bleed)
                if current_section == "A" and current_letter:
                    m_pat_sub = re.compile(rf"^\s*(?:\d{{1,2}}[:.]?\s*)?\*?\s*\({current_letter}\)\s+", re.I)
                    for b in qp_proc.doc[p_idx].get_text("blocks"):
                        if b[0] < 100 and m_pat_sub.match(b[4].strip()):
                            prev_blocks_y1 = [pb[3] for pb in qp_proc.doc[p_idx].get_text("blocks") if pb[3] <= b[1] - 0.5 and "DO NOT WRITE" not in pb[4] and "*" not in pb[4]]
                            prev_y1_pts = max(prev_blocks_y1, default=None)
                            safe_anchor_y0 = max(prev_y1_pts + 1.5, b[1] - 6) if prev_y1_pts is not None else max(0, b[1] - 6)
                            marker_y0_norm = int(safe_anchor_y0 / ph * 1000)
                            box_1000[0] = marker_y0_norm
                            break

                # Question type classification:
                # Deterministic Section-State MCQ Tagging:
                # If active_section == "A" for Units 1, 2, 4, 5 (WCH11, WCH12, WCH14, WCH15):
                # Unconditionally classify EVERY item as MCQ (including subparts 1(a), 1(b), 10(b)(i), etc.).
                # In Section B / C (or practical units 3 & 6), strictly classify as theory.
                parent_int = int(parent_q) if (parent_q and parent_q.isdigit()) else 0
                if is_practical_unit:
                    is_mcq = False
                    question_type = "theory"
                    section = "B"
                elif base_unit_code in ("WCH11", "WCH12", "WCH14", "WCH15"):
                    # Any subpart belonging to a parent question before Section B (inside Section A)
                    # must strictly inherit section = "A", type = "mcq", and marks = 1.
                    # Prevent Roman numeral patterns ([ivx]+) from overriding section to "B" or type to "theory" when inside Section A.
                    if current_section == "A":
                        is_mcq = True
                        question_type = "mcq"
                        section = "A"
                    else:
                        is_mcq = False
                        question_type = "theory"
                        section = current_section
                else:
                    is_mcq = False
                    question_type = "theory"
                    section = current_section

                # Subpart Mark Resolution & Parent Total Isolation:
                # 1. Look up MS mark if mark scheme matcher is available
                ms_mark = ms_matcher.get_mark_for_question(full_qnum) if ms_matcher else None

                # 2. Parse subpart prompt lines for trailing mark indicators: re.search(r"\(\s*(\d{1,2})\s*\)\s*$", prompt_line)
                # Ensure lines ending with "(Total for Question X = Y marks)" or rubric text are excluded!
                line_mark = None
                if box_1000:
                    scale = 1000.0 if max(box_1000) > 1.0 else 1.0
                    clip_rect = pymupdf.Rect(
                        box_1000[1] / scale * pw,
                        box_1000[0] / scale * ph,
                        box_1000[3] / scale * pw,
                        box_1000[2] / scale * ph
                    )
                    prompt_txt = qp_proc.doc[p_idx].get_text("text", clip=clip_rect)
                    for l in prompt_txt.splitlines():
                        l_str = l.strip()
                        if not l_str:
                            continue
                        if re.search(r"total\s+for\s+(?:question|section)", l_str, re.I):
                            continue
                        if re.search(r"use\s+this\s+space", l_str, re.I) or re.search(r"turn\s+over", l_str, re.I):
                            continue
                        m_m = re.search(r"\(\s*(\d{1,2})\s*\)\s*$", l_str)
                        if m_m:
                            line_mark = int(m_m.group(1))

                # 3. Mark Assignment Logic:
                # Requirement 1: For any question where is_mcq == True or active_section == "A",
                # strictly force marks = 1. Never allow an individual Section A MCQ subpart to inherit a parent total.
                if current_section == "A" or is_mcq:
                    marks = 1
                elif ms_mark is not None and ms_mark > 0:
                    # Requirement 3: MS table's parsed mark value is authoritative for Theory
                    marks = ms_mark
                elif line_mark is not None:
                    marks = line_mark
                else:
                    raw_marks = q.get("marks")
                    # Requirement 2: Never default an individual subpart to parent_total_marks
                    if raw_marks is not None and isinstance(raw_marks, int) and raw_marks > 0 and not (sub_part and raw_marks > 6):
                        marks = raw_marks
                    else:
                        marks = 1

                questions_after = [other_q for other_q in questions_list if other_q != q and other_q.get("box_1000") and other_q["box_1000"][0] > box_1000[0] + 20]
                next_q_y0 = min((other_q["box_1000"][0] for other_q in questions_after), default=None)
                box_1000 = trim_prompt_box(qp_proc.doc[p_idx], box_1000, marks, question_type, next_q_y0=next_q_y0, current_qnum=full_qnum)
                q["box_1000"] = box_1000

                if not full_qnum or not box_1000:
                    continue

                clean_q_slug = sanitize_filename(full_qnum)
                session_slug = re.sub(r"[^a-zA-Z0-9]+", "", pair.get("session", "june").lower())
                var_slug = f"_{pair.get('variant', '').lower()}" if pair.get('variant') and pair.get('variant') != 'UNUSED' else ("_unused" if pair.get('variant') == 'UNUSED' else "")
                qid = f"{base_unit_code.lower()}{var_slug}_{pair['year']}_{session_slug}_q{clean_q_slug}"
                q_filename = f"{qid}.png"
                q_save_path = os.path.join(questions_out_dir, q_filename)

                # Section A Retroactive Subpart Promotion (Bug 2 fix):
                # If we are processing Q4(b) (or any lettered subpart > 'a') in Section A,
                # check whether a standalone Q4 (no subPart, same parent) was previously saved
                # from an earlier page. If so, retroactively promote Q4 → Q4(a):
                #  - Rename the saved image file from q4.png → q4a.png
                #  - Update all fields in dataset_map and paper_new_questions
                # This handles the case where Gemini cached P4 as standalone Q4 (no sub_part)
                # and P5 as Q4(b), without ever emitting a Q4(a) on either page.
                if not is_practical_unit and current_section == "A" and sub_part and m_sub_parts:
                    cur_sub_letter = m_sub_parts[-1]
                    if cur_sub_letter in "bcdefg":
                        standalone_parent_id = f"{base_unit_code.lower()}{var_slug}_{pair['year']}_{session_slug}_q{parent_q}"
                        if standalone_parent_id in dataset_map:
                            old_entry = dataset_map[standalone_parent_id]
                            # Only promote if it has no subPart (truly standalone) and same questionType
                            if not old_entry.get("subPart") and old_entry.get("questionType") == "mcq":
                                new_a_slug = sanitize_filename(f"{parent_q}a")
                                new_a_id = f"{base_unit_code.lower()}{var_slug}_{pair['year']}_{session_slug}_q{new_a_slug}"
                                new_a_filename = f"{new_a_id}.png"
                                old_img_path = os.path.join(questions_out_dir, f"{standalone_parent_id}.png")
                                new_img_path = os.path.join(questions_out_dir, new_a_filename)
                                old_ms_filename = f"{standalone_parent_id}_ms.png"
                                new_ms_filename = f"{new_a_id}_ms.png"
                                old_ms_path = os.path.join(ms_out_dir, old_ms_filename)
                                new_ms_path = os.path.join(ms_out_dir, new_ms_filename)
                                if os.path.exists(old_img_path):
                                    os.replace(old_img_path, new_img_path)
                                if os.path.exists(old_ms_path):
                                    os.replace(old_ms_path, new_ms_path)
                                    old_entry["markSchemeImagePath"] = f"/extracted/mark_schemes/{new_ms_filename}"
                                elif ms_matcher:
                                    ms_found = ms_matcher.crop_for_question(f"{parent_q}(a)", new_ms_path)
                                    if ms_found:
                                        old_entry["markSchemeImagePath"] = f"/extracted/mark_schemes/{new_ms_filename}"
                                        print(f"    [RETROACTIVE MS MATCH] Matched MS row for promoted Q{parent_q}(a)", flush=True)
                                # Update the entry in-place
                                old_entry["id"] = new_a_id
                                old_entry["questionNumber"] = f"{parent_q}(a)"
                                old_entry["subPart"] = "(a)"
                                old_entry["questionImagePath"] = f"/extracted/questions/{new_a_filename}"
                                # Re-key in dataset_map and seen_qnums
                                del dataset_map[standalone_parent_id]
                                dataset_map[new_a_id] = old_entry
                                # Update paper_new_questions entry reference
                                for i, pq_entry in enumerate(paper_new_questions):
                                    if pq_entry.get("id") == standalone_parent_id:
                                        paper_new_questions[i] = old_entry
                                        break
                                if standalone_parent_id in paper_dedup_scores:
                                    paper_dedup_scores[new_a_id] = paper_dedup_scores.pop(standalone_parent_id)
                                seen_qnums.discard(parent_q)
                                seen_qnums.add(f"{parent_q}(a)")
                                print(f"    [RETROACTIVE SUBPART PROMOTION] Renamed standalone Q{parent_q} → Q{parent_q}(a) because Q{full_qnum} found on later page", flush=True)
                                # Set active_question_stem from the old standalone crop if not already set
                                if not active_question_stem or active_question_stem.get("parent_question") != parent_q:
                                    old_img_for_stem = new_img_path
                                    stem_img_loaded = None
                                    stem_box = old_entry.get("box_1000") or [60, 80, 500, 920]

                                    # Try to crop clean stem from the previous page up to (a) if possible
                                    prev_p_idx = p_idx - 1
                                    if prev_p_idx >= 0 and prev_p_idx < len(qp_proc.doc):
                                        prev_page = qp_proc.doc[prev_p_idx]
                                        prev_ph = prev_page.rect.height
                                        raw_parent = str(parent_q)
                                        pat_header = re.compile(rf"^\s*(?:question\s+|q\.?\s*)?{re.escape(raw_parent)}[:.]?(?:\s+|\t)+\S", re.I)
                                        pat_margin = re.compile(rf"^\s*\*?\s*{re.escape(raw_parent)}[:.]?\s*$", re.I)
                                        q_y0 = None
                                        for b in sorted(prev_page.get_text("blocks"), key=lambda b: b[1]):
                                            if b[0] < 120 and 30 < b[1] < prev_ph * 0.82 and b[3] < prev_ph - 70:
                                                txt_s = b[4].strip()
                                                if re.search(r"total\s+for|turn\s+over|\*P\d+", txt_s, re.I):
                                                    continue
                                                if pat_header.match(txt_s) or (pat_margin.match(txt_s) and b[0] < 80 and b[1] < prev_ph * 0.80):
                                                    q_y0 = b[1]
                                                    break

                                        # Search for (a) marker on previous page
                                        a_y0 = None
                                        for w in prev_page.get_text("words"):
                                            if w[4] in ("(a)", "(A)"):
                                                a_y0 = w[1]
                                                break
                                        if q_y0 is not None and a_y0 is not None and a_y0 > q_y0:
                                            # Stem starts at question header and ends right before (a)
                                            stem_box_clamped = [
                                                int(max(0, q_y0 - 8) / prev_ph * 1000),
                                                70,
                                                int((a_y0 - 4) / prev_ph * 1000),
                                                940
                                            ]
                                            try:
                                                stem_img_loaded = qp_proc.crop_box(prev_p_idx, stem_box_clamped, dpi=300, is_stem=True, scan_markers=False)
                                                stem_box = stem_box_clamped
                                            except Exception:
                                                stem_img_loaded = None

                                    if stem_img_loaded is None and os.path.exists(old_img_for_stem):
                                        from PIL import Image as _PIL_Image
                                        stem_img_loaded = _PIL_Image.open(old_img_for_stem)

                                    if stem_img_loaded is not None:
                                        active_question_stem = {
                                            "parent_question": parent_q,
                                            "page_index": p_idx - 1,
                                            "summary": f"Question {parent_q} Context",
                                            "box_1000": stem_box,
                                            "stem_img": stem_img_loaded,
                                            "subparts_seen": 1,
                                            "source": "retroactive_promotion"
                                        }
                                        active_stem = active_question_stem
                                        stem_level = "question"
                                        print(f"    [RETROACTIVE STEM SET] Active question stem set to clean Q{parent_q} stem image", flush=True)

                # Compute content quality score to prevent ghost duplicates
                pw, ph = qp_proc.doc[p_idx].rect.width, qp_proc.doc[p_idx].rect.height
                scale = 1000.0 if max(box_1000) > 1.0 else 1.0
                clip_rect = pymupdf.Rect(
                    box_1000[1] / scale * pw,
                    box_1000[0] / scale * ph,
                    box_1000[3] / scale * pw,
                    box_1000[2] / scale * ph
                )
                q_text = qp_proc.doc[p_idx].get_text("text", clip=clip_rect)
                q_score = score_question_content(q_text, marks, box_1000, qnum=full_qnum)

                # Discard phantom subparts with zero words in Section B
                words_in_crop = re.findall(r"[A-Za-z]{2,}", q_text)
                if len(words_in_crop) == 0 and current_section != "A":
                    page_full_txt = qp_proc.doc[p_idx].get_text("text")
                    is_real_q = bool(re.search(rf"^\s*(?:question\s+|q\.?|\*+)?\s*{parent_q}\b", page_full_txt, re.M | re.I))
                    if is_real_q and (marks >= 4 or full_qnum == parent_q):
                        print(f"    [PHANTOM DISCARD BLOCKED] Preserving real question Q{full_qnum} with prompt on page", flush=True)
                    else:
                        print(f"    [PHANTOM DISCARD] Discarding phantom Q{full_qnum} (0 words in crop)", flush=True)
                        continue

                if qid in paper_dedup_scores:
                    existing_score = paper_dedup_scores[qid]
                    if is_mcq or current_section == "A":
                        print(f"    [DEDUP NOTE] Potential collision for Section A QID {qid} (score {q_score:.1f} vs existing {existing_score:.1f})", flush=True)
                    if q_score <= existing_score:
                        print(f"    [DEDUP DISCARD] Ghost duplicate discarded for Q{full_qnum} (score {q_score:.1f} <= {existing_score:.1f})", flush=True)
                        continue
                    else:
                        print(f"    [DEDUP OVERWRITE] Better quality prompt found for Q{full_qnum} (score {q_score:.1f} > {existing_score:.1f}). Overwriting ghost duplicate.", flush=True)

                paper_dedup_scores[qid] = q_score

                # Check if this sub-question depends on stem
                has_stem = False
                stem_summary = None

                try:
                    # Crop sub-question at 300 DPI with +40px bottom padding
                    sub_crop_300 = qp_proc.crop_box(p_idx, box_1000, dpi=300, padding=20, padding_bottom=40, clamp_horizontal=True, current_qnum=full_qnum, is_mcq=is_mcq)

                    is_same_page_stem = (active_stem is not None and active_stem.get("page_index") == p_idx)
                    is_first_subpart = (
                        active_stem is not None
                        and active_stem.get("subparts_seen", 0) == 0
                        and (stem_level == "part" or current_letter in ("a", None))
                    )

                    # Bounding box overlap suppression:
                    # If vertical intersection with stem on same page > 15% or one contains the other, suppress stitch ONLY if not first subpart
                    is_overlapping_stem = False
                    if active_stem is not None and is_same_page_stem and active_stem.get("box_1000") and not is_first_subpart:
                        overlap_ratio = PDFProcessor.calculate_vertical_overlap(active_stem["box_1000"], box_1000)
                        if overlap_ratio > 0.15:
                            is_overlapping_stem = True
                            print(f"    [OVERLAP SUPPRESSION] Vertical overlap {overlap_ratio:.1%} > 15% with stem on same page. Suppressing stitch for Q{full_qnum}.", flush=True)

                    # Duplicate stem detection:
                    # A question is ONLY a duplicate of the stem if:
                    # 1. It does NOT have its own question content extending below the stem (ymax <= stem_ymax + 40)
                    # 2. It starts at or near the top of the stem (ymin <= stem_ymin + 20)
                    # 3. Its vertical overlap with the stem is > 80%.
                    # If a question extends significantly past the stem (e.g. contains subpart prompt, options, answer lines),
                    # it is an actual sub-question (like Q7(a) or Q21(a)), NEVER a duplicate stem!
                    is_duplicate_stem = False
                    subpart_marker_present = bool(re.search(r"\([ivx]+\)", full_qnum.lower())) or bool(re.search(r"\([a-z]\)\s*\([ivx]+\)", q_text.lower()))
                    if not is_first_subpart and active_stem is not None and is_same_page_stem and active_stem.get("box_1000"):
                        s_b = active_stem["box_1000"]
                        if box_1000[2] <= s_b[2] + 40 and box_1000[0] <= s_b[0] + 20:
                            overlap_ratio = PDFProcessor.calculate_vertical_overlap(s_b, box_1000)
                            if overlap_ratio > 0.80 and not subpart_marker_present:
                                is_duplicate_stem = True
                                print(f"    [DUPLICATE STEM DISCARD] Q{full_qnum} is a duplicate of the stem box (overlap {overlap_ratio:.1%}).", flush=True)
                    appears_after_stem_if_same_page = (
                        active_stem is None
                        or not is_same_page_stem
                        or (active_stem.get("box_1000") and box_1000[0] >= active_stem["box_1000"][0] - 25)
                    )
                    should_stitch = (
                        appears_after_stem_if_same_page
                        and not is_overlapping_stem
                        and not is_duplicate_stem
                        and (depends_on_stem or (bool(sub_part) and appears_after_stem_if_same_page))
                        and active_stem is not None
                        and active_stem["parent_question"] == parent_q
                        and (not (active_stem.get("letter") or active_stem.get("section_letter")) or not current_letter or (active_stem.get("letter") or active_stem.get("section_letter")) == current_letter)
                    )
                    if current_section == "A" and (active_question_stem or parent_q in paper_question_stems) and (bool(sub_part) or full_qnum != parent_q):
                        if not active_question_stem and parent_q in paper_question_stems:
                            active_question_stem = paper_question_stems[parent_q]
                        should_stitch = True
                    elif is_practical_unit and parent_q in paper_question_stems and bool(sub_part):
                        if not active_part_stem or (active_part_stem.get("letter") or active_part_stem.get("section_letter")) == current_letter:
                            if active_stem is None:
                                active_stem = active_question_stem or paper_question_stems[parent_q]
                            should_stitch = True

                    if should_stitch:
                        has_stem = True
                        stem_obj = active_stem if active_stem is not None else active_question_stem
                        if stem_obj is None and parent_q in paper_question_stems:
                            stem_obj = paper_question_stems[parent_q]
                        stem_summary = (stem_obj or {}).get("summary", "")
                        stem_to_stitch = (active_stem or {}).get("stem_img") or (active_question_stem or {}).get("stem_img") or (paper_question_stems.get(parent_q, {})).get("stem_img")
                        if current_section == "A":
                            # Section A Multi-Part MCQ: Stitch active_question_stem above each subpart (1(a), 1(b), 1(c))
                            s_label = f"QUESTION {parent_q} CONTEXT"
                            if stem_to_stitch is not None:
                                stitched_img = PDFProcessor.stitch_stem_and_question(
                                    stem_img=stem_to_stitch,
                                    question_img=sub_crop_300,
                                    stem_label=s_label,
                                    question_label=f"QUESTION {full_qnum} ({marks} mark{'s' if marks > 1 else ''})"
                                )
                                stitched_img.save(q_save_path, "PNG", optimize=True)
                                if active_stem:
                                    active_stem["subparts_seen"] = active_stem.get("subparts_seen", 0) + 1
                                if active_question_stem and active_question_stem is not active_stem and active_question_stem.get("parent_question") == parent_q:
                                    active_question_stem["subparts_seen"] = active_question_stem.get("subparts_seen", 0) + 1
                                print(f"    -> [SECTION A STITCHED MCQ STEM] Saved Q{full_qnum} ({marks}m) with parent stem", flush=True)
                            else:
                                sub_crop_300.save(q_save_path, "PNG", optimize=True)
                                print(f"    -> Saved Q{full_qnum} ({marks}m) (stem image missing)", flush=True)
                        else:
                            # INDEPENDENT SUB-QUESTION STITCH (NO CUMULATIVE SIBLING POLLUTION):
                            # For all sub-parts (including the first subpart (a)/(a)(i)) or cross-page stems,
                            # stitch [stem] + [target subpart prompt]!
                            # sub_crop_300 contains ONLY this subpart's trimmed prompt.
                            stem_let = (stem_obj or {}).get("letter") or (stem_obj or {}).get("section_letter")
                            if stem_level == "part" and stem_let:
                                s_label = f"QUESTION {parent_q}({stem_let.upper()}) STEM / CONTEXT"
                            else:
                                s_label = f"QUESTION {parent_q} STEM / SHARED CONTEXT"
                            if stem_to_stitch is not None:
                                stitched_img = PDFProcessor.stitch_stem_and_question(
                                    stem_img=stem_to_stitch,
                                    question_img=sub_crop_300,
                                    stem_label=s_label,
                                    question_label=f"QUESTION {full_qnum} ({marks} mark{'s' if marks > 1 else ''})"
                                )
                                stitched_img.save(q_save_path, "PNG", optimize=True)
                                if active_stem:
                                    active_stem["subparts_seen"] = active_stem.get("subparts_seen", 0) + 1
                                if active_question_stem and active_question_stem is not active_stem and active_question_stem.get("parent_question") == parent_q:
                                    active_question_stem["subparts_seen"] = active_question_stem.get("subparts_seen", 0) + 1
                                print(f"    -> [INDEPENDENT STITCHED STEM] Saved Q{full_qnum} ({marks}m) with stem (subparts seen: {(stem_obj or {}).get('subparts_seen', 1)})", flush=True)
                            else:
                                sub_crop_300.save(q_save_path, "PNG", optimize=True)
                                print(f"    -> Saved Q{full_qnum} ({marks}m) (stem image missing)", flush=True)
                    else:
                        # Dependent Context Stitching:
                        # For chained questions referencing prior values (e.g. Q18(b)(iv) referencing (iii) or 'Clip with (b)(iii)')
                        prev_sub = recent_subparts_by_parent.get(parent_q)
                        is_prereq_ref = False
                        if prev_sub and prev_sub["qnum"] != full_qnum:
                            ref_pat = r"(?:in|from|using|your answer to|with reference to|refer to|clip with)\s+(?:part\s+)?(?:\([a-z]\))?\([ivx]+\)|" + re.escape(prev_sub["qnum"])
                            if re.search(ref_pat, q_text, re.I):
                                is_prereq_ref = True
                            elif re.search(r"\(iv\)", full_qnum) and re.search(r"\(iii\)", prev_sub["qnum"]) and re.search(r"answer|volume|mass|value|yield|moles|gas", q_text, re.I):
                                is_prereq_ref = True

                        if is_prereq_ref and prev_sub:
                            stitched_prereq = PDFProcessor.stitch_stem_and_question(
                                stem_img=prev_sub["crop"],
                                question_img=sub_crop_300,
                                stem_label=f"PREREQUISITE REFERENCE: QUESTION {prev_sub['qnum']}",
                                question_label=f"QUESTION {full_qnum} ({marks} marks)"
                            )
                            stitched_prereq.save(q_save_path, "PNG", optimize=True)
                            has_stem = True
                            stem_summary = f"Prerequisite reference context from Question {prev_sub['qnum']}"
                            print(f"    -> [PREREQUISITE STITCH] Saved Q{full_qnum} with context from Q{prev_sub['qnum']}", flush=True)
                        else:
                            sub_crop_300.save(q_save_path, "PNG", optimize=True)
                            print(f"    -> Saved Q{full_qnum} ({marks}m)", flush=True)

                        if active_question_stem and active_question_stem.get("parent_question") == parent_q:
                            active_question_stem["subparts_seen"] = active_question_stem.get("subparts_seen", 0) + 1
                        if active_part_stem and active_part_stem.get("parent_question") == parent_q:
                            active_part_stem["subparts_seen"] = active_part_stem.get("subparts_seen", 0) + 1

                    # Update recent_subparts_by_parent for prerequisite chaining
                    recent_subparts_by_parent[parent_q] = {
                        "qnum": full_qnum,
                        "crop": sub_crop_300,
                        "page_index": p_idx
                    }
                except Exception as e:
                    print(f"    Error saving question image for Q{full_qnum}: {e}", flush=True)
                    continue

                # Crop matching Mark Scheme image with strict terminal matching
                ms_filename = f"{qid}_ms.png"
                ms_save_path = os.path.join(ms_out_dir, ms_filename)
                ms_found = False

                if ms_matcher:
                    ms_found = ms_matcher.crop_for_question(full_qnum, ms_save_path)
                    ms_mark = ms_matcher.get_mark_for_question(full_qnum)
                    if ms_mark is not None and ms_mark > 0:
                        if current_section == "A" or is_mcq:
                            marks = 1
                        else:
                            marks = ms_mark
                    if ms_found:
                        print(f"       + Matched MS row for Q{full_qnum} ({marks}m)", flush=True)
                    else:
                        print(f"       - MS row not found for Q{full_qnum}", flush=True)

                q_entry = {
                    "id": qid,
                    "paperId": paper_id,
                    "unit": unit_name,
                    "unitCode": unit_code,
                    "paperCode": paper_code,
                    "paper_code": paper_code,
                    "year": pair["year"],
                    "session": pair.get("session", "June"),
                    "series": series_name,
                    "questionNumber": full_qnum,
                    "parentQuestion": parent_q,
                    "subPart": sub_part,
                    "marks": marks,
                    "topic": topic,
                    "subtopic": subtopic,
                    "subtopics": subtopics,
                    "section": section,
                    "question_type": question_type,
                    "questionType": question_type,
                    "hasStem": has_stem,
                    "stemSummary": stem_summary,
                    "questionImagePath": f"/extracted/questions/{q_filename}",
                    "markSchemeImagePath": f"/extracted/mark_schemes/{ms_filename}" if ms_found else None
                }

                # Update dataset_map and paper_new_questions
                dataset_map[qid] = q_entry
                paper_new_questions.append(q_entry)

        qp_proc.close()

        # Ghost Purge Pass:
        # Guarantee no bare parent questions (e.g. Q16 or Q3) or bare part questions (e.g. Q13(b))
        # are emitted into the dataset if child subparts exist in the paper!
        subparts_by_parent: Dict[str, List[str]] = {}
        subparts_by_parent_and_type: Dict[tuple[str, str], List[str]] = {}
        for q in paper_new_questions:
            pq = str(q.get("parentQuestion") or "").strip()
            sub = str(q.get("subPart") or "").strip()
            qtype = str(q.get("questionType") or "theory").strip()
            if pq and sub:
                subparts_by_parent.setdefault(pq, []).append(sub)
                subparts_by_parent_and_type.setdefault((pq, qtype), []).append(sub)

        # Aliases for backwards compatibility
        all_subparts_by_parent = subparts_by_parent
        all_subparts_by_parent_and_type = subparts_by_parent_and_type

        purged_questions: List[Dict[str, Any]] = []
        for q_item in paper_new_questions:
            qn = str(q_item.get("questionNumber") or "").strip()
            pq = str(q_item.get("parentQuestion") or "").strip()
            sub = str(q_item.get("subPart") or "").strip()
            qtype = str(q_item.get("questionType") or "theory").strip()
            qid = q_item["id"]

            # 1. Bare parent question (e.g. Q16 or Q3):
            if qn == pq and (pq, qtype) in subparts_by_parent_and_type:
                child_subs = [s for s in subparts_by_parent_and_type[(pq, qtype)] if s]
                if child_subs:
                    print(f"    [POST-PROCESS PURGE] Discarding bare parent Q{qn} ({qid}) because child subparts {child_subs} exist", flush=True)
                    img_path = os.path.join(questions_out_dir, f"{qid}.png")
                    if os.path.exists(img_path):
                        try:
                            os.remove(img_path)
                        except OSError:
                            pass
                    dataset_map.pop(qid, None)
                    continue

            # 2. Bare part question (e.g. Q13(b)):
            if q_item.get("questionType") != "mcq" and q_item.get("question_type") != "mcq":
                m_single_letter = re.match(r"^\(([a-z])\)$", sub, re.IGNORECASE)
                if m_single_letter and pq in subparts_by_parent:
                    let = m_single_letter.group(1).lower()
                    child_romans = [
                        s for s in subparts_by_parent[pq]
                        if re.match(rf"^\({let}\)\([ivx]+\)", s, re.IGNORECASE)
                    ]
                    if child_romans:
                        print(f"    [POST-PROCESS PURGE] Discarding bare part Q{qn} ({qid}) because roman subparts {child_romans} exist", flush=True)
                        img_path = os.path.join(questions_out_dir, f"{qid}.png")
                        if os.path.exists(img_path):
                            try:
                                os.remove(img_path)
                            except OSError:
                                pass
                        dataset_map.pop(qid, None)
                        continue

            purged_questions.append(q_item)

        paper_new_questions = purged_questions

        # Parent question linking pass:
        # Group all questions in this paper by parentQuestion to compute parent_question_id and all_subparts
        subparts_by_parent: Dict[str, List[str]] = {}
        for q_item in paper_new_questions:
            pq = str(q_item.get("parentQuestion") or "").strip()
            qn = str(q_item.get("questionNumber") or "").strip()
            if pq:
                if pq not in subparts_by_parent:
                    subparts_by_parent[pq] = []
                subparts_by_parent[pq].append(f"Q{qn}")

        # Canonical season normalization
        raw_sess = str(pair.get("session", "June")).lower()
        if "jan" in raw_sess:
            canonical_season = "January"
        elif "oct" in raw_sess or "nov" in raw_sess:
            canonical_season = "October"
        else:
            canonical_season = "May/June"

        for q_item in paper_new_questions:
            pq = str(q_item.get("parentQuestion") or "").strip()
            q_item["parent_question_id"] = f"Q{pq}" if pq else f"Q{q_item['questionNumber']}"
            q_item["all_subparts"] = subparts_by_parent.get(pq, [f"Q{q_item['questionNumber']}"])
            q_item["session"] = canonical_season
            dataset_map[q_item["id"]] = q_item

        if is_practical_unit:
            total_marks = sum(q_item.get("marks", 0) for q_item in paper_new_questions)
            theory_count = sum(1 for q_item in paper_new_questions if q_item.get("questionType") == "theory")
            print(f"    [PRACTICAL UNIT CHECK] {paper_id}: {len(paper_new_questions)} questions ({theory_count} theory), total marks = {total_marks} (expected 50)", flush=True)
            if total_marks == 50 and theory_count == len(paper_new_questions):
                print(f"    [PRACTICAL UNIT VALIDATION PASSED] Total marks == 50 and 100% theory classification.", flush=True)
            else:
                print(f"    [PRACTICAL UNIT VALIDATION WARNING] Total marks = {total_marks} (expected 50), theory = {theory_count}/{len(paper_new_questions)}.", flush=True)

        # Checkpoint: Save dataset.json immediately after each paper completes
        final_list = list(dataset_map.values())
        with open(dataset_out_path, "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=2)
        with open(root_dataset_path, "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=2)

        # Register completed paper in manifest
        paper_qids = [item["id"] for item in paper_new_questions]
        manifest_mgr.record_completed_paper(pair, paper_qids)

        print(f">>> [CHECKPOINT SAVED] {paper_id} finished: {len(paper_qids)} questions. Dataset now has {len(dataset_map)} total questions.", flush=True)

    print("\n" + "=" * 65, flush=True)
    print(f"Batch ingestion complete! Total unique questions in dataset: {len(dataset_map)}", flush=True)
    print(f"Saved dataset: {dataset_out_path}", flush=True)
    print(f"Saved manifest: {manifest_path}", flush=True)
    print("=" * 65, flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Edexcel IAL Chemistry Topical Past Paper Extractor & Batch Ingestion Pipeline")
    parser.add_argument("--all", action="store_true", help="Scan and process all series across papers/")
    parser.add_argument("--papers-dir", default="papers", help="Directory containing past paper series or sample PDFs")
    parser.add_argument("--output-dir", default="frontend/public", help="Output directory for assets and dataset")
    parser.add_argument("--manifest", default="pipeline_manifest.json", help="Path to checkpointing pipeline manifest JSON")
    parser.add_argument("--unit", default=None, help="Filter by unit code or number (e.g. WCH11 or 1)")
    parser.add_argument("--series", default=None, help="Filter by series name or folder (e.g. '2026 Jan' or '2026 January')")
    parser.add_argument("--max-papers", type=int, default=None, help="Limit number of papers to process")
    parser.add_argument("--max-pages", type=int, default=None, help="Maximum pages to process per paper (for testing)")
    parser.add_argument("--dry-run", action="store_true", help="Preview discovered pairs and skipping status without extracting")
    parser.add_argument("--force", action="store_true", help="Force re-extraction even if already completed in manifest")

    args = parser.parse_args()
    run_extraction(
        papers_dir=args.papers_dir,
        output_dir=args.output_dir,
        manifest_path=args.manifest,
        unit_filter=args.unit,
        series_filter=args.series,
        max_papers=args.max_papers,
        max_pages=args.max_pages,
        dry_run=args.dry_run,
        force=args.force,
        process_all=args.all
    )
