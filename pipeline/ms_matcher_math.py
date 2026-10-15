"""
Mark Scheme Matcher for Edexcel IAL Mathematics (WMA11–WMA14, WME01, WST01):
- Document-level parsing of official Pearson Edexcel IAL Mathematics mark schemes
- Whole-question level matching (Q1, Q2, ..., Q11)
- Seamless multi-page stitching without visual seams or dividers
- Robust blank page filtering (skips empty examiner notes pages)
- High-resolution (300 DPI) rendering with vertical whitespace trimming
- Extracts total question marks from mark scheme rubrics and totals
"""

import os
import re
import time
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageChops
import pymupdf

from pipeline.pdf_processor import PDFProcessor


def trim_vertical_whitespace(img: Image.Image, padding: int = 10) -> Image.Image:
    """
    Trims empty vertical whitespace (top and bottom) from a rendered PIL image,
    preserving full horizontal width.
    """
    bg = Image.new(img.mode, img.size, (255, 255, 255))
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()
    if bbox:
        top = max(0, bbox[1] - padding)
        bottom = min(img.height, bbox[3] + padding)
        if bottom > top + 20:
            return img.crop((0, top, img.width, bottom))
    return img


def stitch_slices_seamlessly(img1: Image.Image, img2: Image.Image) -> Image.Image:
    """
    Stitches two vertical slices of the same question mark scheme seamlessly,
    trimming empty vertical margins and keeping consistent left alignment.
    """
    t1 = trim_vertical_whitespace(img1, padding=8)
    t2 = trim_vertical_whitespace(img2, padding=8)
    w = max(t1.width, t2.width)
    h = t1.height + t2.height
    result = Image.new("RGB", (w, h), color=(255, 255, 255))
    result.paste(t1, (0, 0))
    result.paste(t2, (0, t1.height))
    return result


def safe_save_image(img: Image.Image, path: str, format: str = "PNG", optimize: bool = True, max_retries: int = 5):
    """Safely saves a PIL image with retries against intermittent Windows file locking."""
    for attempt in range(max_retries):
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            img.save(path, format, optimize=optimize)
            return
        except OSError:
            if attempt == max_retries - 1:
                raise
            time.sleep(0.15 * (attempt + 1))


class MSMatcherMath:
    """
    Matches and extracts question mark schemes for Edexcel IAL Mathematics.
    Mathematics exams are structured into whole questions (Q1..Q11) without MCQs.
    """

    def __init__(self, ms_processor: PDFProcessor, paper_id: str, cache_dir: str = ".cache/gemini_math"):
        self.ms_proc = ms_processor
        self.paper_id = re.sub(r"_ms$", "", paper_id)
        self.cache_dir = cache_dir
        self.entries_by_qnum: Dict[int, Dict[str, Any]] = {}
        os.makedirs(cache_dir, exist_ok=True)
        self.index_mark_scheme()

    def _is_blank_or_boilerplate_page(self, page: pymupdf.Page) -> bool:
        """Determines whether a page in the mark scheme has no actual mark scheme content."""
        txt = page.get_text()
        lines = [l.strip() for l in txt.splitlines() if l.strip()]
        if not lines:
            return True

        non_boilerplate = []
        for l in lines:
            if re.match(r"^\*?P\d+", l) or re.match(r"^\d{1,3}$", l):
                continue
            if re.match(r"^[\uf0a2\s]+$", l):
                continue
            if "pearson" in l.lower() or "edexcel" in l.lower() or "turn over" in l.lower() or "blank page" in l.lower():
                continue
            non_boilerplate.append(l)

        return len(non_boilerplate) == 0

    def _find_ms_start_page(self) -> int:
        """Locates the first page where actual question mark scheme content begins."""
        doc = self.ms_proc.doc
        start_p = 0
        for p_idx in range(min(8, len(doc))):
            txt = doc[p_idx].get_text().lower()
            if ("general guidance" in txt or "general instructions" in txt
                    or "general principles" in txt or "qualifications" in txt
                    or "edexcel and btec" in txt):
                start_p = p_idx + 1
                continue
            if re.search(r"\b(?:question|qu|q)\b", txt) and re.search(r"\b(?:scheme|mark|note|answer)\b", txt):
                return p_idx
            for b in doc[p_idx].get_text("blocks"):
                if b[0] < 90 and re.match(r"^\s*1[\.\:\s\(a]", b[4], re.I):
                    return p_idx
        return start_p

    def index_mark_scheme(self):
        """
        Indexes all question mark scheme boundaries across the document.
        Detects start positions, multi-page spans, notes, and marks.
        """
        doc = self.ms_proc.doc
        total_pages = len(doc)
        if total_pages == 0:
            return

        # Candidate question regex: matches '1.', '1.(a)', '1(a)', '1a', '1', 'Question 1', 'Qu 1', '4 (a)(i)(ii)', '4 Way 1'
        q_pat = re.compile(
            r"^\s*(?:question\s+|qu\s+|q\.?\s*)?(\d{1,2})(?:\.|\:|\)|\s*\([a-z0-9ivx\s\)]+|\s*[a-z]\b|\s+way\b|\s*$)",
            re.IGNORECASE
        )

        start_p_idx = self._find_ms_start_page()

        # Discover all question starting points sequentially
        raw_starts: Dict[int, Tuple[int, float, float]] = {}  # q_num -> (page_idx, hdr_y0, q_y0)
        next_expected = 1

        for p_idx in range(start_p_idx, total_pages):
            page = doc[p_idx]
            if p_idx < 6:
                ptxt = page.get_text().lower()
                if ("general guidance" in ptxt or "general instructions" in ptxt
                        or "general principles" in ptxt or "qualifications" in ptxt
                        or "edexcel and btec" in ptxt):
                    continue

            # 1. Check all tables on this page
            for t in page.find_tables().tables:
                df = t.extract()
                if not df:
                    continue
                for r_idx, row in enumerate(df):
                    if not row or not row[0]:
                        continue
                    c0 = str(row[0]).strip()
                    m = q_pat.match(c0)
                    if m and int(m.group(1)) == next_expected:
                        row_y = t.rows[r_idx].bbox[1] if r_idx < len(t.rows) else t.bbox[1]
                        raw_starts[next_expected] = (p_idx, t.bbox[1], row_y)
                        next_expected += 1

            # 2. Check blocks on this page
            for b in page.get_text("blocks"):
                if b[0] < 100 and b[1] < 750:
                    lines = b[4].strip().splitlines()
                    for line in lines[:4]:
                        m = q_pat.match(line.strip())
                        if m and int(m.group(1)) == next_expected:
                            raw_starts[next_expected] = (p_idx, b[1] - 8.0, b[1])
                            next_expected += 1
                            break

            # 3. Check left column words
            left_words = [w for w in page.get_text("words") if w[0] < 90 and w[2] < 130 and 40 < w[1] < 750]
            for w in left_words:
                m = q_pat.match(w[4])
                if m and int(m.group(1)) == next_expected:
                    raw_starts[next_expected] = (p_idx, w[1] - 8.0, w[1])
                    next_expected += 1

        if not raw_starts:
            return

        sorted_qnums = sorted(raw_starts.keys())

        # Compute vertical slices and marks for each question
        for i, q_num in enumerate(sorted_qnums):
            start_p, start_hdr_y0, start_q_y0 = raw_starts[q_num]
            has_next = (i + 1 < len(sorted_qnums))
            next_q = sorted_qnums[i + 1] if has_next else None
            next_p, next_hdr_y0, next_q_y0 = raw_starts[next_q] if has_next else (total_pages, None, None)

            actual_y0 = max(35.0, start_hdr_y0 - 4.0)
            slices: List[Dict[str, Any]] = []

            if not has_next:
                # Last question: spans from start_p to the last content page
                last_content_p = start_p
                for check_p in range(start_p, total_pages):
                    if not self._is_blank_or_boilerplate_page(doc[check_p]):
                        last_content_p = check_p

                for p_idx in range(start_p, last_content_p + 1):
                    p_obj = doc[p_idx]
                    p_ph = p_obj.rect.height
                    if p_idx > start_p and self._is_blank_or_boilerplate_page(p_obj):
                        continue
                    y_top = actual_y0 if p_idx == start_p else 35.0
                    y_bot = p_ph - 38.0
                    slices.append({"page_index": p_idx, "y0": y_top, "y1": y_bot})

            elif start_p == next_p:
                # Same-page question: ends right above next question's header row
                cut_y = next_hdr_y0 if next_hdr_y0 is not None else next_q_y0
                y_bot = max(actual_y0 + 20.0, cut_y - 4.0)
                slices.append({"page_index": start_p, "y0": actual_y0, "y1": y_bot})

            else:
                # Multi-page or single-page question spanning [start_p .. next_p - 1]
                # Page next_p belongs strictly to next_q!
                for p_idx in range(start_p, next_p):
                    p_obj = doc[p_idx]
                    p_ph = p_obj.rect.height
                    if p_idx > start_p and self._is_blank_or_boilerplate_page(p_obj):
                        continue
                    y_top = actual_y0 if p_idx == start_p else 35.0
                    y_bot = p_ph - 38.0

                    # Check for orphan table header near bottom of page (y > ph * 0.70)
                    for t in p_obj.find_tables().tables:
                        if t.bbox[1] > p_ph * 0.70:
                            df_bot = t.extract()
                            if df_bot:
                                hdr_bot_txt = " ".join(str(c).lower() for r in df_bot[:2] for c in r if c)
                                if "questi" in hdr_bot_txt and ("scheme" in hdr_bot_txt or "marks" in hdr_bot_txt or "numbe" in hdr_bot_txt):
                                    y_bot = min(y_bot, t.bbox[1] - 4.0)
                    for b in p_obj.get_text("blocks"):
                        if b[1] > p_ph * 0.70 and re.search(r"Question\s+Number.*(?:Scheme|Marks)", b[4], re.I):
                            y_bot = min(y_bot, b[1] - 4.0)

                    slices.append({"page_index": p_idx, "y0": y_top, "y1": y_bot})

            # Extract marks from question text chunks
            question_text_chunks = []
            for sl in slices:
                p_obj = doc[sl["page_index"]]
                for b in p_obj.get_text("blocks"):
                    if b[1] >= sl["y0"] - 5 and b[3] <= sl["y1"] + 15:
                        question_text_chunks.append(b[4])
            full_q_text = "\n".join(question_text_chunks)

            # Look for mark markers: '(6 marks)', 'Total 6', '(Total for Question N is 6 marks)', '[Total 6]'
            marks_found: Optional[int] = None
            m_total = re.findall(r"\(Total\s+(?:for\s+Question\s+\d{1,2}\s+is\s+)?(\d{1,2})\s*marks?\)", full_q_text, re.I)
            if m_total:
                marks_found = int(m_total[-1])
            else:
                m_marks = re.findall(r"\((\d{1,2})\s*marks?\)", full_q_text, re.I)
                if m_marks:
                    marks_found = int(m_marks[-1])
                else:
                    m_kw = re.findall(r"\bTotal\s+(\d{1,2})\b", full_q_text, re.I)
                    if m_kw:
                        marks_found = int(m_kw[-1])
                    else:
                        m_sq = re.findall(r"\[Total\s*(\d{1,2})\]", full_q_text, re.I)
                        if m_sq:
                            marks_found = int(m_sq[-1])

            self.entries_by_qnum[q_num] = {
                "question_number": q_num,
                "slices": slices,
                "marks": marks_found,
                "text": full_q_text
            }

    def has_question(self, q_num: Any) -> bool:
        try:
            num = int(re.sub(r"[^\d]", "", str(q_num)))
            return num in self.entries_by_qnum
        except Exception:
            return False

    def get_all_question_numbers(self) -> List[int]:
        return sorted(self.entries_by_qnum.keys())

    def get_mark_for_question(self, q_num: Any) -> Optional[int]:
        try:
            num = int(re.sub(r"[^\d]", "", str(q_num)))
            entry = self.entries_by_qnum.get(num)
            return entry.get("marks") if entry else None
        except Exception:
            return None

    def crop_for_question(self, q_num: Any, output_path: str) -> bool:
        """
        Renders, crops, trims, and seamlessly stitches the complete mark scheme
        for the given question at 300 DPI.
        """
        try:
            num = int(re.sub(r"[^\d]", "", str(q_num)))
        except Exception:
            return False

        entry = self.entries_by_qnum.get(num)
        if not entry or not entry.get("slices"):
            return False

        slice_images: List[Image.Image] = []
        doc = self.ms_proc.doc

        for sl in entry["slices"]:
            p_idx = sl["page_index"]
            y0_pts = sl["y0"]
            y1_pts = sl["y1"]

            page = doc[p_idx]
            pw = page.rect.width
            ph = page.rect.height

            # Render 300 DPI page image
            page_img = self.ms_proc.render_page(p_idx, dpi=300)
            scale = page_img.height / ph

            # Use generous horizontal margins (8.0 pt from page edges) to prevent clipping
            # of notes near left margin (e.g. 'SC:', 'Examples of...') or wide formulas on right margin
            x0_px = int(max(0, 8.0 * scale))
            x1_px = int(min(page_img.width, (pw - 8.0) * scale))
            y0_px = int(max(0, y0_pts * scale))
            y1_px = int(min(page_img.height, y1_pts * scale))

            if y1_px <= y0_px + 20:
                continue

            crop = page_img.crop((x0_px, y0_px, x1_px, y1_px))
            trimmed = trim_vertical_whitespace(crop, padding=10)
            if trimmed.height > 20:
                slice_images.append(trimmed)

        if not slice_images:
            return False

        if len(slice_images) == 1:
            final_img = slice_images[0]
        else:
            final_img = slice_images[0]
            for next_slice in slice_images[1:]:
                final_img = stitch_slices_seamlessly(final_img, next_slice)

        safe_save_image(final_img, output_path)
        return True
