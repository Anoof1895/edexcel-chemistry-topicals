"""
Master Extraction Pipeline for Edexcel IAL Mathematics (WMA11–WMA14, WME01, WST01):
- Document-Level Question Paper Parser:
  * Whole-question level extraction (Q1..Q11; 0 MCQs; questionType: "theory", section: "A")
  * Answer Book cutoff: Automatically stops scanning before the Answer Book (e.g. at 'TOTAL FOR PAPER IS 75 MARKS' or 'Answer Book' + 'Paper reference')
  * Ruled line stripping: Cuts off question crop at the end of question content, stripping student answer spaces
  * Continued page handling: Seamlessly crops and stitches diagrams/tables to complete from 'Question N continued' pages, while skipping empty lined pages
  * Mark extraction: Extracts total question marks from '(Total for Question N is X marks)' or mark scheme
  * Topic classification: Classifies questions strictly into Pearson Edexcel IAL Mathematics syllabus topics using Gemini cascade pool and heuristics
- Strict isolation:
  * Inputs: papers_math/
  * Crops: crops_math/questions/ and crops_math/mark_schemes/
  * Dataset: dataset_math.json (and sync to frontend/public/dataset_math.json)
  * Manifest: pipeline_manifest_math.json
  * Cache: .cache/gemini_math/
  * Chemistry and Physics datasets and crops are never modified!
"""

import os
import re
import sys
import json
import time
import shutil
import argparse
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image
import pymupdf

from pipeline.pdf_processor import PDFProcessor
from pipeline.ms_matcher_math import (
    MSMatcherMath,
    trim_vertical_whitespace,
    stitch_slices_seamlessly,
    safe_save_image
)
from pipeline.syllabus_math import (
    get_math_unit_from_code,
    get_expected_paper_marks,
    get_math_parent_topic_for_subtopic,
    get_all_math_subtopics_for_unit,
    get_math_syllabus_for_unit,
    get_math_unit_full_title
)
from pipeline.batch_scanner_math import scan_math_papers_directory, compute_file_hash
from pipeline.manifest import ManifestManager
from pipeline.gemini_extractor_math import GeminiMathExtractor

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def get_qp_cutoff_page(doc: pymupdf.Document) -> int:
    """
    Finds the last valid question page before the student Answer Book or formula sheet.
    Cutoff triggers:
    - 'TOTAL FOR PAPER IS 75 MARKS' / 'TOTAL FOR PAPER = 75 MARKS'
    - 'Answer Book' + 'Paper reference' after page 1
    """
    for p_idx in range(len(doc)):
        txt = doc[p_idx].get_text()
        if re.search(r"TOTAL\s+FOR\s+PAPER\s*(?:IS|=)\s*75\s*MARKS?", txt, re.I):
            return p_idx + 1
        if p_idx > 1 and "answer book" in txt.lower() and "paper reference" in txt.lower():
            return p_idx
        if p_idx > 1 and "candidate surname" in txt.lower() and "centre number" in txt.lower():
            return p_idx
    return len(doc)


def discover_qp_questions(doc: pymupdf.Document, max_page: int) -> List[Tuple[int, int, float]]:
    """
    Scans pages 1 to max_page for question headers ('1.', '2.', ..., '15.').
    Supports modern and legacy layouts (e.g. 'blank 1.', '1\t', etc.) with strict sequential ordering.
    Returns a sorted list of (q_num, page_index, y0_points).
    """
    q_pat = re.compile(r"^(?:(?:leave\s+)?blank\s*)?([1-9]|1[0-5])(?:[\.\:\)]|\s*$|\t)", re.I)
    discovered: List[Tuple[int, int, float]] = []

    for p_idx in range(1, max_page):
        page = doc[p_idx]
        blocks = page.get_text("blocks")
        for b in blocks:
            if b[0] < 75 and 40 < b[1] < 750:
                txt = b[4].strip()
                m = q_pat.match(txt)
                if m:
                    q_num = int(m.group(1))
                    expected_next = discovered[-1][0] + 1 if discovered else 1
                    if q_num == expected_next:
                        discovered.append((q_num, p_idx, b[1]))
    return discovered


def crop_qp_question(
    doc: pymupdf.Document,
    p_idx: int,
    y0: float,
    next_p_idx: Optional[int],
    next_y0: Optional[float],
    max_page: int,
    prev_q_y1: Optional[float] = None
) -> Tuple[Image.Image, float]:
    """
    Crops the question content at 300 DPI, stripping ruled blank lines.
    Seamlessly stitches any diagram/content from subsequent 'Question N continued' pages.
    Returns (cropped_image, bottom_y1_on_start_page).
    """
    page = doc[p_idx]
    pw, ph = page.rect.width, page.rect.height
    pix = page.get_pixmap(dpi=300)
    scale = pix.height / ph

    # Fix A: Establish min_y_limit and scan for tall math, drawings, or labels above y0
    min_y_limit = (prev_q_y1 + 2.0) if prev_q_y1 is not None else 40.0
    candidate_y0s = [y0]

    for b in page.get_text("blocks"):
        if b[1] >= min_y_limit and b[1] <= y0 + 25.0:
            txt = b[4].strip()
            if "DO NOT WRITE" not in txt and "*P" not in txt and not re.match(r"^\d{1,3}$", txt):
                candidate_y0s.append(b[1])

    for d in page.get_drawings():
        r = d["rect"]
        if r.y0 >= min_y_limit and r.y1 <= y0 + 25.0:
            if r.width < pw - 60 or r.y0 > min_y_limit + 4.0:
                candidate_y0s.append(r.y0)

    computed_y0 = min(candidate_y0s) - 12.0
    actual_y0 = max(min_y_limit, computed_y0)

    # Case A: Next question is on the SAME page (compact / Variant A layout)
    if next_p_idx == p_idx and next_y0 is not None:
        q_blocks = [
            b[3] for b in page.get_text("blocks")
            if b[1] >= actual_y0 - 2.0 and b[3] <= next_y0 - 10.0 and "DO NOT WRITE" not in b[4] and "*P" not in b[4]
        ]
        last_q_y1 = max(q_blocks) if q_blocks else actual_y0 + 20.0
        div_lines = [
            d["rect"].y1 for d in page.get_drawings()
            if last_q_y1 - 6.0 <= d["rect"].y0 <= next_y0 - 8.0 and d["rect"].width > 200
        ]
        y1 = (max(div_lines) + 2.0) if div_lines else min(next_y0 - 4.0, last_q_y1 + 8.0)
        crop = _pix_crop(pix, 25.0, actual_y0, pw - 25.0, y1, scale)
        return trim_vertical_whitespace(crop), y1

    # Case B: Standard page layout: scan for the start of blank lines (Fix B)
    blocks = page.get_text("blocks")
    content_bottoms = [actual_y0 + 30.0]
    ruled_starts = []

    for b in blocks:
        if b[1] >= actual_y0 - 2.0 and b[3] <= ph - 40.0:
            txt = b[4].strip()
            if re.search(r"_{6,}", txt):
                ruled_starts.append(b[1])
                continue
            if "DO NOT WRITE" not in txt and "*P" not in txt and not re.match(r"^\d{1,3}$", txt):
                content_bottoms.append(b[3])

    for d in page.get_drawings():
        r = d["rect"]
        if r.y0 >= actual_y0 - 2.0 and r.y1 <= max(content_bottoms) + 50.0 and r.y1 <= ph - 40.0:
            content_bottoms.append(r.y1)

    last_content_y1 = max(content_bottoms)
    first_ruled_y = min(ruled_starts) if ruled_starts else ph - 40.0

    if first_ruled_y > last_content_y1 + 8.0:
        y1 = min(ph - 40.0, min(first_ruled_y - 2.0, last_content_y1 + 10.0))
    else:
        y1 = min(ph - 40.0, last_content_y1 + 10.0)

    main_crop = trim_vertical_whitespace(_pix_crop(pix, 25.0, actual_y0, pw - 25.0, y1, scale))

    # Inspect subsequent continued pages between p_idx + 1 and limit_page (Fix C)
    limit_p = next_p_idx if next_p_idx is not None else max_page
    extra_slices: List[Image.Image] = []

    for mid_p in range(p_idx + 1, limit_p):
        mid_page = doc[mid_p]
        mid_txt = mid_page.get_text()

        # Exclude spare redraw grids
        if re.search(r"only\s+use\s+this\s+(?:grid|copy)\s+if\s+you\s+need\s+to\s+redraw", mid_txt, re.I):
            continue

        mid_pw, mid_ph = mid_page.rect.width, mid_page.rect.height
        mid_blocks = mid_page.get_text("blocks")

        ruled_bottoms = [b[3] for b in mid_blocks if re.search(r"_{6,}", b[4])]
        last_ruled_y = max(ruled_bottoms) if ruled_bottoms else 0.0
        first_ruled_y_mid = min([b[1] for b in mid_blocks if re.search(r"_{6,}", b[4])]) if ruled_bottoms else mid_ph

        diag_y0s: List[float] = []
        diag_y1s: List[float] = []

        # Candidate Option 1: Diagram is below ruled lines (e.g. S1 Q1 box plot grid)
        for b in mid_blocks:
            txt = b[4].strip()
            if "DO NOT WRITE" in txt or "*P" in txt or re.match(r"^\d{1,3}$", txt) or re.search(r"_{6,}", txt):
                continue
            if "continued" in txt.lower() or "total for question" in txt.lower() or "turn over" in txt.lower() or "spare grid" in txt.lower():
                continue
            if b[1] >= last_ruled_y and b[3] <= mid_ph - 40.0:
                diag_y0s.append(b[1])
                diag_y1s.append(b[3])

        for d in mid_page.get_drawings():
            r = d["rect"]
            if r.y0 >= last_ruled_y and r.y1 <= mid_ph - 40.0:
                if r.width > 20 and r.height > 5:
                    diag_y0s.append(r.y0)
                    diag_y1s.append(r.y1)

        # Candidate Option 2: Diagram is above ruled lines (at the top of the continued page)
        if not (diag_y0s and diag_y1s) and ruled_bottoms:
            for b in mid_blocks:
                txt = b[4].strip()
                if "DO NOT WRITE" in txt or "*P" in txt or re.match(r"^\d{1,3}$", txt) or re.search(r"_{6,}", txt):
                    continue
                if "continued" in txt.lower() or "total for question" in txt.lower() or "turn over" in txt.lower() or "spare grid" in txt.lower():
                    continue
                if b[3] <= first_ruled_y_mid and b[1] >= 40.0:
                    diag_y0s.append(b[1])
                    diag_y1s.append(b[3])

            for d in mid_page.get_drawings():
                r = d["rect"]
                if r.y1 <= first_ruled_y_mid and r.y0 >= 40.0:
                    if r.width > 20 and r.height > 5:
                        diag_y0s.append(r.y0)
                        diag_y1s.append(r.y1)

        # Candidate Option 3: Full page diagram (no ruled lines)
        if not (diag_y0s and diag_y1s) and not ruled_bottoms:
            for b in mid_blocks:
                txt = b[4].strip()
                if "DO NOT WRITE" in txt or "*P" in txt or re.match(r"^\d{1,3}$", txt):
                    continue
                if "continued" in txt.lower() or "total for question" in txt.lower():
                    continue
                if 40.0 <= b[1] and b[3] <= mid_ph - 40.0:
                    diag_y0s.append(b[1])
                    diag_y1s.append(b[3])

            for d in mid_page.get_drawings():
                r = d["rect"]
                if 40.0 <= r.y0 and r.y1 <= mid_ph - 40.0:
                    if r.width > 20 and r.height > 5:
                        diag_y0s.append(r.y0)
                        diag_y1s.append(r.y1)

        if diag_y0s and diag_y1s:
            d_y0 = max(40.0, min(diag_y0s) - 8.0)
            d_y1 = min(mid_ph - 40.0, max(diag_y1s) + 8.0)
            if d_y1 > d_y0 + 25.0:
                mid_pix = mid_page.get_pixmap(dpi=300)
                mid_scale = mid_pix.height / mid_ph
                cont_crop = trim_vertical_whitespace(
                    _pix_crop(mid_pix, 25.0, d_y0, mid_pw - 25.0, d_y1, mid_scale)
                )
                if cont_crop.height > 30:
                    extra_slices.append(cont_crop)

    result = main_crop
    for extra in extra_slices:
        result = stitch_slices_seamlessly(result, extra)
    return result, y1


def _pix_crop(pix: pymupdf.Pixmap, x0: float, y0: float, x1: float, y1: float, scale: float) -> Image.Image:
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    x0_px = int(max(0, x0 * scale))
    y0_px = int(max(0, y0 * scale))
    x1_px = int(min(img.width, x1 * scale))
    y1_px = int(min(img.height, y1 * scale))
    return img.crop((x0_px, y0_px, x1_px, y1_px))


def extract_math_paper(
    paper_info: Dict[str, Any],
    gemini_extractor: GeminiMathExtractor,
    crops_q_dir: str = "crops_math/questions",
    crops_ms_dir: str = "crops_math/mark_schemes",
    dry_run: bool = False
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Extracts all whole questions from a single Mathematics paper pair.
    Returns (questions_list, paper_summary_dict).
    """
    paper_id = paper_info["paper_id"]
    unit_code = paper_info["unit_code"]
    base_unit = paper_info["base_unit_code"]
    unit_title = get_math_unit_full_title(base_unit)
    paper_code = paper_info.get("paper_code", f"{base_unit}/01")
    year = paper_info["year"]
    session = paper_info["session"]
    series = paper_info["series"]
    variant = paper_info.get("variant", "")
    que_path = paper_info["que_path"]
    rms_path = paper_info["rms_path"]

    doc_qp = pymupdf.open(que_path)
    cutoff_page = get_qp_cutoff_page(doc_qp)
    discovered_qs = discover_qp_questions(doc_qp, cutoff_page)
    full_doc_text = "\n".join([doc_qp[i].get_text() for i in range(len(doc_qp))])

    if not discovered_qs:
        print(f"  [ERROR] No questions discovered in QP: {que_path}")
        return [], {}

    # Initialize Mark Scheme Matcher
    ms_proc = PDFProcessor(rms_path)
    ms_matcher = MSMatcherMath(ms_proc, paper_id)

    # First pass: gather question texts, total marks, and crops
    extracted_items = []
    num_qs = len(discovered_qs)
    last_qp_y1_by_page: Dict[int, float] = {}

    for idx, (q_num, p_idx, y0) in enumerate(discovered_qs):
        has_next = (idx + 1 < num_qs)
        next_q_num, next_p_idx, next_y0 = discovered_qs[idx + 1] if has_next else (None, None, None)

        q_id = f"{paper_id}_q{q_num}"
        q_label = f"Q{q_num}"

        prev_y1 = last_qp_y1_by_page.get(p_idx)

        # Crop Question Paper image
        if not dry_run:
            q_img, q_bot_y = crop_qp_question(doc_qp, p_idx, y0, next_p_idx, next_y0, cutoff_page, prev_q_y1=prev_y1)
            last_qp_y1_by_page[p_idx] = q_bot_y
            q_img_rel = f"crops_math/questions/{q_id}.png"
            q_img_path = os.path.join(crops_q_dir, f"{q_id}.png")
            safe_save_image(q_img, q_img_path)
        else:
            q_img = None
            q_img_rel = f"crops_math/questions/{q_id}.png"

        # Crop Mark Scheme image
        ms_img_rel = f"crops_math/mark_schemes/{q_id}_ms.png"
        ms_img_path = os.path.join(crops_ms_dir, f"{q_id}_ms.png")
        ms_found = False
        if not dry_run:
            ms_found = ms_matcher.crop_for_question(q_num, ms_img_path)
        else:
            ms_found = ms_matcher.has_question(q_num)

        # Extract text for this question
        limit_p = max(p_idx + 1, next_p_idx) if next_p_idx is not None else cutoff_page
        q_text_parts = []
        for check_p in range(p_idx, limit_p):
            page_obj = doc_qp[check_p]
            p_txt = page_obj.get_text()
            for line in p_txt.splitlines():
                line_str = line.strip()
                if "DO NOT WRITE" in line_str or "*P" in line_str or re.match(r"^\d{1,3}$", line_str):
                    continue
                if line_str.startswith("___"):
                    continue
                q_text_parts.append(line_str)
        full_text = "\n".join(q_text_parts).strip()

        # Extract total marks for this question
        # 1. Look for explicit '(Total for Question {q_num} is X marks)' in doc_qp
        marks: Optional[int] = None
        m_exp = re.findall(rf"\(Total\s+for\s+Question\s+{q_num}\s+is\s+(\d{{1,2}})\s*marks?\)", full_doc_text, re.I)
        if m_exp:
            marks = int(m_exp[-1])
        else:
            # 2. Look for '(Total for Question N is X marks)' or '(Total X marks)' in this question's text
            m_qp = re.findall(rf"\(Total\s+(?:for\s+Question\s+{q_num}\s+is\s+)?(\d{{1,2}})\s*marks?\)", full_text, re.I)
            if m_qp:
                marks = int(m_qp[-1])
            else:
                m_tot = re.findall(r"\(Total\s+(\d{1,2})\s*marks?\)", full_text, re.I)
                if m_tot:
                    marks = int(m_tot[-1])
                else:
                    # 3. Fallback to Mark Scheme matcher
                    ms_mark = ms_matcher.get_mark_for_question(q_num)
                    marks = ms_mark if ms_mark else 0

        extracted_items.append({
            "id": q_id,
            "q_num": q_num,
            "q_label": q_label,
            "text": full_text,
            "marks": marks,
            "image": q_img,
            "image_path": q_img_rel,
            "ms_path": ms_img_rel,
            "ms_found": ms_found
        })

    # Second pass: Topic and subtopic classification via Gemini cascade
    classified_results = gemini_extractor.classify_questions(
        extracted_items,
        target_unit_code=base_unit
    )

    class_by_id = {c["id"]: c for c in classified_results if "id" in c}

    final_questions = []
    total_marks_found = 0

    for item in extracted_items:
        q_id = item["id"]
        q_num = item["q_num"]
        c_info = class_by_id.get(q_id, {})

        topic = c_info.get("topic", "")
        subtopic = c_info.get("subtopic", "")
        subtopics = c_info.get("subtopics", [subtopic] if subtopic else [])
        if not topic and subtopic:
            topic = get_math_parent_topic_for_subtopic(subtopic)

        marks_val = item["marks"]
        total_marks_found += marks_val

        q_filename = f"{q_id}.png"
        ms_filename = f"{q_id}_ms.png"
        ms_found_val = item.get("ms_found", False)

        record = {
            "id": q_id,
            "paperId": paper_id,
            "paper_id": paper_id,
            "unit": unit_title,
            "unit_name": unit_title,
            "unitCode": base_unit,
            "paperCode": paper_code,
            "paper_code": paper_code,
            "year": int(year),
            "session": str(session or "January"),
            "series": f"{session} {year}" if session and year else str(series or f"{year} {session}"),
            "variant": str(variant or ""),
            "questionNumber": str(q_num),
            "question_number": int(q_num),
            "parentQuestion": str(q_num),
            "parent_question_id": f"Q{q_num}",
            "subPart": "",
            "all_subparts": [f"Q{q_num}"],
            "marks": int(marks_val),
            "topic": str(topic or "General Mathematics"),
            "subtopic": str(subtopic or "General Mathematics"),
            "subtopics": list(subtopics or ([subtopic] if subtopic else ["General Mathematics"])),
            "section": "",
            "question_type": "theory",
            "questionType": "theory",
            "hasStem": False,
            "stemSummary": None,
            "questionImagePath": f"/crops_math/questions/{q_filename}",
            "markSchemeImagePath": f"/crops_math/mark_schemes/{ms_filename}" if ms_found_val else None,
            "answer": None,
            "correct_answer": None,
            "correctAnswer": None,
            "image": item["image_path"],
            "mark_scheme_image": item["ms_path"] if ms_found_val else None,
            "text": item["text"]
        }
        final_questions.append(record)

    expected_marks = get_expected_paper_marks(base_unit)
    summary = {
        "paper_id": paper_id,
        "questions_count": len(final_questions),
        "total_marks": total_marks_found,
        "expected_marks": expected_marks,
        "marks_match": (total_marks_found == expected_marks)
    }

    return final_questions, summary


def main():
    parser = argparse.ArgumentParser(description="Edexcel IAL Mathematics Pipeline Extractor")
    parser.add_argument("--all", action="store_true", help="Process all available Mathematics paper pairs")
    parser.add_argument("--unit", type=str, default="", help="Filter by unit code (e.g. WMA11, WMA12, WMA13, WMA14, WME01, WST01)")
    parser.add_argument("--series", type=str, default="", help="Filter by series (e.g. 2026 Jan, 2025 June)")
    parser.add_argument("--paper", type=str, default="", help="Filter by paper_id (e.g. wma11_2026_january)")
    parser.add_argument("--max-papers", type=int, default=0, help="Maximum number of papers to extract")
    parser.add_argument("--dry-run", action="store_true", help="Preview extraction without saving images or updating dataset")
    parser.add_argument("--force", action="store_true", help="Force re-extraction of papers already marked complete")
    args = parser.parse_args()

    # Paths
    dataset_path = "dataset_math.json"
    public_dataset_path = "frontend/public/dataset_math.json"
    manifest_path = "pipeline_manifest_math.json"
    crops_q_dir = "crops_math/questions"
    crops_ms_dir = "crops_math/mark_schemes"

    os.makedirs(crops_q_dir, exist_ok=True)
    os.makedirs(crops_ms_dir, exist_ok=True)

    # Load existing dataset if present
    existing_dataset: List[Dict[str, Any]] = []
    if os.path.exists(dataset_path):
        try:
            with open(dataset_path, "r", encoding="utf-8") as f:
                existing_dataset = json.load(f)
            print(f"Loaded existing dataset with {len(existing_dataset)} questions.")
        except Exception as e:
            print(f"[WARNING] Could not load {dataset_path}: {e}")

    dataset_by_id = {q["id"]: q for q in existing_dataset}
    existing_paper_ids = {q["paper_id"] for q in existing_dataset}

    # Load manifest
    manifest = ManifestManager(manifest_path=manifest_path)

    # Scan papers
    all_pairs = scan_math_papers_directory()
    print(f"Found {len(all_pairs)} total complete Mathematics paper pairs.")

    # Filter pairs
    target_pairs = all_pairs
    if args.paper:
        target_pairs = [p for p in target_pairs if p["paper_id"] == args.paper]
    if args.unit:
        u_norm = get_math_unit_from_code(args.unit)
        target_pairs = [p for p in target_pairs if p["base_unit_code"] == u_norm]
    if args.series:
        s_low = args.series.lower()
        target_pairs = [p for p in target_pairs if s_low in p["series"].lower() or s_low in p["series_folder"].lower()]

    if not args.force:
        target_pairs = [
            p for p in target_pairs
            if not manifest.is_paper_completed(p, existing_dataset_paper_ids=existing_paper_ids)
        ]

    if args.max_papers > 0:
        target_pairs = target_pairs[:args.max_papers]

    print(f"Selected {len(target_pairs)} papers for extraction.")
    if not target_pairs:
        print("Nothing to extract. Exiting.")
        return

    gemini_extractor = GeminiMathExtractor()
    total_processed = 0

    for idx, p_info in enumerate(target_pairs, start=1):
        pid = p_info["paper_id"]
        print(f"\n[{idx}/{len(target_pairs)}] Extracting {pid} ({p_info['unit_name']}, {p_info['series']})...")

        t0 = time.time()
        try:
            questions, summary = extract_math_paper(
                p_info,
                gemini_extractor=gemini_extractor,
                crops_q_dir=crops_q_dir,
                crops_ms_dir=crops_ms_dir,
                dry_run=args.dry_run
            )
            elapsed = time.time() - t0

            if questions:
                # Update in-memory dataset
                for q in questions:
                    dataset_by_id[q["id"]] = q

                print(f"  -> Extracted {summary['questions_count']} questions in {elapsed:.1f}s. Marks: {summary['total_marks']}/{summary['expected_marks']} (Match: {summary['marks_match']})")

                # Update manifest and incrementally save dataset
                if not args.dry_run:
                    manifest.record_completed_paper(
                        paper_info=p_info,
                        question_ids=[q["id"] for q in questions]
                    )
                    with open(dataset_path, "w", encoding="utf-8") as f:
                        json.dump(list(dataset_by_id.values()), f, indent=2)
                    if os.path.exists("frontend/public"):
                        shutil.copyfile(dataset_path, public_dataset_path)

                total_processed += 1
            else:
                print(f"  [ERROR] No questions extracted for {pid}")

        except Exception as e:
            print(f"  [EXCEPTION] Failed extracting {pid}: {e}")
            import traceback
            traceback.print_exc()

    # Save dataset to dataset_math.json and sync to frontend/public/
    if not args.dry_run and total_processed > 0:
        final_dataset = list(dataset_by_id.values())
        print(f"\nSaving {len(final_dataset)} questions to {dataset_path}...")
        with open(dataset_path, "w", encoding="utf-8") as f:
            json.dump(final_dataset, f, indent=2)

        if os.path.exists("frontend/public"):
            print(f"Syncing dataset to {public_dataset_path}...")
            shutil.copyfile(dataset_path, public_dataset_path)

        print("[SUCCESS] Mathematics extraction and sync complete!")


if __name__ == "__main__":
    main()
