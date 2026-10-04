"""
Master Extraction Pipeline for Edexcel IAL Physics (WPH11–WPH16):
- Document-Level 3-Tier Tree Parser Architecture:
  * Strict x0 coordinate separation: Question headers at x0 < 55 (prevents exponent collisions like m^2 kg^-2)
  * Section A contains exactly 10 MCQs (Questions 1 to 10, 1 mark each) for Units 1, 2, 4, 5
  * Section B begins at Question 11 (structured theory questions)
  * Practical Units 3 and 6 (WPH13, WPH16): 0 MCQs (practical/theory questions)
  * Formula & Data sheet cutoff: Discards all pages after 'TOTAL FOR SECTION B = ... MARKS' or 'TOTAL FOR PAPER = ... MARKS'
  * Multi-Page Continuation: Seamless vertical slice stitching without artificial banner dividers
  * Sibling Purge Rule: Branch stems (e.g., 14(a) preamble, 17(b) Vernier diagram, 18(c) hinge diagram) are scoped strictly to child roman numerals and purged before subsequent letters
  * Same-Page First Subpart Rule: When subpart (a) is on the same page as the question header, it is cropped continuously as a single natural exam crop
  * Mark Scheme MCQ keys: Strictly extracted using line-by-line regex ('D is the correct answer', etc.)
- Output isolation:
  * Crops saved to crops_physics/questions/ and crops_physics/mark_schemes/
  * Dataset emitted to dataset_physics.json
  * Manifest saved to pipeline_manifest_physics.json
  * Chemistry data in papers/ and dataset.json is untouched!
"""

import os
import re
import sys
import json
import glob
import time
import argparse
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageDraw
import pymupdf

from pipeline.pdf_processor import PDFProcessor
from pipeline.ms_matcher_physics import MSMatcherPhysics, extract_mcq_key_from_text
from pipeline.syllabus_physics import (
    get_physics_unit_from_code,
    get_expected_paper_marks,
    get_physics_parent_topic_for_subtopic,
    get_all_physics_subtopics_for_unit,
    get_physics_syllabus_for_unit
)
from pipeline.batch_scanner_physics import scan_physics_papers_directory, compute_file_hash
from pipeline.manifest import ManifestManager
from pipeline.gemini_extractor_physics import GeminiPhysicsExtractor

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROMAN_NUMS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]
DELIMITER_REGEX = re.compile(r"TOTAL\s+FOR\s+(?:SECTION\s+[BC]|PAPER)\s*=\s*(?:70|80|\d+)\s*MARKS?", re.I)

def normalize_span(text: str) -> str:
    """Normalizes font shift (-29 codepoints) and control characters from certain legacy exam PDFs."""
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

def get_page_normalized_blocks(page: pymupdf.Page) -> List[Tuple[float, float, float, float, str]]:
    """Extracts text blocks with per-span font normalization."""
    blocks = []
    page_dict = page.get_text("dict")
    for b in page_dict.get("blocks", []):
        if b.get("type") != 0:
            continue
        lines_text = []
        for l in b.get("lines", []):
            line_str = "".join(normalize_span(s.get("text", "")) for s in l.get("spans", []))
            lines_text.append(line_str)
        full_text = "\n".join(lines_text).strip()
        blocks.append((b["bbox"][0], b["bbox"][1], b["bbox"][2], b["bbox"][3], full_text))
    return blocks

def trim_vertical_whitespace(img: Image.Image, padding: int = 12) -> Image.Image:
    """
    Trims empty vertical whitespace (top and bottom) from a rendered PIL image,
    preserving full horizontal width.
    """
    from PIL import ImageChops
    bg = Image.new(img.mode, img.size, (255, 255, 255))
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()
    if bbox:
        top = max(0, bbox[1] - padding)
        bottom = min(img.height, bbox[3] + padding)
        if bottom > top + 20:
            return img.crop((0, top, img.width, bottom))
    return img

def safe_save_image(img: Image.Image, path: str, format: str = "PNG", optimize: bool = True, max_retries: int = 5):
    """Safely saves a PIL image with retries against intermittent Windows file locking."""
    import time
    for attempt in range(max_retries):
        try:
            img.save(path, format, optimize=optimize)
            return
        except OSError:
            if attempt == max_retries - 1:
                raise
            time.sleep(0.15 * (attempt + 1))

def stitch_slices_seamlessly(img1: Image.Image, img2: Image.Image) -> Image.Image:
    """Stitches two vertical slices of the same question seamlessly without banners, after trimming empty vertical margins."""
    t1 = trim_vertical_whitespace(img1, padding=8)
    t2 = trim_vertical_whitespace(img2, padding=8)
    w = max(t1.width, t2.width)
    h = t1.height + t2.height
    result = Image.new("RGB", (w, h), color=(255, 255, 255))
    x1 = (w - t1.width) // 2
    result.paste(t1, (x1, 0))
    x2 = (w - t2.width) // 2
    result.paste(t2, (x2, t1.height))
    return result

def compose_question_tiers(tiers: List[Tuple[Image.Image, str]]) -> Image.Image:
    """
    Composes 1, 2, or 3 tiers into a unified question image.
    Each tier is a tuple: (img: Image.Image, banner_label: str)
    - If 1 tier: returns img directly (no banners).
    - If 2+ tiers: stacks them vertically with a clean divider banner before each tier.
    """
    if not tiers:
        raise ValueError("No tiers provided")
    cleaned_tiers = [(trim_vertical_whitespace(img, padding=8), label) for img, label in tiers]
    if len(cleaned_tiers) == 1:
        return cleaned_tiers[0][0]

    content_w = max(img.width for img, _ in cleaned_tiers)
    margin = 24
    target_w = content_w + margin * 2
    banner_h = 36
    divider_h = 20

    total_h = (
        margin * 2
        + sum(img.height for img, _ in cleaned_tiers)
        + (banner_h * len(cleaned_tiers))
        + (divider_h * (len(cleaned_tiers) - 1))
    )

    stitched = Image.new("RGB", (target_w, total_h), color=(255, 255, 255))
    draw = ImageDraw.Draw(stitched)

    cur_y = margin
    for idx, (img, label) in enumerate(cleaned_tiers):
        draw.rectangle(
            [margin, cur_y, target_w - margin, cur_y + banner_h],
            fill=(241, 245, 249),  # slate-100
            outline=(203, 213, 225),  # slate-300
            width=1
        )
        draw.text(
            (margin + 12, cur_y + 9),
            label.upper(),
            fill=(71, 85, 105),  # slate-600
        )
        cur_y += banner_h

        paste_x = margin + (content_w - img.width) // 2
        stitched.paste(img, (paste_x, cur_y))
        cur_y += img.height

        if idx < len(cleaned_tiers) - 1:
            cur_y += divider_h

    return stitched

def get_safe_boundary(page: pymupdf.Page, token_y0: float) -> float:
    """
    Finds the safe boundary between target token and preceding text block or drawing.
    Returns the midpoint between the bottom of the preceding element and token_y0.
    """
    prev_bottoms = []
    for b in page.get_text("blocks"):
        if b[3] <= token_y0 - 0.5 and b[1] < 775 and "DO NOT WRITE" not in b[4] and "*P" not in b[4] and b[0] < 540:
            prev_bottoms.append(b[3])
    for d in page.get_drawings():
        r = d["rect"]
        if r.y1 <= token_y0 - 0.5 and r.y0 < 775 and r.y1 > 50 and r.width > 10 and r.height < 600:
            prev_bottoms.append(r.y1)

    if not prev_bottoms:
        return max(50.0, token_y0 - 4.0)

    prev_y1 = max(prev_bottoms)
    if prev_y1 < token_y0:
        return (prev_y1 + token_y0) / 2.0
    return max(50.0, token_y0 - 2.0)

def load_gemini_topic_cache() -> Dict[str, Tuple[str, List[str]]]:
    """Loads topic/subtopics cache from .cache/gemini_physics/*.json"""
    cache_map = {}
    for p in glob.glob(".cache/gemini_physics/*.json"):
        try:
            with open(p, "r", encoding="utf-8") as f:
                d = json.load(f)
                for q in d.get("questions", []):
                    pq = str(q.get("parent_question") or "").strip()
                    sub = str(q.get("sub_part") or "").strip()
                    top = q.get("topic")
                    subs = q.get("subtopics") or [q.get("subtopic")]
                    if top and subs:
                        cache_map[f"{pq}_{sub}"] = (top, subs)
                        clean_sub = sub.replace("(", "").replace(")", "").replace(" ", "")
                        cache_map[f"{pq}_{clean_sub}"] = (top, subs)
        except Exception:
            pass
    return cache_map

def load_paper_topic_cache(paper_id: str, num_pages: int, unit_code: str) -> Dict[str, Tuple[str, List[str]]]:
    """Loads topic cache only from this paper's own page-analysis cache entries, restricted to the unit's syllabus."""
    import hashlib
    allowed = set(get_all_physics_subtopics_for_unit(unit_code))
    cache_map: Dict[str, Tuple[str, List[str]]] = {}
    for idx in range(num_pages):
        key = f"{paper_id}_qp_page_physics_v1_{idx}"
        p = os.path.join(".cache/gemini_physics", hashlib.sha256(key.encode("utf-8")).hexdigest() + ".json")
        if not os.path.exists(p):
            continue
        try:
            with open(p, "r", encoding="utf-8") as f:
                d = json.load(f)
        except Exception:
            continue
        for q in d.get("questions", []):
            pq = str(q.get("parent_question") or "").strip()
            sub = str(q.get("sub_part") or "").strip()
            subs = [s for s in (q.get("subtopics") or [q.get("subtopic")]) if s in allowed]
            if not subs:
                continue
            top = get_physics_parent_topic_for_subtopic(subs[0])
            cache_map[f"{pq}_{sub}"] = (top, subs)
            cache_map[f"{pq}_{sub.replace('(', '').replace(')', '').replace(' ', '')}"] = (top, subs)
    return cache_map

def resolve_topic_for_question(
    pq: str,
    sub: str,
    cache_map: Dict[str, Tuple[str, List[str]]],
    unit_code: str = "WPH11"
) -> Tuple[str, str, List[str]]:
    """Resolves topic and subtopics using Gemini cache or syllabus fallback."""
    clean_sub = sub.replace("(", "").replace(")", "").strip()
    keys = [
        f"{pq}_{sub}",
        f"{pq}_{clean_sub}",
    ]
    m_rom = re.search(r"\(([ivx]+)\)", sub)
    if m_rom:
        keys.append(f"{pq}_{m_rom.group(1)}")
    m_let = re.search(r"\(([a-z])\)", sub)
    if m_let:
        keys.append(f"{pq}_{m_let.group(1)}")
    keys.append(f"{pq}_None")
    keys.append(f"{pq}_")

    for k in keys:
        if k in cache_map:
            t, subs = cache_map[k]
            return t, subs[0] if subs else "", subs

    # Dynamic fallback based on unit_code
    syllabus = get_physics_syllabus_for_unit(unit_code)
    if syllabus:
        first_top = next(iter(syllabus.keys()))
        first_sub = syllabus[first_top][0]
        return first_top, first_sub, [first_sub]

    # Universal fallback
    default_top = "Topic 1: Mechanics"
    default_sub = "1.1: Physical Quantities, SI Units & Vectors"
    return default_top, default_sub, [default_sub]

def process_physics_paper(
    pair: Dict[str, Any],
    qp_proc: PDFProcessor,
    ms_matcher: Optional[MSMatcherPhysics],
    questions_out_dir: str,
    ms_out_dir: str,
    cache_map: Dict[str, Tuple[str, List[str]]],
    gemini_classifier: Optional[GeminiPhysicsExtractor] = None,
    max_pages: Optional[int] = None
) -> List[Dict[str, Any]]:
    doc = qp_proc.doc
    pw, ph = doc[0].rect.width, doc[0].rect.height
    unit_code = pair["unit_code"]
    base_unit_code = pair.get("base_unit_code", unit_code)
    unit_name = pair.get("unit_name") or get_physics_unit_from_code(base_unit_code)
    # Paper-scoped topic cache: ignore the global (paper-agnostic) map to avoid cross-paper collisions
    cache_map = load_paper_topic_cache(pair["paper_id"], len(doc), base_unit_code)
    is_practical_unit = base_unit_code in ("WPH13", "WPH16")
    paper_id = pair["paper_id"]
    series_name = pair["series"]
    paper_code = pair.get("paper_code", f"{base_unit_code}/01")

    # 1. Delimiter Cutoff: Discard pages after formula sheet marker
    total_qp_pages = len(doc)
    cutoff_page = total_qp_pages
    for p_idx in range(total_qp_pages):
        page = doc[p_idx]
        ph = page.rect.height
        blocks = get_page_normalized_blocks(page)
        for b in blocks:
            if DELIMITER_REGEX.search(b[4]):
                cutoff_page = p_idx + 1
                break
        if cutoff_page < total_qp_pages:
            break

    if max_pages:
        cutoff_page = min(cutoff_page, max_pages)

    discarded = total_qp_pages - cutoff_page
    print(f"    [DELIMITER CUTOFF] Cutoff at Page {cutoff_page} ({discarded} formula/blank/answer booklet pages discarded).", flush=True)

    # 2. Extract Document Tokens with Universal State Machine
    q_hdr_re = re.compile(r"^\s*\*?\s*(\d{1,2})(?:[\s\t\x00-\x1f\.\:\$\u2009]+|\s+(?=[A-Za-z])|$)(.*)", re.I)
    universal_sub_re = re.compile(r"^\s*\*?\s*(?:(\d{1,2})\s+)?\*?\s*\(([a-z])\)(?:\s*\(([ivx]+)\))?", re.I)
    sub_rom_re = re.compile(r"^\s*\*?\s*(?:(\d{1,2})\s+)?\*?\s*\(([ivx]+)\)", re.I)
    tot_re = re.compile(r"\(Total\s+for\s+Question\s+(\d{1,2})\s*=\s*(\d+)\s*marks?\)", re.I)

    tokens = []
    active_q = None
    max_root_q = 8 if base_unit_code in ("WPH13", "WPH16") else (21 if base_unit_code == "WPH15" else 30)

    for p_idx in range(cutoff_page):
        page = doc[p_idx]
        blocks = sorted(get_page_normalized_blocks(page), key=lambda x: x[1])
        for b in blocks:
            x0, y0, x1, y1, text = b[0], b[1], b[2], b[3], b[4].strip()
            if y0 > 775 or "DO NOT WRITE" in text or "*P" in text:
                continue

            m_tot = tot_re.search(text)
            if m_tot:
                t_q = int(m_tot.group(1))
                tokens.append({
                    "type": "TOTAL",
                    "q": t_q,
                    "marks": int(m_tot.group(2)),
                    "page": p_idx,
                    "y0": y0, "y1": y1,
                    "text": text
                })
                continue

            lines = [l.strip() for l in text.split("\n") if l.strip()]
            first_line = lines[0] if lines else ""
            # Asterisk (QWC) headers split across lines, e.g. "18" / "*" / "(b) As the ..." -> "18 (b) As the ..."
            if len(lines) > 1 and re.fullmatch(r"\*?\s*(?:\d{1,2})?\s*\*?", first_line) and re.match(r"^\*?\s*\(?[a-z]+\)", " ".join(lines[1:3]).lstrip("* ")) is not None:
                joined = re.sub(r"[\s\*]+", " ", " ".join(lines[:3])).strip()
                if re.match(r"^(?:\d{1,2}\s+)?\(", joined):
                    first_line = joined

            matched_sub = False
            if x0 < 120:
                m_sub = universal_sub_re.match(first_line)
                if m_sub:
                    lead_q = int(m_sub.group(1)) if m_sub.group(1) else None
                    if lead_q is not None and lead_q <= max_root_q and lead_q == (active_q or 0) + 1:
                        active_q = lead_q
                        tokens.append({
                            "type": "Q_HEADER",
                            "q": lead_q,
                            "page": p_idx,
                            "y0": y0, "y1": y1,
                            "text": first_line
                        })

                    if lead_q is None or lead_q == active_q:
                        let = m_sub.group(2).lower()
                        rom = m_sub.group(3).lower() if m_sub.group(3) else None
                        if rom:
                            tokens.append({
                                "type": "SUB_COMBINED",
                                "letter": let,
                                "roman": rom,
                                "page": p_idx,
                                "y0": y0, "y1": y1,
                                "text": first_line
                            })
                            matched_sub = True
                        elif let in ROMAN_NUMS:
                            tokens.append({
                                "type": "SUB_ROMAN",
                                "roman": let,
                                "page": p_idx,
                                "y0": y0, "y1": y1,
                                "text": first_line
                            })
                            matched_sub = True
                        else:
                            tokens.append({
                                "type": "SUB_LETTER",
                                "letter": let,
                                "page": p_idx,
                                "y0": y0, "y1": y1,
                                "text": first_line
                            })
                            matched_sub = True

                if not matched_sub:
                    m_rom = sub_rom_re.match(first_line)
                    if m_rom:
                        lead_q = int(m_rom.group(1)) if m_rom.group(1) else None
                        if lead_q is None or lead_q == active_q:
                            rom = m_rom.group(2).lower()
                            tokens.append({
                                "type": "SUB_ROMAN",
                                "roman": rom,
                                "page": p_idx,
                                "y0": y0, "y1": y1,
                                "text": first_line
                            })
                            matched_sub = True

            if matched_sub:
                continue

            # Question headers strictly at left margin (x0 < 75)
            if x0 < 75:
                m_q = q_hdr_re.match(first_line)
                if m_q:
                    q_num = int(m_q.group(1))
                    if 1 <= q_num <= 30:
                        if not re.match(r"^\d{1,2}\s*(?:cm\b|dm\b|g\b|mol\b|kg\b|pa\b|kj\b|°|%|n\b|m\b|s\b|v\b|w\b|j\b|passengers\b)", first_line, re.I):
                            if q_num <= max_root_q and q_num in (active_q, (active_q or 0) + 1):
                                active_q = q_num
                                tokens.append({
                                    "type": "Q_HEADER",
                                    "q": q_num,
                                    "page": p_idx,
                                    "y0": y0, "y1": y1,
                                    "text": first_line
                                })
                                continue

    # Group tokens by question
    q_groups = {}
    cur_q = None
    for t in tokens:
        if t["type"] == "Q_HEADER":
            cur_q = t["q"]
            if cur_q not in q_groups:
                q_groups[cur_q] = {"header": t, "items": []}
        elif cur_q is not None:
            q_groups[cur_q]["items"].append(t)
            if t["type"] == "TOTAL" and t["q"] == cur_q:
                cur_q = None

    paper_questions: List[Dict[str, Any]] = []

    # Shared Section A stimulus ("Questions 9 and 10 refer to the following information", "refer to the information below", etc.)
    shared_mcq_stems: Dict[int, Image.Image] = {}
    if not is_practical_unit:
        shared_stem_re = re.compile(
            r"Questions?\s+(\d+)\s*(?:and|to|-|,)\s*(\d+)\s+refer\s+to\b", re.I
        )
        for p_idx in range(cutoff_page):
            for b in get_page_normalized_blocks(doc[p_idx]):
                m_shared = shared_stem_re.search(re.sub(r"\s+", " ", b[4]))
                if not m_shared:
                    continue
                lo, hi = int(m_shared.group(1)), int(m_shared.group(2))
                if lo not in q_groups or hi < lo or hi > 10:
                    continue
                first_hdr = q_groups[lo]["header"]
                if first_hdr["page"] < p_idx:
                    continue
                pieces = []
                y_start = max(0.0, b[1] - 2.0)
                for pg in range(p_idx, first_hdr["page"] + 1):
                    top = y_start if pg == p_idx else 40.0
                    bot = first_hdr["y0"] - 2.0 if pg == first_hdr["page"] else 780.0
                    if bot - top < 8:
                        continue
                    box = [int(top / ph * 1000), 70, int(bot / ph * 1000), 940]
                    piece = qp_proc.crop_box(
                        pg, box, dpi=300, clamp_horizontal=True, scan_markers=False,
                        padding=0, padding_top=2, padding_bottom=2
                    )
                    pieces.append(trim_vertical_whitespace(piece, padding=6))
                if pieces:
                    stem_img = pieces[0]
                    for nxt in pieces[1:]:
                        stem_img = stitch_slices_seamlessly(stem_img, nxt)
                    for qn in range(lo, hi + 1):
                        shared_mcq_stems[qn] = stem_img
                    print(f"    [SHARED MCQ STEM] Questions {lo}-{hi} stimulus found on P{p_idx + 1}", flush=True)

    # Section A MCQs (Q1 to Q10) for non-practical units
    if not is_practical_unit:
        for q_num in range(1, 11):
            if q_num not in q_groups:
                continue
            g = q_groups[q_num]
            hdr = g["header"]
            tot_item = next((it for it in g["items"] if it["type"] == "TOTAL"), None)
            if not tot_item:
                continue

            p_idx = hdr["page"]
            y0_pts = hdr["y0"]
            y1_pts = tot_item["y1"] + 4.0

            box_1000 = [int(y0_pts / ph * 1000), 70, int(y1_pts / ph * 1000), 940]
            mcq_crop = qp_proc.crop_box(
                p_idx, box_1000, dpi=300, clamp_horizontal=True,
                is_mcq=True, scan_markers=False,
                padding=0, padding_top=4, padding_bottom=4
            )
            mcq_crop = trim_vertical_whitespace(mcq_crop, padding=8)
            if q_num in shared_mcq_stems:
                mcq_crop = stitch_slices_seamlessly(shared_mcq_stems[q_num], mcq_crop)
                print(f"      [SHARED MCQ STEM] Prepended shared stimulus to Q{q_num}", flush=True)

            qid = f"{paper_id}_q{q_num}"
            q_filename = f"{qid}.png"
            q_save_path = os.path.join(questions_out_dir, q_filename)
            safe_save_image(mcq_crop, q_save_path)

            # Match MS
            ms_filename = f"{qid}_ms.png"
            ms_save_path = os.path.join(ms_out_dir, ms_filename)
            ms_found = False
            mcq_key = None
            if ms_matcher:
                ms_found = ms_matcher.crop_for_question(str(q_num), ms_save_path)
                mcq_key = ms_matcher.get_mcq_answer(str(q_num))

            top, sub, subs = resolve_topic_for_question(str(q_num), "", cache_map, base_unit_code)
            raw_mcq_text = doc[p_idx].get_text("text", clip=pymupdf.Rect(70/1000*pw, y0_pts, 940/1000*pw, y1_pts)).strip()
            print(f"    Saved Q{q_num} (MCQ, 1m) [Key: {mcq_key}] [{top} -> {sub}]", flush=True)

            q_entry = {
                "id": qid,
                "paperId": paper_id,
                "unit": unit_name,
                "unitCode": unit_code,
                "paperCode": paper_code,
                "paper_code": paper_code,
                "year": pair["year"],
                "session": pair.get("session", "January"),
                "series": series_name,
                "questionNumber": str(q_num),
                "parentQuestion": str(q_num),
                "subPart": "",
                "marks": 1,
                "topic": top,
                "subtopic": sub,
                "subtopics": subs,
                "section": "A",
                "question_type": "mcq",
                "questionType": "mcq",
                "hasStem": False,
                "stemSummary": None,
                "questionImagePath": f"/crops_physics/questions/{q_filename}",
                "markSchemeImagePath": f"/crops_physics/mark_schemes/{ms_filename}" if ms_found else None,
                "answer": mcq_key,
                "correct_answer": mcq_key,
                "correctAnswer": mcq_key,
                "parent_question_id": f"Q{q_num}",
                "all_subparts": [f"Q{q_num}"],
                "_raw_text": raw_mcq_text
            }
            paper_questions.append(q_entry)

    # Section B Theory Questions (Q11+ or Q1+ for practical units)
    start_theory_q = 1 if is_practical_unit else 11
    max_q_num = max(q_groups.keys(), default=25)

    for q_num in range(start_theory_q, max_q_num + 1):
        if q_num not in q_groups:
            continue
        g = q_groups[q_num]
        hdr = g["header"]
        p_hdr = hdr["page"]
        items = g["items"]

        tot_item = next((it for it in items if it["type"] == "TOTAL"), None)
        sub_tokens = [it for it in items if it["type"] in ("SUB_LETTER", "SUB_COMBINED", "SUB_ROMAN")]

        if not sub_tokens:
            # Standalone unbranched question (e.g. Q13)
            tot_p = tot_item["page"] if tot_item else p_hdr
            tot_y1 = tot_item["y1"] if tot_item else ph - 50.0

            if p_hdr == tot_p:
                box_1000 = [int(hdr["y0"] / ph * 1000), 70, int((tot_y1 + 4.0) / ph * 1000), 940]
                q_crop = qp_proc.crop_box(
                    p_hdr, box_1000, dpi=300, clamp_horizontal=True,
                    scan_markers=False, padding=0, padding_top=4, padding_bottom=4
                )
                q_crop = trim_vertical_whitespace(q_crop, padding=8)
            else:
                s1_box = [int(hdr["y0"] / ph * 1000), 70, int(780.0 / ph * 1000), 940]
                s1 = qp_proc.crop_box(p_hdr, s1_box, dpi=300, clamp_horizontal=True, scan_markers=False, padding=0, padding_top=4, padding_bottom=4)
                s2_box = [int(50.0 / ph * 1000), 70, int((tot_y1 + 4.0) / ph * 1000), 940]
                s2 = qp_proc.crop_box(tot_p, s2_box, dpi=300, clamp_horizontal=True, scan_markers=False, padding=0, padding_top=4, padding_bottom=4)
                q_crop = stitch_slices_seamlessly(s1, s2)

            qid = f"{paper_id}_q{q_num}"
            q_filename = f"{qid}.png"
            q_save_path = os.path.join(questions_out_dir, q_filename)
            safe_save_image(q_crop, q_save_path)

            marks = 3
            ms_found = False
            ms_filename = f"{qid}_ms.png"
            ms_save_path = os.path.join(ms_out_dir, ms_filename)
            if ms_matcher:
                ms_found = ms_matcher.crop_for_question(str(q_num), ms_save_path)
                ms_mark = ms_matcher.get_mark_for_question(str(q_num))
                if ms_mark:
                    marks = ms_mark

            raw_stand_text = doc[p_hdr].get_text("text", clip=pymupdf.Rect(70/1000*pw, hdr["y0"], 940/1000*pw, tot_y1)).strip()
            if marks == 3:
                m_stand_mark = re.findall(r"\b\((\d{1,2})\)", raw_stand_text)
                if m_stand_mark:
                    marks = int(m_stand_mark[-1])
                elif tot_item and tot_item.get("marks"):
                    marks = tot_item["marks"]

            top, sub, subs = resolve_topic_for_question(str(q_num), "", cache_map, base_unit_code)
            print(f"    Saved Q{q_num} (Standalone, {marks}m) [{top} -> {sub}]", flush=True)

            q_entry = {
                "id": qid,
                "paperId": paper_id,
                "unit": unit_name,
                "unitCode": unit_code,
                "paperCode": paper_code,
                "paper_code": paper_code,
                "year": pair["year"],
                "session": pair.get("session", "January"),
                "series": series_name,
                "questionNumber": str(q_num),
                "parentQuestion": str(q_num),
                "subPart": "",
                "marks": marks,
                "topic": top,
                "subtopic": sub,
                "subtopics": subs,
                "section": "B",
                "question_type": "theory",
                "questionType": "theory",
                "hasStem": False,
                "stemSummary": None,
                "questionImagePath": f"/crops_physics/questions/{q_filename}",
                "markSchemeImagePath": f"/crops_physics/mark_schemes/{ms_filename}" if ms_found else None,
                "parent_question_id": f"Q{q_num}",
                "all_subparts": [f"Q{q_num}"],
                "_raw_text": raw_stand_text
            }
            paper_questions.append(q_entry)
            continue

        # Branched question with subparts
        # Tier 1: Root Question Stem
        first_sub = sub_tokens[0]
        root_stem_img = None
        has_root_stem = False
        if first_sub["page"] == p_hdr and first_sub["y0"] > hdr["y0"] + 15:
            safe_cut = get_safe_boundary(doc[p_hdr], first_sub["y0"])
            r_box = [int(hdr["y0"] / ph * 1000), 70, int(safe_cut / ph * 1000), 940]
            root_stem_img = qp_proc.crop_box(
                p_hdr, r_box, dpi=300, clamp_horizontal=True,
                is_stem=True, scan_markers=False,
                padding=0, padding_top=4, padding_bottom=4
            )
            root_stem_img = trim_vertical_whitespace(root_stem_img, padding=8)
            has_root_stem = True
            print(f"    Q{q_num} Root Stem cropped (y0={hdr['y0']:.1f} to {safe_cut:.1f})", flush=True)

        # Organize subparts by letter groups
        letter_groups: List[Dict[str, Any]] = []
        cur_let_grp: Optional[Dict[str, Any]] = None

        for it in sub_tokens:
            tp = it["type"]
            let = it.get("letter")
            if tp == "SUB_LETTER":
                if cur_let_grp is not None and cur_let_grp["letter"] == let:
                    pass
                else:
                    cur_let_grp = {
                        "letter": let,
                        "token": it,
                        "romans": []
                    }
                    letter_groups.append(cur_let_grp)
            elif tp == "SUB_COMBINED":
                if cur_let_grp is not None and cur_let_grp["letter"] == let:
                    cur_let_grp["romans"].append(it)
                else:
                    cur_let_grp = {
                        "letter": let,
                        "token": it,
                        "romans": [it]
                    }
                    letter_groups.append(cur_let_grp)
            elif tp == "SUB_ROMAN":
                if cur_let_grp is not None:
                    cur_let_grp["romans"].append(it)

        # Process each letter group
        for lg_idx, lg in enumerate(letter_groups):
            let = lg["letter"]
            let_token = lg["token"]
            romans = lg["romans"]

            next_lg_token = letter_groups[lg_idx + 1]["token"] if lg_idx + 1 < len(letter_groups) else tot_item
            branch_stem_img = None

            if not romans:
                # Direct letter leaf: Q_num(let) e.g. 11(a), 11(b), 12(a), 12(b), 14(b), 16(a), 16(b), 16(c), etc.
                full_qnum = f"{q_num}({let})"
                canonical_qid = f"{q_num}{let}"

                marks = 1
                ms_found = False
                sanitized = f"{q_num}_{let}"
                qid = f"{paper_id}_q{sanitized}"
                ms_filename = f"{qid}_ms.png"
                ms_save_path = os.path.join(ms_out_dir, ms_filename)
                if ms_matcher:
                    ms_found = ms_matcher.crop_for_question(full_qnum, ms_save_path) or ms_matcher.crop_for_question(canonical_qid, ms_save_path)
                    ms_mark = ms_matcher.get_mark_for_question(canonical_qid) or ms_matcher.get_mark_for_question(full_qnum)
                    if ms_mark:
                        marks = ms_mark

                p_start = let_token["page"]
                is_same_page_first_sub = (let == "a" and p_start == p_hdr)

                if is_same_page_first_sub:
                    y0_start = hdr["y0"]
                else:
                    y0_start = get_safe_boundary(doc[p_start], let_token["y0"])

                # Check if multi-page continuation
                is_multi_page = False
                if next_lg_token:
                    p_next = next_lg_token["page"]
                    y0_next = next_lg_token["y0"]
                    if p_next > p_start and y0_next >= 120.0:
                        is_multi_page = True

                if is_multi_page:
                    p_end = next_lg_token["page"]
                    if next_lg_token["type"] == "TOTAL":
                        y1_term = min(780.0, next_lg_token["y1"] + 4.0)
                    else:
                        y1_term = get_safe_boundary(doc[p_end], next_lg_token["y0"])

                    s1_box = [int(y0_start / ph * 1000), 70, int(780.0 / ph * 1000), 940]
                    s1 = qp_proc.crop_box(p_start, s1_box, dpi=300, clamp_horizontal=True, scan_markers=False, padding=0, padding_top=4, padding_bottom=4)
                    s2_box = [int(50.0 / ph * 1000), 70, int(y1_term / ph * 1000), 940]
                    s2 = qp_proc.crop_box(p_end, s2_box, dpi=300, clamp_horizontal=True, scan_markers=False, padding=0, padding_top=4, padding_bottom=4)
                    leaf_img = stitch_slices_seamlessly(s1, s2)
                    print(f"    [MULTI-PAGE STITCHED] {full_qnum} across P{p_start+1} and P{p_end+1}", flush=True)
                else:
                    if next_lg_token and next_lg_token["page"] == p_start:
                        if next_lg_token["type"] == "TOTAL":
                            y1_end = min(780.0, next_lg_token["y1"] + 4.0)
                        else:
                            y1_end = get_safe_boundary(doc[p_start], next_lg_token["y0"])
                        leaf_box = [int(y0_start / ph * 1000), 70, int(y1_end / ph * 1000), 940]
                        leaf_img = qp_proc.crop_box(p_start, leaf_box, dpi=300, clamp_horizontal=True, scan_markers=False, padding=0, padding_top=4, padding_bottom=4)
                    else:
                        y1_end = 780.0
                        leaf_box = [int(y0_start / ph * 1000), 70, int(780.0 / ph * 1000), 940]
                        leaf_img = qp_proc.crop_box(p_start, leaf_box, dpi=300, clamp_horizontal=True, scan_markers=True, current_qnum=full_qnum, padding=0, padding_top=4, padding_bottom=4)
                    leaf_img = trim_vertical_whitespace(leaf_img, padding=8)

                y_leaf_bottom = y1_term if is_multi_page else y1_end
                raw_leaf_text = doc[p_start].get_text("text", clip=pymupdf.Rect(70/1000*pw, y0_start, 940/1000*pw, y_leaf_bottom)).strip()
                m_leaf_mark = re.findall(r"(?<!Total for Question\s)(?<!Question\s)\((\d{1,2})\)", raw_leaf_text)
                if m_leaf_mark:
                    qp_m = int(m_leaf_mark[-1])
                    if qp_m > 0 and (marks == 1 or qp_m != marks):
                        marks = qp_m

                tiers = []
                if not is_same_page_first_sub and root_stem_img is not None:
                    tiers.append((root_stem_img, f"QUESTION {q_num} CONTEXT"))
                tiers.append((leaf_img, f"QUESTION {full_qnum} ({marks} mark{'s' if marks > 1 else ''})"))

                final_img = compose_question_tiers(tiers)
                q_filename = f"{qid}.png"
                q_save_path = os.path.join(questions_out_dir, q_filename)
                safe_save_image(final_img, q_save_path)

                top, sub, subs = resolve_topic_for_question(str(q_num), f"({let})", cache_map, base_unit_code)
                print(f"    Saved {full_qnum} ({marks}m) [{top} -> {sub}]", flush=True)

                q_entry = {
                    "id": qid,
                    "paperId": paper_id,
                    "unit": unit_name,
                    "unitCode": unit_code,
                    "paperCode": paper_code,
                    "paper_code": paper_code,
                    "year": pair["year"],
                    "session": pair.get("session", "January"),
                    "series": series_name,
                    "questionNumber": full_qnum,
                    "parentQuestion": str(q_num),
                    "subPart": f"({let})",
                    "marks": marks,
                    "topic": top,
                    "subtopic": sub,
                    "subtopics": subs,
                    "section": "B",
                    "question_type": "theory",
                    "questionType": "theory",
                    "hasStem": bool(tiers and len(tiers) > 1),
                    "stemSummary": f"Question {q_num} setup and context" if (tiers and len(tiers) > 1) else None,
                    "questionImagePath": f"/crops_physics/questions/{q_filename}",
                    "markSchemeImagePath": f"/crops_physics/mark_schemes/{ms_filename}" if ms_found else None,
                    "_raw_text": raw_leaf_text
                }
                paper_questions.append(q_entry)

            else:
                # Letter has child roman numerals (e.g. 14a, 15b, 17b, 18c)
                first_rom = romans[0]
                if let_token["type"] != "SUB_COMBINED":
                    if first_rom["page"] == let_token["page"] and first_rom["y0"] > let_token["y0"] + 15:
                        b_start = get_safe_boundary(doc[let_token["page"]], let_token["y0"])
                        b_end = get_safe_boundary(doc[let_token["page"]], first_rom["y0"])
                        b_box = [int(b_start / ph * 1000), 70, int(b_end / ph * 1000), 940]
                        branch_stem_img = qp_proc.crop_box(
                            let_token["page"], b_box, dpi=300, clamp_horizontal=True,
                            is_stem=True, scan_markers=False,
                            padding=0, padding_top=4, padding_bottom=4
                        )
                        branch_stem_img = trim_vertical_whitespace(branch_stem_img, padding=8)
                        print(f"      Q{q_num}({let}) Branch Stem cropped on P{let_token['page']+1} (y0={b_start:.1f} to {b_end:.1f})", flush=True)
                    elif first_rom["page"] > let_token["page"]:
                        b_start = get_safe_boundary(doc[let_token["page"]], let_token["y0"])
                        b_box = [int(b_start / ph * 1000), 70, int(780.0 / ph * 1000), 940]
                        branch_stem_img = qp_proc.crop_box(
                            let_token["page"], b_box, dpi=300, clamp_horizontal=True,
                            is_stem=True, scan_markers=False,
                            padding=0, padding_top=4, padding_bottom=4
                        )
                        branch_stem_img = trim_vertical_whitespace(branch_stem_img, padding=8)
                        print(f"      Q{q_num}({let}) Branch Stem (Apparatus Diagram) cropped on P{let_token['page']+1} down to y=780", flush=True)

                # Process each roman leaf
                for r_idx, rom_tok in enumerate(romans):
                    rom_str = rom_tok["roman"]
                    full_qnum = f"{q_num}({let})({rom_str})"
                    canonical_qid = f"{q_num}{let}{rom_str}"

                    marks = 1
                    ms_found = False
                    sanitized = f"{q_num}_{let}_{rom_str}"
                    qid = f"{paper_id}_q{sanitized}"
                    ms_filename = f"{qid}_ms.png"
                    ms_save_path = os.path.join(ms_out_dir, ms_filename)
                    if ms_matcher:
                        ms_found = ms_matcher.crop_for_question(full_qnum, ms_save_path) or ms_matcher.crop_for_question(canonical_qid, ms_save_path)
                        ms_mark = ms_matcher.get_mark_for_question(canonical_qid) or ms_matcher.get_mark_for_question(full_qnum)
                        if ms_mark:
                            marks = ms_mark

                    p_rom = rom_tok["page"]
                    y0_rom = get_safe_boundary(doc[p_rom], rom_tok["y0"])
                    next_rom_token = romans[r_idx + 1] if r_idx + 1 < len(romans) else next_lg_token

                    if next_rom_token and next_rom_token["page"] == p_rom:
                        if next_rom_token["type"] == "TOTAL":
                            y1_rom = min(780.0, next_rom_token["y1"] + 4.0)
                        else:
                            y1_rom = get_safe_boundary(doc[p_rom], next_rom_token["y0"])
                        leaf_box = [int(y0_rom / ph * 1000), 70, int(y1_rom / ph * 1000), 940]
                        leaf_img = qp_proc.crop_box(
                            p_rom, leaf_box, dpi=300, clamp_horizontal=True,
                            scan_markers=False, padding=0, padding_top=4, padding_bottom=4
                        )
                    else:
                        y1_rom = 780.0
                        leaf_box = [int(y0_rom / ph * 1000), 70, int(780.0 / ph * 1000), 940]
                        leaf_img = qp_proc.crop_box(
                            p_rom, leaf_box, dpi=300, clamp_horizontal=True,
                            scan_markers=True, current_qnum=full_qnum,
                            padding=0, padding_top=4, padding_bottom=4
                        )
                    leaf_img = trim_vertical_whitespace(leaf_img, padding=8)

                    raw_rom_text = doc[p_rom].get_text("text", clip=pymupdf.Rect(70/1000*pw, y0_rom, 940/1000*pw, y1_rom)).strip()
                    m_rom_mark = re.findall(r"(?<!Total for Question\s)(?<!Question\s)\((\d{1,2})\)", raw_rom_text)
                    if m_rom_mark:
                        qp_m = int(m_rom_mark[-1])
                        if qp_m > 0 and (marks == 1 or qp_m != marks):
                            marks = qp_m

                    tiers = []
                    if root_stem_img is not None:
                        tiers.append((root_stem_img, f"QUESTION {q_num} CONTEXT"))
                    if branch_stem_img is not None:
                        tiers.append((branch_stem_img, f"QUESTION {q_num}({let}) SETUP"))
                    tiers.append((leaf_img, f"QUESTION {full_qnum} ({marks} mark{'s' if marks > 1 else ''})"))

                    final_img = compose_question_tiers(tiers)
                    q_filename = f"{qid}.png"
                    q_save_path = os.path.join(questions_out_dir, q_filename)
                    safe_save_image(final_img, q_save_path)

                    top, sub, subs = resolve_topic_for_question(str(q_num), f"({let})({rom_str})", cache_map, base_unit_code)
                    print(f"      Saved {full_qnum} ({marks}m) [{top} -> {sub}]", flush=True)

                    q_entry = {
                        "id": qid,
                        "paperId": paper_id,
                        "unit": unit_name,
                        "unitCode": unit_code,
                        "paperCode": paper_code,
                        "paper_code": paper_code,
                        "year": pair["year"],
                        "session": pair.get("session", "January"),
                        "series": series_name,
                        "questionNumber": full_qnum,
                        "parentQuestion": str(q_num),
                        "subPart": f"({let})({rom_str})",
                        "marks": marks,
                        "topic": top,
                        "subtopic": sub,
                        "subtopics": subs,
                        "section": "B",
                        "question_type": "theory",
                        "questionType": "theory",
                        "hasStem": bool(tiers and len(tiers) > 1),
                        "stemSummary": f"Question {q_num} context and setup" if (tiers and len(tiers) > 1) else None,
                        "questionImagePath": f"/crops_physics/questions/{q_filename}",
                        "markSchemeImagePath": f"/crops_physics/mark_schemes/{ms_filename}" if ms_found else None,
                        "_raw_text": raw_rom_text
                    }
                    paper_questions.append(q_entry)

                # Sibling Purge Rule:
                branch_stem_img = None

    # Reconcile topics with Gemini (with content-hash caching and rate-limiting cascade)
    if gemini_classifier:
        classify_batch = []
        for q in paper_questions:
            classify_batch.append({
                "id": q["id"],
                "q_num_label": q["questionNumber"],
                "text": q.get("_raw_text", ""),
                "image": None
            })

        classifications = gemini_classifier.classify_questions(
            questions=classify_batch,
            unit_name=unit_name,
            unit_code=base_unit_code
        )
        for q, cl in zip(paper_questions, classifications):
            if cl and cl.get("topic") and cl.get("subtopic"):
                q["topic"] = cl["topic"]
                q["subtopic"] = cl["subtopic"]
                q["subtopics"] = cl.get("subtopics") or [cl["subtopic"]]
            q.pop("_raw_text", None)
    else:
        for q in paper_questions:
            q.pop("_raw_text", None)

    # Group by parentQuestion to compute parent_question_id and all_subparts
    subparts_by_parent: Dict[str, List[str]] = {}
    for q_item in paper_questions:
        pq = str(q_item.get("parentQuestion") or "").strip()
        qn = str(q_item.get("questionNumber") or "").strip()
        if pq:
            subparts_by_parent.setdefault(pq, []).append(f"Q{qn}")

    for q_item in paper_questions:
        pq = str(q_item.get("parentQuestion") or "").strip()
        q_item["parent_question_id"] = f"Q{pq}" if pq else f"Q{q_item['questionNumber']}"
        q_item["all_subparts"] = subparts_by_parent.get(pq, [f"Q{q_item['questionNumber']}"])

    return paper_questions

def run_physics_extraction(
    papers_dir: str = "papers_physics",
    output_crops_dir: str = "crops_physics",
    output_dataset: str = "dataset_physics.json",
    manifest_path: str = "pipeline_manifest_physics.json",
    unit_filter: Optional[str] = None,
    series_filter: Optional[str] = None,
    paper_filter: Optional[str] = None,
    max_papers: Optional[int] = None,
    max_pages: Optional[int] = None,
    dry_run: bool = False,
    force: bool = False,
    process_all: bool = False
):
    print("=" * 65, flush=True)
    print("Edexcel IAL Physics Past Paper Extraction Pipeline (WPH11–WPH16)", flush=True)
    print("=" * 65, flush=True)

    manifest_mgr = ManifestManager(manifest_path)
    dataset_map: Dict[str, Dict[str, Any]] = {}

    if os.path.exists(output_dataset):
        try:
            with open(output_dataset, "r", encoding="utf-8") as f:
                existing_items = json.load(f)
                for item in existing_items:
                    dataset_map[item["id"]] = item
            print(f"Loaded {len(dataset_map)} existing questions from {output_dataset}.", flush=True)
        except Exception as e:
            print(f"Warning: Could not read existing dataset: {e}", flush=True)

    all_pairs = scan_physics_papers_directory(
        papers_dir=papers_dir,
        unit_filter=unit_filter,
        series_filter=series_filter
    )

    if paper_filter:
        pf = paper_filter.strip().lower()
        all_pairs = [
            p for p in all_pairs
            if pf in p["paper_id"].lower()
            or pf in p["que_filename"].lower()
            or pf in os.path.basename(p["que_path"]).lower()
        ]

    if not all_pairs:
        print(f"No Physics papers found matching filters (Dir: {papers_dir}, Unit: {unit_filter}, Series: {series_filter}, Paper: {paper_filter}).", flush=True)
        return

    print(f"\nDiscovered {len(all_pairs)} total paired Physics past papers across '{papers_dir}'.", flush=True)

    existing_paper_ids = set(q.get("paperId") for q in dataset_map.values() if q.get("paperId"))
    to_process = []
    to_skip = []

    for pair in all_pairs:
        is_done = manifest_mgr.is_paper_completed(pair, existing_dataset_paper_ids=existing_paper_ids)
        if is_done and not force:
            to_skip.append(pair)
        else:
            to_process.append(pair)

    print(f"Status: {len(to_skip)} already completed (will skip) | {len(to_process)} queued for processing.", flush=True)

    if max_papers:
        print(f"  (--max-papers limit applied: processing first {max_papers} papers).", flush=True)
        to_process = to_process[:max_papers]

    if dry_run:
        print("\n" + "-" * 65, flush=True)
        print("DRY-RUN PREVIEW OF PHYSICS BATCH INGESTION QUEUE:", flush=True)
        print("-" * 65, flush=True)
        for idx, p in enumerate(to_process, 1):
            ms_indicator = "Matched MS" if p["rms_path"] else "NO MS"
            print(f"  [{idx:02d}] QUEUED: [{p['series']}] {p['unit_code']} ({p['paper_code']}) | QP: {p['que_filename']} | {ms_indicator}", flush=True)
        for idx, p in enumerate(to_skip[:10], 1):
            print(f"  [--] SKIP:   [{p['series']}] {p['unit_code']} ({p['paper_code']}) -> already in manifest/dataset", flush=True)
        if len(to_skip) > 10:
            print(f"  ... and {len(to_skip) - 10} more completed papers.", flush=True)
        print("-" * 65, flush=True)
        return

    if not to_process:
        print("\nAll discovered papers are already extracted and checkpointed in manifest. Nothing to process!", flush=True)
        print("Use --force if you wish to re-extract completed papers.", flush=True)
        return

    questions_out_dir = os.path.join(output_crops_dir, "questions")
    ms_out_dir = os.path.join(output_crops_dir, "mark_schemes")
    os.makedirs(questions_out_dir, exist_ok=True)
    os.makedirs(ms_out_dir, exist_ok=True)

    cache_map = load_gemini_topic_cache()
    gemini_classifier = GeminiPhysicsExtractor()

    for paper_idx, pair in enumerate(to_process, 1):
        paper_id = pair["paper_id"]
        unit_code = pair["unit_code"]
        base_unit_code = pair.get("base_unit_code", unit_code)
        series_name = pair["series"]
        paper_code = pair.get("paper_code", f"{base_unit_code}/01")
        is_practical_unit = base_unit_code in ("WPH13", "WPH16")

        print("\n" + "=" * 65, flush=True)
        print(f">>> [{paper_idx}/{len(to_process)}] Processing Physics [{series_name}] [{unit_code}] ({paper_code})", flush=True)
        print(f"    QP: {pair['que_path']}", flush=True)
        print(f"    MS: {pair.get('rms_path') or 'None'}", flush=True)
        print("=" * 65, flush=True)

        try:
            qp_proc = PDFProcessor(pair["que_path"])
        except Exception as e:
            print(f"Error opening QP PDF '{pair['que_path']}': {e}", flush=True)
            continue

        ms_matcher = None
        if pair.get("rms_path") and os.path.exists(pair["rms_path"]):
            print(f"    Indexing Physics Mark Scheme: {pair['rms_path']}...", flush=True)
            try:
                ms_proc = PDFProcessor(pair["rms_path"])
                ms_matcher = MSMatcherPhysics(ms_proc, paper_id=f"{paper_id}_ms")
                ms_matcher.index_mark_scheme()
                print(f"    Found {len(ms_matcher.entries_by_qid)} mark scheme entries. Extracted {len(ms_matcher.mcq_answers)} MCQ keys.", flush=True)
            except Exception as e:
                print(f"    Warning: Failed to index Mark Scheme: {e}", flush=True)
                ms_matcher = None

        extracted_questions = process_physics_paper(
            pair=pair,
            qp_proc=qp_proc,
            ms_matcher=ms_matcher,
            questions_out_dir=questions_out_dir,
            ms_out_dir=ms_out_dir,
            cache_map=cache_map,
            gemini_classifier=gemini_classifier,
            max_pages=max_pages
        )
        qp_proc.close()

        # Update dataset map with new items
        for q in extracted_questions:
            dataset_map[q["id"]] = q

        # Audit & Validation Summary for this paper
        sec_a_mcqs = [q for q in extracted_questions if q.get("questionType") == "mcq"]
        sec_b_qs = [q for q in extracted_questions if q.get("questionType") != "mcq"]
        total_paper_marks = sum(q.get("marks", 0) for q in extracted_questions)

        print("\n" + "-" * 50, flush=True)
        print(f"[{paper_idx}/{len(to_process)}] Processing {paper_id}... {len(extracted_questions)}/{len(extracted_questions)} questions reconciled", flush=True)
        print(f"Paper {paper_id} Extraction Summary:", flush=True)
        print(f"  Total questions extracted: {len(extracted_questions)}", flush=True)
        print(f"  Section A MCQs: {len(sec_a_mcqs)} (Expected: {0 if is_practical_unit else 10})", flush=True)
        print(f"  Section B Theory items: {len(sec_b_qs)}", flush=True)
        expected_marks = get_expected_paper_marks(base_unit_code)
        marks_status = "RECONCILED 100%" if total_paper_marks == expected_marks else f"MISMATCH ({total_paper_marks - expected_marks:+d})"
        print(f"  Total marks: {total_paper_marks} (Expected: {expected_marks}) -> {marks_status}", flush=True)
        if not is_practical_unit:
            mcq_keys_summary = {q["questionNumber"]: q.get("correct_answer") for q in sec_a_mcqs}
            print(f"  MCQ Keys: {mcq_keys_summary}", flush=True)
        print("-" * 50 + "\n", flush=True)

        # Checkpoint: Save dataset_physics.json immediately after each paper
        final_list = list(dataset_map.values())
        with open(output_dataset, "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=2)

        paper_qids = [item["id"] for item in extracted_questions]
        manifest_mgr.record_completed_paper(pair, paper_qids)

        print(f">>> [CHECKPOINT SAVED] {paper_id} finished: {len(paper_qids)} questions. Physics dataset now has {len(dataset_map)} total questions.", flush=True)

    print("\n" + "=" * 65, flush=True)
    print(f"Physics batch ingestion complete! Total questions in dataset: {len(dataset_map)}", flush=True)
    print(f"Saved dataset: {output_dataset}", flush=True)
    print(f"Saved manifest: {manifest_path}", flush=True)
    print("=" * 65, flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Edexcel IAL Physics Topical Past Paper Extractor (WPH11–WPH16)")
    parser.add_argument("--all", action="store_true", help="Scan and process all series across papers_physics/")
    parser.add_argument("--papers-dir", default="papers_physics", help="Directory containing past paper series (default: papers_physics)")
    parser.add_argument("--output-crops-dir", default="crops_physics", help="Directory for cropped images (default: crops_physics)")
    parser.add_argument("--output-dataset", default="dataset_physics.json", help="Path to output dataset JSON (default: dataset_physics.json)")
    parser.add_argument("--manifest", default="pipeline_manifest_physics.json", help="Path to manifest JSON")
    parser.add_argument("--unit", default=None, help="Filter by unit (e.g. WPH11, 1, or U1)")
    parser.add_argument("--series", default=None, help="Filter by series (e.g. '2024 Jan' or '2024 January')")
    parser.add_argument("--paper", "--paper-id", dest="paper", default=None, help="Filter by paper ID or filename (e.g. 'wph11_2024_january')")
    parser.add_argument("--max-papers", type=int, default=None, help="Limit number of papers to process")
    parser.add_argument("--max-pages", type=int, default=None, help="Maximum pages to process per paper")
    parser.add_argument("--dry-run", action="store_true", help="Preview discovered pairs without extracting")
    parser.add_argument("--force", action="store_true", help="Force re-extraction even if already completed in manifest")

    args = parser.parse_args()
    run_physics_extraction(
        papers_dir=args.papers_dir,
        output_crops_dir=args.output_crops_dir,
        output_dataset=args.output_dataset,
        manifest_path=args.manifest,
        unit_filter=args.unit,
        series_filter=args.series,
        paper_filter=args.paper,
        max_papers=args.max_papers,
        max_pages=args.max_pages,
        dry_run=args.dry_run,
        force=args.force,
        process_all=args.all
    )
