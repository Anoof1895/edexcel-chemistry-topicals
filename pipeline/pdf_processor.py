"""
PDF processing module:
- Converts PDF pages to 150 DPI for Gemini previews
- Converts PDF pages to 300 DPI for high-resolution student crops
- Normalizes bounding boxes and crops regions
- Stitches introductory stems above sub-questions with clean visual dividers
"""

import os
import re
from typing import Tuple, List, Optional
import pymupdf
from PIL import Image, ImageDraw, ImageFont

ROMAN_NUMS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]

UNIT_OR_TIME_FILTER = re.compile(
    r"^\s*(?:question\s+|q\.?\s*)?\d{1,3}[:.]?\s+(?:cm|dm|mm|m|g|mg|kg|mol|°|%|k?j|k?pa|v|s|sec|seconds?|min|minutes?|hours?|h|days?|weeks?|months?|years?|drops?|times?|marks?)[0-9\-–−/]*\b",
    re.I
)

def is_subsequent_marker(line_txt: str, current_qnum: Optional[str]) -> bool:
    """
    Determines whether a line matching marker_pat is strictly SUBSEQUENT to current_qnum.
    Prevents cropping logic from clamping above the prompt's own label (e.g. (a) or (i)).
    Rejects bare numbers, values, and units of measurement/time (e.g. '5 minutes 30 seconds', '25 cm3').
    Supports question-number prefixed subpart markers found in R-papers (e.g. '16 (b)', '16 (b) (i)').
    Supports full alphabetical subparts (a-z) and nested Roman numerals (i-x).
    """
    if not current_qnum or not line_txt:
        return bool(line_txt)
    line_clean = line_txt.replace("\xa0", " ").strip()
    if UNIT_OR_TIME_FILTER.search(line_clean):
        return False
    if re.search(r"total\s+for", line_clean, re.I):
        return False

    # Extract current components
    cur_parent = None
    clean_cur_q = re.sub(r"[\*]+", "", current_qnum).strip()
    m_cur_p = re.match(r"^(\d+)", clean_cur_q)
    if m_cur_p:
        try:
            cur_parent = int(m_cur_p.group(1))
        except ValueError:
            pass

    cur_alpha = None
    cur_roman = None
    # Check for two parenthesized groups first e.g. 10(b)(i) or 1(a)(ii)
    m_two = re.search(r"\(([a-z])\)\s*\(([ivx]+)\)", clean_cur_q, re.I)
    if m_two:
        cur_alpha = m_two.group(1).lower()
        cur_roman = m_two.group(2).lower()
    else:
        # Check single group
        m_single_r = re.search(r"\(([ivx]+)\)", clean_cur_q, re.I)
        m_single_a = re.search(r"\(([a-z])\)", clean_cur_q, re.I)
        if m_single_r and m_single_r.group(1).lower() in ("ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"):
            cur_roman = m_single_r.group(1).lower()
        elif m_single_a and m_single_a.group(1).lower() != "i":
            cur_alpha = m_single_a.group(1).lower()
        elif m_single_a and m_single_a.group(1).lower() == "i":
            cur_alpha = "i"
            cur_roman = "i"

    # Candidate components from line
    m_inline = re.match(r"^\s*\*?\s*(?:(?:question|q\.?)\s*)?(?:(\d{1,2})\s*)?\*?\s*(?:\(([a-z])\)\s*\*?\s*\(([ivx]{1,4})\)|([a-z])\s*\(([ivx]{1,4})\))\s*\*?", line_clean, re.I)
    m_roman_multi = re.match(r"^\s*\*?\s*(?:(?:question|q\.?)\s*)?(?:(\d{1,2})\s*)?\*?\s*\((ii|iii|iv|v|vi|vii|viii|ix|x)\)\s*\*?", line_clean, re.I)
    m_single = re.match(r"^\s*\*?\s*(?:(?:question|q\.?)\s*)?(?:(\d{1,2})\s*)?\*?\s*\(([a-z])\)\s*\*?", line_clean, re.I)
    m_qnum = re.match(r"^\s*\*?\s*(?:(?:question\s+|q\.?\s*)(\d{1,2})\b|(\d{1,2})\s*(?:\*?\s*\([a-z]\)|\.\s+|\t|\s{2,}(?-i:[A-Z])|\s+(?-i:[A-Z][a-z]+)))", line_clean, re.I)

    if m_inline:
        cand_p = int(m_inline.group(1)) if m_inline.group(1) else None
        cand_a = m_inline.group(2).lower()
        cand_r = m_inline.group(3).lower()
        if cand_p and cur_parent and cand_p != cur_parent:
            return cand_p > cur_parent
        if cur_alpha:
            if ord(cand_a) > ord(cur_alpha):
                return True
            if cand_a == cur_alpha:
                if cur_roman and cand_r in ROMAN_NUMS and cur_roman in ROMAN_NUMS:
                    return ROMAN_NUMS.index(cand_r) > ROMAN_NUMS.index(cur_roman)
                return False
            return False
        return True

    if m_roman_multi:
        cand_p = int(m_roman_multi.group(1)) if m_roman_multi.group(1) else None
        cand_r = m_roman_multi.group(2).lower()
        if cand_p and cur_parent and cand_p != cur_parent:
            return cand_p > cur_parent
        if cur_roman and cand_r in ROMAN_NUMS and cur_roman in ROMAN_NUMS:
            return ROMAN_NUMS.index(cand_r) > ROMAN_NUMS.index(cur_roman)
        if not cur_roman:
            return True
        return False

    if m_single:
        cand_p = int(m_single.group(1)) if m_single.group(1) else None
        cand_let = m_single.group(2).lower()
        if cand_p and cur_parent and cand_p != cur_parent:
            return cand_p > cur_parent

        if cand_let == "i":
            if cur_roman:
                return ROMAN_NUMS.index("i") > ROMAN_NUMS.index(cur_roman)
            if cur_alpha:
                return ord("i") > ord(cur_alpha)
            return True
        else:
            if cur_alpha:
                return ord(cand_let) > ord(cur_alpha)
            return True

    if m_qnum:
        num_str = m_qnum.group(1) or m_qnum.group(2)
        try:
            cand_num = int(num_str)
            if cand_num > 35:
                return False
            if cur_parent:
                return cand_num > cur_parent
        except ValueError:
            pass
        return True

    return False

class PDFProcessor:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.doc = pymupdf.open(pdf_path)
        self._cache_150 = {}
        self._cache_300 = {}

    def get_page_count(self) -> int:
        return len(self.doc)

    def render_page(self, page_index: int, dpi: int = 300) -> Image.Image:
        """
        Renders a PDF page to a PIL Image at specified DPI.
        Uses in-memory cache for fast repeated crops.
        """
        if dpi == 150:
            if page_index in self._cache_150:
                return self._cache_150[page_index]
            pix = self.doc[page_index].get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            self._cache_150[page_index] = img
            return img
        elif dpi == 300:
            if page_index in self._cache_300:
                return self._cache_300[page_index]
            pix = self.doc[page_index].get_pixmap(dpi=300)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            self._cache_300[page_index] = img
            return img
        else:
            pix = self.doc[page_index].get_pixmap(dpi=dpi)
            return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    def crop_box(
        self,
        page_index: int,
        box: List[float],
        dpi: int = 300,
        padding: int = 20,
        padding_top: Optional[int] = None,
        padding_bottom: Optional[int] = None,
        clamp_horizontal: bool = True,
        scan_after_y: Optional[float] = None,
        current_qnum: Optional[str] = None,
        scan_markers: bool = True,
        is_mcq: bool = False,
        is_stem: bool = False
    ) -> Image.Image:
        """
        Crops a region from the page image.
        box: [ymin, xmin, ymax, xmax] in 0-1000 scale or 0-1 scale.
        Adds +40px bottom padding so MCQ options (A, B, C, D) and formulas are never clipped.
        When clamp_horizontal=True (default), eliminates text squishing, tight cropping,
        and clipped edge margins by clamping left and right margins to the printable page area (7% to 94%).
        Strict Bottom Boundary Clamping:
        Scans page text for any subsequent marker ((a)-(g), (i)-(vi), Question X) below the current item,
        and strictly clamps ymax and lower 10px above the top of that marker so no subsequent preamble or part label bleeds in.
        When scan_markers=False (e.g. for mark schemes), bypasses marker scanning so table cells are never clipped.
        When is_mcq=True (Section A), strictly matches next sequential integer question (cur_parent + 1),
        immediate next subpart letter if applicable, or footer text, with an 80pt minimum height sanity guard.
        """
        img = self.render_page(page_index, dpi=dpi)
        w, h = img.size

        # Unnest if coordinates are wrapped in an outer list e.g. [[ymin, xmin, ymax, xmax]]
        while isinstance(box, (list, tuple)) and len(box) > 0 and isinstance(box[0], (list, tuple)):
            box = box[0]

        # Determine if coordinates are 0-1000 or 0-1
        scale = 1000.0 if max(box) > 1.0 else 1.0
        ymin, xmin, ymax, xmax = box

        # Ensure coordinate order sanity
        if ymin > ymax:
            ymin, ymax = ymax, ymin
        if xmin > xmax:
            xmin, xmax = xmax, xmin

        ymin = min(scale, max(0.0, float(ymin)))
        ymax = min(scale, max(0.0, float(ymax)))
        xmin = min(scale, max(0.0, float(xmin)))
        xmax = min(scale, max(0.0, float(xmax)))

        page = self.doc[page_index]
        pw, ph = page.rect.width, page.rect.height

        # Strict Top Boundary Clamping: Never expand above preceding text blocks or Section rubrics on question pages
        orig_ymin_pts = ymin / scale * ph
        page_blocks = page.get_text("blocks")
        prev_blocks = [b for b in page_blocks if b[3] <= orig_ymin_pts - 0.5 and b[3] > 30 and "DO NOT WRITE" not in b[4] and "*" not in b[4]]
        prev_text_y1_pts = max((b[3] for b in prev_blocks), default=None)

        rubric_pats = [
            re.compile(r"^\s*SECTION\s+[A-Z]", re.I),
            re.compile(r"^\s*Answer\s+ALL\s+the\s+questions", re.I),
            re.compile(r"^\s*Write\s+your\s+answers\s+in\s+the\s+spaces\s+provided", re.I),
        ]
        rubric_blocks = [b for b in page_blocks if any(rp.search(b[4]) for rp in rubric_pats) and b[3] <= orig_ymin_pts + 5]
        rubric_ceiling_pts = (max((b[3] for b in rubric_blocks), default=0) + 1.5) if rubric_blocks else None

        min_allowed_ymin_pts = 0.0
        if prev_text_y1_pts is not None:
            min_allowed_ymin_pts = max(min_allowed_ymin_pts, prev_text_y1_pts + 1.5)
        if rubric_ceiling_pts is not None:
            min_allowed_ymin_pts = max(min_allowed_ymin_pts, rubric_ceiling_pts)

        # Top Safety Padding: Back off ymin so character ascenders and question headers ('2', '3', 'T', etc.) are never sliced horizontally
        top_safety_pad = 12.0 if scale > 1.0 else 0.012
        if min_allowed_ymin_pts > 0:
            ymin_pts = max(min_allowed_ymin_pts, orig_ymin_pts - (top_safety_pad / scale * ph))
            ymin = ymin_pts / ph * scale
        else:
            ymin = max(0.0, ymin - top_safety_pad)

        # Strict Bottom Boundary Clamping:
        next_marker_y0_pts = None
        start_y_pts = (scan_after_y if scan_after_y is not None else ymin) / scale * ph
        active_table_y1 = None
        cur_question_total_y1 = None

        if scan_markers:
            if is_mcq:
                # Section A MCQ Marker Scanning:
                # Strictly matches next sequential integer question (cur_parent + 1),
                # immediate next subpart letter if applicable, or footer markers.
                cur_parent = None
                if current_qnum:
                    m_p = re.match(r"^(\d+)", current_qnum)
                    if m_p:
                        try:
                            cur_parent = int(m_p.group(1))
                        except ValueError:
                            pass

                cur_alpha = None
                cur_roman = None
                if current_qnum:
                    m_a = re.search(r"(?:\(([a-z])\)|(?:^|\b\d{1,2})([a-z])\b)", current_qnum, re.I)
                    if m_a:
                        cur_alpha = (m_a.group(1) or m_a.group(2)).lower()
                    m_r = re.search(r"\(([ivx]+)\)", current_qnum, re.I)
                    if m_r:
                        cur_roman = m_r.group(1).lower()

                mcq_footer_pat = re.compile(
                    r"^\s*(?:total\s+for\s+section\s+a|use\s+this\s+space\s+for\s+any\s+rough\s+working|anything\s+you\s+write\s+in\s+this\s+space|blank\s+page)",
                    re.IGNORECASE
                )
                rough_working_pat = re.compile(
                    r"rough\s+working|anything\s+you\s+write\s+in\s+this\s+space",
                    re.IGNORECASE
                )
                mcq_next_q_pat = re.compile(
                    r"^\s*(?:question\s+|q\.?\s*)?(\d{1,2})\s*(?:\t|\.\s+|\s{2,}|\s+[A-Z])",
                    re.IGNORECASE
                )
                total_mark_pat = re.compile(
                    r"^\s*\(Total\s+(?:for\s+Question\s+(\d+)\s*=\s*)?\d+\s*marks?\)",
                    re.IGNORECASE
                )
                sec_a_total_pat = re.compile(
                    r"^\s*TOTAL\s+FOR\s+SECTION\s+A\b",
                    re.IGNORECASE
                )
                footer_pat = re.compile(
                    r"^\s*(?:\*P\d+.*\*|Turn\s+over|\d{1,2})\s*$",
                    re.IGNORECASE
                )

                page_dict = page.get_text("dict")
                for b in page_dict.get("blocks", []):
                    if b.get("type") != 0:
                        continue
                    for l in b.get("lines", []):
                        line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                        line_y0 = l["bbox"][1]
                        line_y1 = l["bbox"][3]
                        if line_y0 >= start_y_pts + 15:
                            # 1. Check rough working (strictly clamp above it)
                            if rough_working_pat.search(line_txt):
                                cur_ymax_pts = ymax / scale * ph
                                clamp_rw_pts = line_y0 - 6
                                if clamp_rw_pts < cur_ymax_pts:
                                    ymax = clamp_rw_pts / ph * scale
                                if next_marker_y0_pts is None or clamp_rw_pts < next_marker_y0_pts:
                                    next_marker_y0_pts = clamp_rw_pts

                            # 2. Check Total mark line
                            m_tot = total_mark_pat.match(line_txt)
                            if m_tot:
                                q_in_tot = m_tot.group(1)
                                if q_in_tot and cur_parent is not None and int(q_in_tot) == cur_parent:
                                    # Total line belongs to THIS question: clamp immediately below it
                                    clamp_tot_pts = line_y1 + 4
                                    cur_ymax_pts = ymax / scale * ph
                                    if clamp_tot_pts < cur_ymax_pts:
                                        ymax = clamp_tot_pts / ph * scale
                                else:
                                    # Total line belongs to subsequent question or section
                                    cur_ymax_pts = ymax / scale * ph
                                    clamp_tot_pts = line_y0 - 4
                                    if clamp_tot_pts < cur_ymax_pts:
                                        ymax = clamp_tot_pts / ph * scale
                                    if next_marker_y0_pts is None or clamp_tot_pts < next_marker_y0_pts:
                                        next_marker_y0_pts = clamp_tot_pts

                            # 3. Check Section A total (strictly clamp above it)
                            if sec_a_total_pat.search(line_txt):
                                cur_ymax_pts = ymax / scale * ph
                                clamp_sec_pts = line_y0 - 4
                                if clamp_sec_pts < cur_ymax_pts:
                                    ymax = clamp_sec_pts / ph * scale
                                if next_marker_y0_pts is None or clamp_sec_pts < next_marker_y0_pts:
                                    next_marker_y0_pts = clamp_sec_pts

                            # 4. Check footer text
                            if mcq_footer_pat.match(line_txt):
                                if next_marker_y0_pts is None or line_y0 < next_marker_y0_pts:
                                    next_marker_y0_pts = line_y0
                            elif line_y0 > ph * 0.85 and (re.search(r"\*P\d+|Turn\s+over", line_txt, re.I) or (line_y0 > ph * 0.91 and re.match(r"^\s*\d{1,2}\s*$", line_txt))):
                                if active_table_y1 is None or line_y0 >= active_table_y1 - 2:
                                    if next_marker_y0_pts is None or line_y0 < next_marker_y0_pts:
                                        next_marker_y0_pts = line_y0

                            # 5. Check next sequential integer question
                            line_x0 = l["bbox"][0]
                            if line_x0 < 120:
                                m_q = mcq_next_q_pat.match(line_txt) or re.match(r"^\s*(?:question\s+|q\.?\s*)?(\d{1,2})[:.]?(?:\s+|\t)+(?:\([a-z]\)|[A-Za-z])", line_txt, re.I)
                                if m_q and not re.search(r"^\s*(?:question\s+|q\.?\s*)?\d{1,3}[:.]?\s+(?:cm|dm|g|mol|°|%|k?j|k?pa|v|s|m|h|min)[0-9\-–−]*\b", line_txt, re.I):
                                    if cur_parent is not None:
                                        try:
                                            cand = int(m_q.group(1))
                                            if cand > cur_parent and cand <= 20:
                                                clamp_q_pts = line_y0 - 4
                                                cur_ymax_pts = ymax / scale * ph
                                                if clamp_q_pts < cur_ymax_pts:
                                                    ymax = clamp_q_pts / ph * scale
                                                if next_marker_y0_pts is None or clamp_q_pts < next_marker_y0_pts:
                                                    next_marker_y0_pts = clamp_q_pts
                                        except ValueError:
                                            pass

                            # 6. Check next sequential subpart letter (e.g. (b) following (a))
                            if cur_alpha is not None and line_x0 < 120:
                                m_sub = re.match(r"^\s*\*?\s*(?:\d{1,2}\s*)?\*?\s*\(([a-z])\)\s*\*?(?:\s+|$)", line_txt, re.I)
                                if m_sub:
                                    found_alpha = m_sub.group(1).lower()
                                    if ord(found_alpha) > ord(cur_alpha):
                                        if next_marker_y0_pts is None or line_y0 < next_marker_y0_pts:
                                            next_marker_y0_pts = line_y0

                            # 7. Check next sequential roman numeral (e.g. (ii) following (i))
                            if cur_roman is not None and line_x0 < 120:
                                m_rom = re.match(r"^\s*\*?\s*(?:\d{1,2}\s*)?\*?\s*(?:\([a-z]\)\s*)?\*?\s*\(([ivx]+)\)\s*\*?(?:\s+|$)", line_txt, re.I)
                                if m_rom:
                                    found_rom = m_rom.group(1).lower()
                                    if found_rom in ROMAN_NUMS and cur_roman in ROMAN_NUMS:
                                        if ROMAN_NUMS.index(found_rom) > ROMAN_NUMS.index(cur_roman):
                                            if next_marker_y0_pts is None or line_y0 < next_marker_y0_pts:
                                                next_marker_y0_pts = line_y0

                # Option D & Total Line Safety Net for MCQs:
                # Under NO circumstance may an MCQ crop terminate before its Option D block.
                # However, if a subsequent subpart exists (next_marker_y0_pts is set),
                # Option D must never extend past that next subpart!
                opt_d_blocks = [
                    b for b in page_blocks
                    if b[1] >= start_y_pts + 10 and re.match(r"^\s*D\b", b[4].strip(), re.I)
                ]
                if opt_d_blocks:
                    # Filter out any Option D that belongs to a subsequent subpart!
                    if next_marker_y0_pts is not None:
                        opt_d_blocks = [b for b in opt_d_blocks if b[1] < next_marker_y0_pts]
                    if opt_d_blocks:
                        b_d = min(opt_d_blocks, key=lambda b: b[1])
                        opt_d_y1 = b_d[3] + 4
                        cur_ymax_pts = ymax / scale * ph
                        if cur_ymax_pts < opt_d_y1:
                            ymax = opt_d_y1 / ph * scale

                # Only expand to question Total line if this is the final subpart on the page (no next subpart marker below it)
                if cur_parent is not None and next_marker_y0_pts is None:
                    tot_blocks = [
                        b for b in page_blocks
                        if b[1] >= start_y_pts + 10 and re.search(rf"\(Total\s+(?:for\s+Question\s+{cur_parent}\s*=\s*)?\d+\s*marks?\)", b[4], re.I)
                    ]
                    if tot_blocks:
                        b_tot = min(tot_blocks, key=lambda b: b[1])
                        tot_y1 = b_tot[3] + 4
                        cur_ymax_pts = ymax / scale * ph
                        if cur_ymax_pts < tot_y1:
                            ymax = tot_y1 / ph * scale
            else:
                # Theory / Section B Marker Scanning:
                marker_pat = re.compile(
                    r"^\s*\*?\s*(?:(?:\d{1,2}\s*)?\*?\s*\(([a-z])\)\s*\*?(?:\s*\(([ivx]{1,4})\))?|(?:\d{1,2}\s*)?\*?\s*\(([ivx]{1,4})\)|(?:question\s+|\*+\s*|q\.?\s*)(\d{1,2})\b|(?:\*+\s*)?(\d{1,2})\s*(?:\*?\s*\([a-z]\)|\.\s+|\t|\s{2,}(?-i:[A-Z])|\s+(?-i:[A-Z][a-z]+)))",
                    re.IGNORECASE
                )
                totals_banner_pat = re.compile(
                    r"^\s*(?:total\s+for\s+section\b|total\s+for\s+paper\b|\(total\s+(?:for\s+question\s+\d+\s*=\s*)?\d+\s*marks?\))",
                    re.IGNORECASE
                )
                footer_pat = re.compile(
                    r"^\s*(?:\*P\d+.*\*|Turn\s+over|\d{1,2})\s*$",
                    re.IGNORECASE
                )
                page_dict = page.get_text("dict")
                cur_parent_int = None
                if current_qnum:
                    _m_p = re.match(r"^(\d+)", current_qnum)
                    if _m_p:
                        try:
                            cur_parent_int = int(_m_p.group(1))
                        except ValueError:
                            pass

                cur_question_total_y1 = None
                for b in page_dict.get("blocks", []):
                    if b.get("type") != 0:
                        continue
                    for l in b.get("lines", []):
                        line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).replace("\xa0", " ").strip()
                        line_y0 = l["bbox"][1]
                        line_y1 = l["bbox"][3]
                        if line_y0 >= start_y_pts + 15:
                            m_tot_line = re.search(r"\(Total\s+(?:for\s+Question\s+(\d+)\s*=\s*)?\d+\s*marks?\)", line_txt, re.I)
                            if m_tot_line:
                                tot_p_num = int(m_tot_line.group(1)) if m_tot_line.group(1) else None
                                if tot_p_num is not None and cur_parent_int is not None and tot_p_num == cur_parent_int:
                                    cur_question_total_y1 = line_y1 + 4
                                else:
                                    if next_marker_y0_pts is None or line_y0 < next_marker_y0_pts:
                                        next_marker_y0_pts = line_y0
                            elif re.search(r"total\s+for\s+(?:section|paper)\b", line_txt, re.I):
                                if next_marker_y0_pts is None or line_y0 < next_marker_y0_pts:
                                    next_marker_y0_pts = line_y0
                            elif marker_pat.match(line_txt):
                                if not UNIT_OR_TIME_FILTER.search(line_txt):
                                    if not current_qnum or is_subsequent_marker(line_txt, current_qnum):
                                        if l["bbox"][0] < 120:
                                            if next_marker_y0_pts is None or line_y0 < next_marker_y0_pts:
                                                next_marker_y0_pts = line_y0
                            elif line_y0 > ph * 0.85 and (re.search(r"\*P\d+|Turn\s+over", line_txt, re.I) or (line_y0 > ph * 0.91 and re.match(r"^\s*\d{1,2}\s*$", line_txt))):
                                if next_marker_y0_pts is None or line_y0 < next_marker_y0_pts:
                                    next_marker_y0_pts = line_y0

            if next_marker_y0_pts is not None:
                max_allowed_y_pts = max(start_y_pts + 15, next_marker_y0_pts - (4 if is_mcq else 10))
                clamped_height_pts = max_allowed_y_pts - start_y_pts
                # Minimum Height Sanity Guard: if clamped height < 20 pts, ignore clamp to prevent sliver collapse
                if clamped_height_pts < 20:
                    next_marker_y0_pts = None
                else:
                    cur_ymax_pts = ymax / scale * ph
                    if cur_ymax_pts > max_allowed_y_pts:
                        ymax = max_allowed_y_pts / ph * scale

            # Active Table Detection & Complete Table Enclosure:
            # Detect any table starting in or near this question's vertical range, strictly scoped before next marker
            table_limit_y = (next_marker_y0_pts - 10) if next_marker_y0_pts is not None else (ph * 0.95)
            try:
                tables = page.find_tables().tables
                for t in tables:
                    if t.bbox[1] >= start_y_pts - 2 and t.bbox[1] < table_limit_y:
                        if active_table_y1 is None or t.bbox[3] > active_table_y1:
                            active_table_y1 = t.bbox[3]
            except Exception:
                pass

            # Vector Table Grid Fallback:
            # If find_tables() does not detect the table, inspect page.get_drawings() for horizontal grid lines / boxes
            if active_table_y1 is None:
                grid_lines = []
                for d in page.get_drawings():
                    r = d["rect"]
                    if r.y0 >= start_y_pts - 2 and r.y0 < table_limit_y and r.y1 < ph * 0.92:
                        if (r.width > pw * 0.35 and r.height <= 5) or (r.height > 40 and r.width > pw * 0.35) or (r.height > 40 and r.width <= 5):
                            grid_lines.append(r.y1)
                if grid_lines:
                    active_table_y1 = max(grid_lines)

            # Fix 4: Theory prompt mark indicator and text enclosure:
            # Enclose all question command sentences and trailing mark indicator e.g. '(1)'
            if not is_mcq:
                # Find page footer boundary
                footer_blocks = [
                    b for b in page.get_text("blocks")
                    if b[1] > ph * 0.85 and (
                        re.search(r"\*P\d+|Turn\s+over", b[4], re.I)
                        or (b[1] > ph * 0.91 and re.match(r"^\s*\d{1,2}\s*$", b[4].strip()))
                    )
                ]
                footer_y0 = min((b[1] for b in footer_blocks), default=ph * 0.95)

                mark_pat_indicator = re.compile(r"\(\s*(\d{1,2})\s*\)")
                theory_mark_y1 = None
                page_dict = page.get_text("dict")
                for b in page_dict.get("blocks", []):
                    if b.get("type") != 0:
                        continue
                    for l in b.get("lines", []):
                        line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                        line_y0 = l["bbox"][1]
                        line_y1 = l["bbox"][3]
                        if line_y0 >= start_y_pts - 5 and (next_marker_y0_pts is None or line_y1 <= next_marker_y0_pts):
                            if mark_pat_indicator.search(line_txt):
                                theory_mark_y1 = line_y1

                # Scan for all prompt text blocks prior to next marker or footer
                limit_y = (next_marker_y0_pts - (4 if is_mcq else 10)) if next_marker_y0_pts is not None else (footer_y0 - 6)
                prompt_text_blocks = []
                for b in page.get_text("blocks"):
                    if b[1] >= start_y_pts - 5 and b[3] <= limit_y + 8:
                        t_clean = b[4].strip()
                        is_dots = bool(re.match(r"^[\s\.\-_–—]+$", t_clean))
                        is_footer = "DO NOT WRITE" in t_clean or "*" in t_clean or "Turn over" in t_clean or bool(re.search(r"total\s+for", t_clean, re.I)) or (b[1] > ph * 0.91 and bool(re.match(r"^\s*\d{1,2}\s*$", t_clean)))
                        is_marker = bool(marker_pat.match(t_clean)) and (not current_qnum or is_subsequent_marker(t_clean, current_qnum))
                        if not is_dots and not is_footer and not is_marker and len(t_clean) > 0:
                            prompt_text_blocks.append(b)

                lowest_prompt_text_y1 = max((b[3] for b in prompt_text_blocks), default=start_y_pts) if prompt_text_blocks else start_y_pts
                min_prompt_enclosure_y = max(lowest_prompt_text_y1 + 8, (theory_mark_y1 + 8) if theory_mark_y1 is not None else 0)
                min_prompt_enclosure_y = min(limit_y, min_prompt_enclosure_y)

                text_below_mark = []
                for b in prompt_text_blocks:
                    if b[1] >= (theory_mark_y1 if theory_mark_y1 is not None else start_y_pts) + 2:
                        if theory_mark_y1 is None or not mark_pat_indicator.search(b[4].strip()):
                            text_below_mark.append(b)

                drawings_below_mark = []
                if theory_mark_y1 is not None:
                    drawings_below_mark = [
                        d for d in page.get_drawings()
                        if 5 <= d["rect"].height < ph * 0.75
                        and 5 <= d["rect"].width < pw * 0.85
                        and d["rect"].y0 >= theory_mark_y1 - 2
                        and (next_marker_y0_pts is None or d["rect"].y1 <= next_marker_y0_pts + 5)
                        and d["rect"].y1 < ph * 0.92
                    ]

                if theory_mark_y1 is not None and not drawings_below_mark and not text_below_mark and (active_table_y1 is None or active_table_y1 <= start_y_pts):
                    # Pure theory prompt ending with mark indicator (no fill-ins, no drawings, no active table below mark)
                    dot_lines_below = [
                        b for b in page.get_text("blocks")
                        if b[1] >= theory_mark_y1 - 2 and b[3] <= limit_y
                        and re.match(r"^[\s\.\-_–—]+$", b[4].strip())
                    ]
                    tot_blocks = [
                        b for b in page.get_text("blocks")
                        if b[1] >= start_y_pts and b[3] <= limit_y
                        and re.search(r"\(Total\s+(?:for\s+Question\s+(\d+)\s*=\s*)?\d+\s*marks?\)", b[4], re.I)
                    ]
                    content_below = []
                    if dot_lines_below:
                        content_below.append(max(b[3] for b in dot_lines_below))
                    if tot_blocks:
                        content_below.append(max(b[3] for b in tot_blocks))

                    if content_below:
                        snap_theory_y = min(limit_y, max(content_below) + 8)
                    else:
                        snap_theory_y = theory_mark_y1 + 8

                    cur_ymax_pts = ymax / scale * ph
                    if snap_theory_y < cur_ymax_pts:
                        ymax = snap_theory_y / ph * scale
                    elif cur_ymax_pts < snap_theory_y:
                        ymax = min(limit_y, snap_theory_y) / ph * scale
                elif text_below_mark or (active_table_y1 is not None and active_table_y1 > start_y_pts):
                    # Fill-in prompts exist below the mark indicator (e.g. Be 1s2, Ca 1s2, or answer tables)
                    # Enclose all text blocks up to the last prompt item and its writing line
                    last_text_y1 = max((b[3] for b in text_below_mark), default=start_y_pts)
                    dot_lines_below = [
                        b for b in page.get_text("blocks")
                        if b[1] >= last_text_y1 - 2 and (next_marker_y0_pts is None or b[3] <= next_marker_y0_pts)
                        and re.match(r"^[\s\.\-_–—]+$", b[4].strip())
                    ]
                    if dot_lines_below:
                        last_dot_y1 = max(b[3] for b in dot_lines_below)
                        snap_y = min(last_dot_y1 + 8, (next_marker_y0_pts - 10) if next_marker_y0_pts is not None else (last_dot_y1 + 8))
                    else:
                        snap_y = min(last_text_y1 + 10, (next_marker_y0_pts - 10) if next_marker_y0_pts is not None else (last_text_y1 + 10))

                    if active_table_y1 is not None and active_table_y1 > start_y_pts:
                        table_bottom_clamp = min(active_table_y1 + 8, (next_marker_y0_pts - 10) if next_marker_y0_pts is not None else (active_table_y1 + 8))
                        snap_y = max(snap_y, table_bottom_clamp)

                    if min_prompt_enclosure_y > 0:
                        snap_y = max(snap_y, min_prompt_enclosure_y)

                    cur_ymax_pts = ymax / scale * ph
                    if cur_ymax_pts < snap_y:
                        ymax = snap_y / ph * scale
                    elif snap_y < cur_ymax_pts and next_marker_y0_pts is not None:
                        ymax = min(cur_ymax_pts, snap_y) / ph * scale

                # Ensure ymax always encloses all prompt instruction sentences and the trailing mark indicator
                if min_prompt_enclosure_y > 0:
                    cur_ymax_pts = ymax / scale * ph
                    if cur_ymax_pts < min_prompt_enclosure_y:
                        ymax = min_prompt_enclosure_y / ph * scale

                # Complete Table Enclosure: Ensure ymax strictly encloses the active table
                if active_table_y1 is not None and active_table_y1 > start_y_pts:
                    cur_ymax_pts = ymax / scale * ph
                    target_table_ymax_pts = min(ph * 0.95, active_table_y1 + 8)
                    if next_marker_y0_pts is not None:
                        target_table_ymax_pts = min(target_table_ymax_pts, next_marker_y0_pts - 10)
                    if target_table_ymax_pts > cur_ymax_pts:
                        cur_ymax_pts = target_table_ymax_pts
                        ymax = cur_ymax_pts / ph * scale

        # Enclose Vector Drawings (e.g. apparatus setups, graphs, diagrams):
        # Inspect page.get_drawings() for vector paths located below prompt line and above next marker.
        # Only enclose drawings for question prompts (when scan_markers=True), NEVER on mark schemes!
        if scan_markers:
            cur_ymax_pts = ymax / scale * ph
            relevant_drawings = [
                d for d in page.get_drawings()
                if 5 <= d["rect"].height < ph * 0.75
                and 5 <= d["rect"].width < pw * 0.85
                and d["rect"].y0 >= start_y_pts - 10
                and (next_marker_y0_pts is None or d["rect"].y1 <= next_marker_y0_pts + 5)
                and d["rect"].y1 < ph * 0.92
            ]
            if relevant_drawings:
                max_draw_y1 = max(d["rect"].y1 for d in relevant_drawings)
                max_allowed_y = (next_marker_y0_pts - 4) if next_marker_y0_pts is not None else (ph * 0.92)
                cur_ymax_pts = max(cur_ymax_pts, min(max_allowed_y, max_draw_y1 + 16))
                ymax = cur_ymax_pts / ph * scale
                max_draw_x1 = max(d["rect"].x1 for d in relevant_drawings)
                xmax_pts = max(xmax / scale * pw, min(pw * 0.915, max_draw_x1 + 16))
                xmax = xmax_pts / pw * scale

        # Total line enclosure: Ensure ymax encloses the current question's total line if detected
        if cur_question_total_y1 is not None:
            cur_ymax_pts = ymax / scale * ph
            if cur_question_total_y1 > cur_ymax_pts:
                cur_ymax_pts = min(ph * 0.96, cur_question_total_y1)
                ymax = cur_ymax_pts / ph * scale

        # Absolute Hard Clamp at Next Marker:
        # Under NO circumstances can any crop touch or cross into the next question or subpart marker
        if scan_markers and next_marker_y0_pts is not None:
            hard_clamp_pts = next_marker_y0_pts - (4 if is_mcq else 10)
            cur_ymax_pts = ymax / scale * ph
            if cur_ymax_pts > hard_clamp_pts:
                ymax = hard_clamp_pts / ph * scale

        if is_stem:
            # Force full printable width on all question and part stems:
            # Base printable bounds: crop_xmin = 0.08 * page_width, crop_xmax = 0.915 * page_width
            crop_xmin = 0.08 * pw
            box_draws = [d['rect'] for d in page.get_drawings() if d['rect'].width > pw * 0.7 and d['rect'].height > 400]
            if box_draws:
                border = box_draws[0]
                if border.x0 < pw * 0.07:
                    # 2024-2026 papers: border at ~35pt, text begins ~42.5pt. Keep left margin inside border without clipping text
                    crop_xmin = max(border.x0 + 2.0, min(crop_xmin, pw * 0.065))
                else:
                    crop_xmin = max(crop_xmin, border.x0 + 2.0)
                crop_xmax = min(border.x1 - 2.0, pw * 0.915)
            else:
                gutter_blocks = [b for b in page.get_text("blocks") if "DO NOT WRITE" in b[4]]
                gutter_left = max([b[2] for b in gutter_blocks if b[0] < pw * 0.2], default=0)
                gutter_right = min([b[0] for b in gutter_blocks if b[2] > pw * 0.8], default=pw)
                crop_xmin = max(gutter_left + 2.0, min(crop_xmin, pw * 0.065))
                crop_xmax = min(gutter_right - 4.0, pw * 0.915)
            left = int(crop_xmin / pw * w)
            right = int(crop_xmax / pw * w)
        elif clamp_horizontal:
            # Check if page has an outer bounding box drawing (e.g. 2019-2020 has border at x0=57.8, x1=537.2; 2024-2026 at x0=35.0, x1=560.3)
            box_draws = [d['rect'] for d in page.get_drawings() if d['rect'].width > pw * 0.7 and d['rect'].height > 400]
            if box_draws:
                # Clamp cleanly inside the outer border to strip the border lines and gutter text
                border = box_draws[0]
                left = int((border.x0 + 2.0) / pw * w)
                right = int((border.x1 - 2.0) / pw * w)
            else:
                # Scan page for vertical margin gutter text ("DO NOT WRITE IN THIS AREA")
                gutter_blocks = [b for b in page.get_text("blocks") if "DO NOT WRITE" in b[4]]
                gutter_left = max([b[2] for b in gutter_blocks if b[0] < pw * 0.2], default=0)
                gutter_right = min([b[0] for b in gutter_blocks if b[2] > pw * 0.8], default=pw)
                left = int(max(gutter_left + 2.0, pw * 0.065) / pw * w)
                right = int(min(gutter_right - 4.0, pw * 0.94) / pw * w)
        else:
            left = max(0, int(xmin / scale * w) - padding)
            right = min(w, int(xmax / scale * w) + padding)

        top_pad = padding_top if padding_top is not None else max(padding, 16)
        upper = int(ymin / scale * h) - top_pad
        if min_allowed_ymin_pts > 0:
            min_upper_px = int(min_allowed_ymin_pts / ph * h)
            upper = max(upper, min_upper_px)
        upper = max(0, upper)
        bot_pad = padding_bottom if padding_bottom is not None else max(padding, 16)
        lower = min(h, int(ymax / scale * h) + bot_pad)

        # Ensure padding_bottom never causes lower to cross or touch next_marker_y0_pts
        if scan_markers and next_marker_y0_pts is not None:
            max_lower_px = int((next_marker_y0_pts - (4 if is_mcq else 10)) / ph * h)
            if max_lower_px > upper + 20:
                lower = min(lower, max_lower_px)

        # Robust Safety Clamping: Ensure valid, non-empty bounding box within image boundaries
        left = max(0, min(left, w - 20))
        right = min(w, max(right, left + 10))
        if right <= left:
            left = max(0, right - 20)
            if right <= left:
                right = min(w, left + 20)

        upper = max(0, min(upper, h - 20))
        lower = min(h, max(lower, upper + 10))
        if lower <= upper:
            upper = max(0, lower - 20)
            if lower <= upper:
                lower = min(h, upper + 20)

        return img.crop((left, upper, right, lower))

    @staticmethod
    def calculate_vertical_overlap(box_a: List[float], box_b: List[float]) -> float:
        """
        Calculates the 1D vertical overlap between two bounding boxes [ymin, xmin, ymax, xmax].
        Returns the overlap ratio relative to the smaller box's height:
        overlap_height / min(height_a, height_b)
        """
        while isinstance(box_a, (list, tuple)) and len(box_a) > 0 and isinstance(box_a[0], (list, tuple)):
            box_a = box_a[0]
        while isinstance(box_b, (list, tuple)) and len(box_b) > 0 and isinstance(box_b[0], (list, tuple)):
            box_b = box_b[0]

        scale_a = 1000.0 if max(box_a) > 1.0 else 1.0
        scale_b = 1000.0 if max(box_b) > 1.0 else 1.0

        a_ymin, a_ymax = box_a[0] / scale_a, box_a[2] / scale_a
        b_ymin, b_ymax = box_b[0] / scale_b, box_b[2] / scale_b

        h_a = max(0.001, a_ymax - a_ymin)
        h_b = max(0.001, b_ymax - b_ymin)

        overlap = max(0.0, min(a_ymax, b_ymax) - max(a_ymin, b_ymin))
        return overlap / min(h_a, h_b)

    @staticmethod
    def stitch_stem_and_question(
        stem_img: Image.Image,
        question_img: Image.Image,
        stem_label: str = "QUESTION STEM / SHARED CONTEXT",
        question_label: str = "SUB-QUESTION"
    ) -> Image.Image:
        """
        Stitches an introductory question stem above the sub-question.
        Adds clean visual divider banners between them.
        """
        # Calculate target width
        content_w = max(stem_img.width, question_img.width)
        margin = 24
        target_w = content_w + margin * 2

        banner_h = 36
        divider_h = 20

        total_h = (
            margin
            + banner_h
            + stem_img.height
            + divider_h
            + banner_h
            + question_img.height
            + margin
        )

        # Background canvas - crisp white background matching paper
        stitched = Image.new("RGB", (target_w, total_h), color=(255, 255, 255))
        draw = ImageDraw.Draw(stitched)

        current_y = margin

        # 1. Stem Header Banner
        draw.rectangle(
            [margin, current_y, target_w - margin, current_y + banner_h],
            fill=(241, 245, 249), # light slate-100
            outline=(203, 213, 225), # slate-300
            width=1
        )
        draw.text(
            (margin + 12, current_y + 9),
            f"▼ {stem_label}",
            fill=(71, 85, 105) # slate-600
        )
        current_y += banner_h + 6

        # 2. Paste Stem Image (centered horizontally)
        stem_x = margin + (content_w - stem_img.width) // 2
        stitched.paste(stem_img, (stem_x, current_y))
        current_y += stem_img.height + divider_h

        # 3. Sub-Question Header Banner
        draw.rectangle(
            [margin, current_y, target_w - margin, current_y + banner_h],
            fill=(238, 242, 255), # indigo-50
            outline=(199, 210, 254), # indigo-200
            width=1
        )
        draw.text(
            (margin + 12, current_y + 9),
            f"▼ {question_label}",
            fill=(67, 56, 202) # indigo-700
        )
        current_y += banner_h + 6

        # 4. Paste Question Image (centered horizontally)
        q_x = margin + (content_w - question_img.width) // 2
        stitched.paste(question_img, (q_x, current_y))

        return stitched

    def close(self):
        self.doc.close()
