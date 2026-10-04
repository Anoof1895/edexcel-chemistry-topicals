"""
Mark Scheme Matcher for Edexcel IAL Physics (WPH11–WPH16):
- Inherits from / extends MSMatcher with Physics-specific rules
- Units 1, 2, 4, 5: Q1–Q10 are Section A MCQs (1 mark each)
- Units 3, 6: Practical units (0 MCQs)
- Strict line-by-line MCQ answer key extraction
"""

import os
import re
from typing import Dict, Any, Optional
import pymupdf
from pipeline.pdf_processor import PDFProcessor
from pipeline.ms_matcher import MSMatcher, canonical_id, is_ms_header_row

def extract_mcq_key_from_text(text: str) -> Optional[str]:
    """
    Strict line-by-line regex matching for Edexcel Physics MCQ keys.
    Prevents cross-line false matches from subsequent rationale statements ('A is not correct...').
    """
    for line in text.splitlines():
        line = line.strip()
        # Pattern 1: 'D is the correct answer' / 'D is the only correct answer' / 'D is correct answer'
        m1 = re.search(r"\b([A-D])\s+is\s+(?:the\s+)?(?:only\s+)?correct\s+answer\b", line, re.I)
        if m1:
            return m1.group(1).upper()
        # Pattern 2: 'The only correct answer is D' / 'The correct answer is D' / 'Answer: D' / 'Correct Answer: D'
        m2 = re.search(r"(?:The\s+only\s+correct\s+answer\s+is|The\s+correct\s+answer\s+is|Correct\s+Answer\s*[:\s]|Answer\s*[:\s])\s*([A-D])\b", line, re.I)
        if m2:
            return m2.group(1).upper()
        # Pattern 3: Standalone single option letter
        if re.match(r"^[A-D]$", line):
            return line.upper()
    return None

MS_COL0_Q_PAT = re.compile(
    r"^\s*\*?\s*(?:question\s+|q\.?\s*)?(\d{1,2}(?:\s*\*?\s*\([a-z0-9]+\)\s*\*?)*|\d{1,2}\s*\*?\s*\(([a-z])\)(?:\s*\(([ivx]+)\))?)(?:\s+|$|[\.\:\t\*])",
    re.IGNORECASE
)

def clean_col0_line(text: str) -> str:
    t = re.sub(r"(?is)\bclip\b.*$", "", text).strip()
    t = re.sub(r"^\s*\d{1,2}\s+(?=\*?\s*(?:question\s+|q\.?\s*)?\d{1,2}\s*\(|\*[a-z])", "", t, flags=re.I).strip()
    t = re.sub(r"[*]", "", t).strip()
    return t


# ---------------------------------------------------------------------------
# January 2026 Variant "A" exception (WPH11A / WPH12A / WPH14A / WPH15A):
# the mark scheme embeds the question stem/diagrams in purple-shaded table rows
# (Col 0 empty, Mark "-"/empty) directly above each white rubric row
# (Col 0 = "11(a)", Mark = numeric). Rubric crops must start at the numbered row
# and stop at the next purple row, so question text is never duplicated.
# ---------------------------------------------------------------------------
EMBEDDED_QP_PAPER_PAT = re.compile(r"wph1[1245]_a_2026_january", re.IGNORECASE)
EMBEDDED_QP_MS_FILE_PAT = re.compile(r"Physics_U[1245]A_MS\.pdf$", re.IGNORECASE)
MCQ_ONLY_CORRECT_PAT = re.compile(r"The only correct answer is\s+([A-D])", re.IGNORECASE)
EMBEDDED_LABEL_PAT = re.compile(r"^(\d{1,2})([a-h])?((?:\([a-z]{1,4}\))*)$", re.IGNORECASE)
EMBEDDED_SUBLABEL_PAT = re.compile(r"^((?:\([a-z]{1,4}\))+)$", re.IGNORECASE)
COL0_X_MAX = 110.0  # Col 0 ("Question Number") text always starts left of this (pts)


def is_embedded_question_ms(paper_id: Optional[str], ms_path: Optional[str] = None) -> bool:
    """
    True for the January 2026 Variant-A papers whose mark schemes embed question rows.
    Filename matching (Physics_U[1245]A_MS.pdf) is restricted to the 2026 Jan folder because
    the 2025 Oct/Nov series reuses the same filenames with a standard (header-only) layout.
    """
    if paper_id and EMBEDDED_QP_PAPER_PAT.search(paper_id):
        return True
    if ms_path:
        norm = ms_path.replace("\\", "/")
        if EMBEDDED_QP_MS_FILE_PAT.search(norm) and re.search(r"/2026[ _-]?jan", norm, re.IGNORECASE):
            return True
    return False


def _is_shaded_fill(fill) -> bool:
    """Purple/lilac row shading, e.g. (0.76, 0.75, 1.0). Excludes white and neutral grey boxes."""
    if not fill or len(fill) < 3:
        return False
    r, g, b = fill[:3]
    return min(r, g, b) < 0.97 and (b - r) > 0.1 and (b - g) > 0.1

class MSMatcherPhysics(MSMatcher):
    def __init__(self, ms_processor: PDFProcessor, paper_id: str, cache_dir: str = ".cache/gemini_physics"):
        super().__init__(ms_processor, paper_id, cache_dir)
        self.mcq_answers: Dict[str, str] = {}
        self.embedded_qp_layout = is_embedded_question_ms(
            self.paper_id, getattr(ms_processor, "pdf_path", None)
        )
        self._embedded_page_cache: Dict[int, Dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Variant-A (Jan 2026) embedded-question layout
    # ------------------------------------------------------------------
    def _analyze_embedded_page(self, p_idx: int) -> Dict[str, Any]:
        """
        Builds a row-geometry model of one MS page:
        - bands:  merged vertical extents of purple rows (header, question stems, totals)
        - labels: numbered Col-0 rubric rows lying in white space, with their row-top divider
        - tables: table bboxes anchored at Col 0 (with row bboxes)
        - footer_y: top of the page footer region
        """
        if p_idx in self._embedded_page_cache:
            return self._embedded_page_cache[p_idx]

        page = self.ms_proc.doc[p_idx]
        pw, ph = page.rect.width, page.rect.height

        # 1. Purple bands, from the Col-0 cell of every shaded row
        raw = []
        for d in page.get_drawings():
            r = d.get("rect")
            if r is None or not _is_shaded_fill(d.get("fill")):
                continue
            if r.x0 < COL0_X_MAX and r.width > 40 and r.height > 4:
                raw.append([r.y0, r.y1])
        raw.sort()
        bands = []
        for y0, y1 in raw:
            if bands and y0 <= bands[-1][1] + 1.5:
                bands[-1][1] = max(bands[-1][1], y1)
            else:
                bands.append([y0, y1])

        def in_band(y: float) -> bool:
            return any(b0 - 0.5 <= y <= b1 + 0.5 for b0, b1 in bands)

        # 2. Tables anchored at Col 0
        tables = []
        try:
            for t in page.find_tables().tables:
                if t.bbox[0] < COL0_X_MAX:
                    tables.append({"bbox": tuple(t.bbox), "rows": [tuple(r.bbox) for r in t.rows]})
        except Exception:
            pass

        # 3. Footer
        footer_tops = [b[1] for b in page.get_text("blocks") if b[1] > ph - 45 and b[4].strip()]
        footer_y = (min(footer_tops) - 3) if footer_tops else ph - 25

        # 4. Numbered Col-0 labels in white rows (supports labels wrapped over two lines)
        col0_lines = []
        for b in page.get_text("dict").get("blocks", []):
            if b.get("type") != 0:
                continue
            for l in b.get("lines", []):
                x0, y0, _, y1 = l["bbox"]
                if x0 >= COL0_X_MAX or y0 >= footer_y:
                    continue
                txt = "".join(s.get("text", "") for s in l.get("spans", []))
                compact = re.sub(r"\s+", "", clean_col0_line(txt))
                if compact:
                    col0_lines.append((y0, y1, compact))
        col0_lines.sort()

        def band_containing(y: float):
            return next(((b0, b1) for b0, b1 in bands if b0 - 0.5 <= y <= b1 + 0.5), None)

        def normalize_label(compact: str) -> str:
            # Glyph quirk: "(c)" rendered as "I" in some rows, e.g. "18I(i)" -> "18(c)(i)"
            compact = re.sub(r"^(\d{1,2})I(?=\(|$)", r"\1(c)", compact)
            # Typo quirk: doubled roman numerals "18(c)(i)(ii)" -> "18(c)(ii)" (depth never exceeds letter+roman)
            compact = re.sub(r"\((?:i{1,3}|iv|vi{0,3}|ix|x)\)(\((?:i{1,3}|iv|vi{0,3}|ix|x)\))$", r"\1", compact)
            return compact

        labels = []
        for y0, y1, compact in col0_lines:
            compact = normalize_label(compact)
            band = band_containing((y0 + y1) / 2)
            m = EMBEDDED_LABEL_PAT.match(compact)
            if m:
                # Label printed inside a purple stem row: the rubric starts below that band
                labels.append({"raw": compact, "y0": y0, "y1": y1, "in_band": band})
                continue
            if labels and EMBEDDED_SUBLABEL_PAT.match(compact) and 0 <= y0 - labels[-1]["y1"] < 6:
                labels[-1]["raw"] += compact
                labels[-1]["y1"] = y1

        for lab in labels:
            ly = lab["y0"]
            y_mid = (lab["y0"] + lab["y1"]) / 2
            y_bot = lab["y1"]
            lab["cid"] = canonical_id(lab["raw"])
            if lab["in_band"] is not None:
                lab["row_top"] = lab["in_band"][1]
                lab["anchor_y"] = lab["in_band"][1]
                lab["table"] = next(
                    (t for t in tables if t["bbox"][1] - 1 <= lab["row_top"] <= t["bbox"][3] + 1), None
                )
                continue
            lab["anchor_y"] = ly
            # Find the matching table row containing the label (checked using midpoint and top)
            matching_row = None
            matching_table = None
            for t in tables:
                for r in t["rows"]:
                    if (r[1] - 2 <= y_mid <= r[3] + 2) or (r[1] - 2 <= ly <= r[3] + 2):
                        matching_row = r
                        matching_table = t
                        break
                if matching_row:
                    break

            # Any purple band above the label whose bottom is adjacent to or above the label's midpoint
            band_bottoms = [b1 for b0, b1 in bands if b0 < y_mid and b1 <= y_mid + 5]

            if matching_row and band_bottoms:
                lab["row_top"] = max(matching_row[1], max(band_bottoms))
            elif matching_row:
                lab["row_top"] = matching_row[1]
            elif band_bottoms:
                lab["row_top"] = max(band_bottoms)
            else:
                lab["row_top"] = ly - 2

            lab["table"] = matching_table or next(
                (t for t in tables if t["bbox"][1] - 1 <= ly <= t["bbox"][3] + 1), None
            )

        info = {
            "p_idx": p_idx, "pw": pw, "ph": ph, "bands": bands, "tables": tables,
            "labels": labels, "footer_y": footer_y,
        }
        self._embedded_page_cache[p_idx] = info
        return info

    def _embedded_region_bottom(self, info: Dict[str, Any], top: float, table: Optional[Dict[str, Any]]):
        """
        Returns (bottom_y, is_closed). A region is 'closed' when it ends at a purple row or the next
        numbered rubric row; 'open' regions end at the table/footer and may continue on the next page.
        """
        closed = [b0 for b0, _ in info["bands"] if b0 > top + 2]
        closed += [lab["row_top"] for lab in info["labels"] if lab["row_top"] > top + 2]
        closed_y = min(closed) if closed else None
        limit = min(closed_y, info["footer_y"]) if closed_y is not None else info["footer_y"]

        if table is not None and table["bbox"][3] < limit - 3:
            table_bottom = table["bbox"][3]
            # Same-page white content (e.g. split table / answer diagram) between the table end and
            # the next closed boundary still belongs to this rubric.
            page = self.ms_proc.doc[info["p_idx"]]
            extra = []
            if page is not None:
                for b in page.get_text("blocks"):
                    if b[1] >= table_bottom - 1 and b[3] <= limit and b[4].strip() and b[0] > COL0_X_MAX:
                        extra.append(b[3])
                for img in page.get_image_info():
                    r = pymupdf.Rect(img["bbox"])
                    if r.y0 >= table_bottom - 1 and r.y1 <= limit and r.height > 8:
                        extra.append(r.y1)
            if extra:
                return min(limit, max(extra) + 4), closed_y is not None and limit == closed_y
            return table_bottom, False
        return limit, closed_y is not None and limit == closed_y

    def _index_embedded_question_ms(self, limit: int):
        doc = self.ms_proc.doc
        is_practical_unit = "wph13" in self.paper_id.lower() or "wph16" in self.paper_id.lower()
        for p_idx in range(limit):
            info = self._analyze_embedded_page(p_idx)
            info["p_idx"] = p_idx
            page = doc[p_idx]
            pw, ph = info["pw"], info["ph"]
            for lab in info["labels"]:
                cid = lab["cid"]
                if not cid or not cid[0].isdigit() or cid in self.entries_by_qid:
                    continue
                top = lab["row_top"]
                bottom, closed = self._embedded_region_bottom(info, top, lab["table"])
                if bottom <= top + 8:
                    continue
                tb = lab["table"]["bbox"] if lab["table"] else (pw * 0.06, 0, pw * 0.94, 0)
                x0, x1 = max(0.0, tb[0] - 2), min(pw, tb[2] + 2)
                rect = pymupdf.Rect(x0, top, x1, bottom)
                row_text = page.get_text("text", clip=rect).strip()

                # Mark: numeric value in the right-most (Mark) column of the rubric row
                mark = None
                for b in page.get_text("blocks", clip=pymupdf.Rect(x1 - 75, top, x1, bottom)):
                    mm = re.match(r"^\(?\s*(\d{1,2})\s*\)?$", b[4].strip())
                    if mm:
                        mark = int(mm.group(1))
                        break
                if mark is None:
                    if cid.isdigit() and int(cid) <= 10 and not is_practical_unit:
                        mark = 1
                    elif re.search(r"indicative\s+content|lines\s+of\s+reasoning", row_text, re.I):
                        mark = 6

                self.entries_by_qid[cid] = {
                    "question_number": cid,
                    "raw_id": lab["raw"],
                    "page_index": p_idx,
                    "bbox_pts": (x0, top, x1, bottom),
                    "embedded_rect": (x0, top, x1, bottom),
                    "embedded_open": not closed,
                    "box_1000": [int(top / ph * 1000), int(x0 / pw * 1000), int(bottom / ph * 1000), int(x1 / pw * 1000)],
                    "mark": mark,
                    "row_text": row_text,
                }

                # Section A (explanatory format): "The only correct answer is X", paired with Col-0 number
                if cid.isdigit() and 1 <= int(cid) <= 10 and not is_practical_unit:
                    m_key = MCQ_ONLY_CORRECT_PAT.search(row_text)
                    key = m_key.group(1).upper() if m_key else extract_mcq_key_from_text(row_text)
                    if key:
                        self.mcq_answers[cid] = key

    def _embedded_continuation(self, p_idx: int) -> Optional[pymupdf.Rect]:
        """White rubric rows continuing at the top of the next page (before any purple row / new label)."""
        doc = self.ms_proc.doc
        if p_idx + 1 >= len(doc):
            return None
        nxt = p_idx + 1
        info = self._analyze_embedded_page(nxt)
        info["p_idx"] = nxt
        page = doc[nxt]
        content_tops = [t["bbox"][1] for t in info["tables"]]
        content_tops += [b[1] for b in page.get_text("blocks") if b[4].strip() and 30 < b[1] < info["footer_y"]]
        if not content_tops:
            return None
        top = min(content_tops)
        if any(b0 <= top + 3 for b0, _ in info["bands"]):
            return None  # next page opens with a header/question stem row
        if any(lab["row_top"] <= top + 3 for lab in info["labels"]):
            return None  # next page opens with a new numbered rubric row
        table = next((t for t in info["tables"] if abs(t["bbox"][1] - top) < 3), None)
        bottom, _ = self._embedded_region_bottom(info, top, table)
        if bottom <= top + 8:
            return None
        rect_x = table["bbox"] if table else (info["pw"] * 0.06, 0, info["pw"] * 0.94, 0)
        rect = pymupdf.Rect(max(0, rect_x[0] - 2), top, min(info["pw"], rect_x[2] + 2), bottom)
        if not page.get_text("text", clip=rect).strip():
            return None
        return rect

    def _render_rect(self, p_idx: int, rect: pymupdf.Rect, dpi: int = 300, margin_px: int = 14):
        from PIL import Image
        pix = self.ms_proc.doc[p_idx].get_pixmap(dpi=dpi, clip=rect)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        out = Image.new("RGB", (img.width + 2 * margin_px, img.height + 2 * margin_px), (255, 255, 255))
        out.paste(img, (margin_px, margin_px))
        return out

    def _crop_embedded(self, entry: Dict[str, Any], output_path: str) -> bool:
        from PIL import Image
        p_idx = entry["page_index"]
        x0, top, x1, bottom = entry["embedded_rect"]
        crop = self._render_rect(p_idx, pymupdf.Rect(x0, top, x1, bottom))

        if entry.get("embedded_open"):
            cont = self._embedded_continuation(p_idx)
            if cont is not None:
                cont_img = self._render_rect(p_idx + 1, pymupdf.Rect(cont.x0, cont.y0, cont.x1, cont.y1))
                w = max(crop.width, cont_img.width)
                joined = Image.new("RGB", (w, crop.height + cont_img.height), (255, 255, 255))
                joined.paste(crop, (0, 0))
                joined.paste(cont_img, (0, crop.height))
                crop = joined
                print(f"    [MS CONTINUATION STITCHED] {entry['question_number']} with Page {p_idx + 2} rubric rows", flush=True)

        dir_name = os.path.dirname(output_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        crop.save(output_path, "PNG", optimize=True)
        return True

    def _resolve_entry(self, question_number: str) -> Optional[Dict[str, Any]]:
        clean_qnum = re.sub(r"[*]", "", question_number).strip()
        target_cid = canonical_id(clean_qnum)
        entry = self.entries_by_qid.get(target_cid)
        if not entry:
            for k, v in self.entries_by_qid.items():
                if canonical_id(re.sub(r"[*]", "", k).strip()) == target_cid:
                    return v
        if not entry:
            m_sub = re.match(r"^(\d+[a-z])([ivx]+)$", target_cid)
            if m_sub:
                entry = self.entries_by_qid.get(m_sub.group(1))
        if not entry:
            entry = self.entries_by_qid.get(f"{target_cid}i") or self.entries_by_qid.get(f"{target_cid}a")
        return entry

    def get_mark_for_question(self, question_number: str) -> Optional[int]:
        if self.embedded_qp_layout:
            entry = self._resolve_entry(question_number)
            if entry and entry.get("mark") is not None:
                return entry["mark"]
        return super().get_mark_for_question(question_number)

    def index_mark_scheme(self, max_pages: Optional[int] = None):
        """
        Indexes mark scheme entries with Physics Section A (Q1-Q10) awareness.
        """
        doc = self.ms_proc.doc
        total_pages = len(doc)
        limit = min(total_pages, max_pages) if max_pages else total_pages

        if self.embedded_qp_layout:
            print(f"    [VARIANT-A EMBEDDED-QP MS] {self.paper_id}: stripping purple question rows from rubric crops", flush=True)
            self._index_embedded_question_ms(limit)
            return

        is_section_b = False
        is_practical_unit = "wph13" in self.paper_id.lower() or "wph16" in self.paper_id.lower()
        last_parent_num = None

        for p_idx in range(limit):
            page = doc[p_idx]
            page_text = page.get_text()

            if "section b" in page_text.lower():
                is_section_b = True

            # Skip cover and general instruction pages (only on first 4 pages)
            if p_idx < 4 and not ("Question" in page_text and ("Answer" in page_text or "Mark" in page_text)):
                continue

            try:
                tables = page.find_tables()
                for table in tables:
                    table_width = table.bbox[2] - table.bbox[0]
                    if table.bbox[0] > 130 or table_width < 300:
                        continue

                    df = table.extract()
                    if not df:
                        continue

                    q_row_candidates = []
                    for r_idx, row in enumerate(df):
                        if not row:
                            continue
                        first_cell = str(row[0]).strip() if row[0] else ""
                        if not first_cell and len(row) > 1 and row[1]:
                            first_cell = str(row[1]).strip()

                        first_cell_clean = re.sub(r"(?is)\bclip\b.*$", "", first_cell).strip()
                        clean_cell = re.sub(r"[\*\s]", "", first_cell_clean)
                        clean_cell = re.sub(r"\)+", ")", clean_cell)

                        if re.match(r"^\([a-z0-9]+\)(?:\([a-z0-9]+\))*$", clean_cell) and last_parent_num:
                            clean_cell = last_parent_num + clean_cell

                        match = None
                        if len(clean_cell) <= 40:
                            match = re.match(r"^(?:question|\*+|q)?\s*(\d{1,2}(?:\([a-z0-9]+\)|[a-z0-9])*)$", clean_cell, re.IGNORECASE)
                        if match:
                            cid = canonical_id(match.group(1))
                            if cid and cid[0].isdigit():
                                if is_practical_unit and cid.isdigit() and int(cid) > 8:
                                    continue
                                if not is_practical_unit and is_section_b and cid.isdigit() and int(cid) <= 10:
                                    # Skip duplicate low number markers if seen inside section B
                                    pass

                                row_mark = None
                                cells = [str(c).strip() for c in row if c and str(c).strip()]
                                if len(cells) >= 2:
                                    for c in reversed(cells[1:]):
                                        first_line = c.strip().splitlines()[0].strip() if c.strip() else ""
                                        m_m = re.match(r"^\(?\s*(\d{1,2})\s*\)?$", first_line)
                                        if m_m:
                                            row_mark = int(m_m.group(1))
                                            break

                                if row_mark is None:
                                    row_text_cand = " ".join(cells)
                                    is_lor = bool(re.search(r"indicative\s+(?:content|points|marking)|lines\s+of\s+reasoning|Level\s+[123]|coherent\s+and\s+logically\s+structured", row_text_cand, re.I)) or '*' in match.group(1) or '*' in first_cell
                                    if is_lor:
                                        row_mark = 6
                                    elif cid.isdigit():
                                        if int(cid) <= 10 and not is_practical_unit:
                                            row_mark = 1
                                        else:
                                            total_m = re.search(rf"total\s+for\s+question\s+{cid}\s*=\s*(\d+)\s*marks?", page_text, re.I)
                                            if total_m:
                                                row_mark = int(total_m.group(1))

                                q_row_candidates.append({
                                    "r_idx": r_idx,
                                    "cid": cid,
                                    "raw_id": match.group(1),
                                    "mark": row_mark,
                                    "cells": cells
                                })
                                _pm = re.match(r"^(\d{1,2})", match.group(1))
                                if _pm:
                                    last_parent_num = _pm.group(1)

                    pw, ph = page.rect.width, page.rect.height
                    x0, _, x1, _ = table.bbox
                    xmin = max(0, x0 - 8)
                    xmax = min(pw, x1 + 8)

                    num_candidates = len(q_row_candidates)
                    for c_idx, cand in enumerate(q_row_candidates):
                        cid = cand["cid"]
                        if cid in self.entries_by_qid:
                            continue
                        r_idx = cand["r_idx"]

                        if num_candidates <= 1:
                            y0_pts = table.bbox[1]
                            y1_pts = table.bbox[3]
                            next_row_y0 = None
                        else:
                            y0_pts = table.rows[r_idx].bbox[1] if r_idx < len(table.rows) else table.bbox[1]
                            prev_limit = q_row_candidates[c_idx - 1]["r_idx"] if c_idx > 0 else -1
                            for up_i in range(r_idx - 1, prev_limit, -1):
                                if up_i < len(df) and is_ms_header_row(df[up_i]):
                                    if up_i < len(table.rows):
                                        y0_pts = table.rows[up_i].bbox[1]
                                else:
                                    break

                            next_limit = q_row_candidates[c_idx + 1]["r_idx"] if c_idx + 1 < num_candidates else len(df)
                            last_content_r = next_limit - 1
                            for down_i in range(r_idx + 1, next_limit):
                                if is_ms_header_row(df[down_i]):
                                    last_content_r = down_i - 1
                                    break
                            if last_content_r < len(table.rows):
                                y1_pts = table.rows[last_content_r].bbox[3]
                            else:
                                y1_pts = table.bbox[3]

                            next_row_y0 = table.rows[next_limit].bbox[1] if (c_idx + 1 < num_candidates and next_limit < len(table.rows)) else None

                        is_internal_row = (num_candidates > 1 and c_idx > 0)
                        ymin = (y0_pts + 0.5) if is_internal_row else max(0, y0_pts - 3)
                        ymax = min(ph, y1_pts + 3)
                        box_1000 = [
                            int(ymin / ph * 1000),
                            int(xmin / pw * 1000),
                            int(ymax / ph * 1000),
                            int(xmax / pw * 1000)
                        ]
                        row_text = " ".join(cand["cells"])
                        self.entries_by_qid[cid] = {
                            "question_number": cid,
                            "raw_id": cand["raw_id"],
                            "page_index": p_idx,
                            "bbox_pts": (x0, y0_pts, x1, y1_pts),
                            "table_row_y0": y0_pts,
                            "table_row_y1": y1_pts,
                            "is_internal_row": is_internal_row,
                            "next_row_y0": next_row_y0,
                            "box_1000": box_1000,
                            "mark": cand["mark"],
                            "row_text": row_text
                        }

                        # If Section A MCQ (1 to 10), extract answer key immediately
                        if cid.isdigit() and 1 <= int(cid) <= 10 and not is_practical_unit:
                            ans_key = extract_mcq_key_from_text(row_text)
                            if ans_key:
                                self.mcq_answers[cid] = ans_key
            except Exception:
                pass

        # Text blocks fallback for any missing entries
        pw, ph = doc[0].rect.width, doc[0].rect.height if len(doc) > 0 else (595, 842)
        for p_idx in range(limit):
            page = doc[p_idx]
            rot_mat = page.rotation_matrix if page.rotation != 0 else None
            raw_blocks = page.get_text("blocks")
            blocks = []
            for b in raw_blocks:
                r = pymupdf.Rect(b[:4]) * rot_mat if rot_mat else pymupdf.Rect(b[:4])
                blocks.append((r.x0, r.y0, r.x1, r.y1, b[4]))

            for b in blocks:
                txt = b[4].strip()
                txt_clean = re.sub(r"(?is)\bclip\b.*$", "", txt).strip()
                clean_txt = re.sub(r"[\*\s]", "", txt_clean)
                match = re.match(r"^(?:question|\*+|q)?\s*(\d{1,2}(?:\s*\([a-z]\))?(?:\s*\([ivx]{1,4}\))?|\d{1,2}[a-z]?)\b", clean_txt, re.IGNORECASE)
                if match:
                    cid = canonical_id(match.group(1))
                    if cid and cid[0].isdigit() and cid not in self.entries_by_qid:
                        if is_practical_unit and cid.isdigit() and int(cid) > 8:
                            continue
                        x0, y0, x1, y1 = b[0], b[1], b[2], b[3]
                        cand_bottoms = [
                            b2[1] for b2 in blocks
                            if b2[1] > y0 + 15 and (
                                re.match(r"^(?:question|q)?\s*\d+", re.sub(r"(?is)\bclip\b.*$", "", b2[4]).strip(), re.IGNORECASE)
                                or "total for" in b2[4].lower()
                            )
                        ]
                        row_bottom_pts = min(cand_bottoms) - 5 if cand_bottoms else min(ph * 0.95, y1 + 100)
                        ymin_1000 = int(max(0, y0 - 10) / ph * 1000)
                        ymax_1000 = int(min(ph, row_bottom_pts) / ph * 1000)
                        box_1000 = [ymin_1000, 60, ymax_1000, 940]
                        mark_val = 1 if (cid.isdigit() and int(cid) <= 10 and not is_practical_unit) else None
                        self.entries_by_qid[cid] = {
                            "question_number": cid,
                            "raw_id": match.group(1),
                            "page_index": p_idx,
                            "bbox_pts": (x0, y0, x1, row_bottom_pts),
                            "box_1000": box_1000,
                            "mark": mark_val,
                            "row_text": txt
                        }
                        if cid.isdigit() and 1 <= int(cid) <= 10 and not is_practical_unit:
                            ans_key = extract_mcq_key_from_text(txt)
                            if ans_key:
                                self.mcq_answers[cid] = ans_key

        # Resolve marks for entries with mark is None via LOR check or continuation tables
        for cid, entry in self.entries_by_qid.items():
            if entry.get("mark") is None:
                row_txt = entry.get("row_text", "")
                if re.search(r"indicative\s+(?:content|points|marking)|lines\s+of\s+reasoning|Level\s+[123]|coherent\s+and\s+logically\s+structured", row_txt, re.I) or '*' in entry.get("raw_id", ""):
                    entry["mark"] = 6
                    continue
                p_idx = entry["page_index"]
                if p_idx + 1 < len(doc):
                    next_tables = list(doc[p_idx + 1].find_tables().tables)
                    if next_tables:
                        t0_df = next_tables[0].extract()
                        if t0_df:
                            for r in t0_df:
                                for c in reversed([str(cell).strip() for cell in r if cell]):
                                    m_m = re.match(r"^\(?\s*(\d{1,2})\s*\)?$", c)
                                    if m_m:
                                        entry["mark"] = int(m_m.group(1))
                                        break
                                if entry.get("mark") is not None:
                                    break

    def get_mcq_answer(self, question_number: str) -> Optional[str]:
        """Returns the extracted MCQ answer (A, B, C, D) for a question number."""
        cid = canonical_id(question_number)
        return self.mcq_answers.get(cid)

    def _find_lor_continuation(
        self,
        page_idx: int,
        target_cid: str,
        raw_id: str,
        row_text: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Only matches LOR continuation if the question ITSELF is LOR, is the last
        question on the page, and the next page actually contains indicative content points.
        Prevents poisoning of non-LOR siblings on the same page.
        """
        is_lor = bool(re.search(r"indicative\s+(?:content|points|marking)|lines\s+of\s+reasoning|Level\s+[123]|coherent\s+and\s+logically\s+structured", row_text, re.IGNORECASE)) or raw_id.strip().startswith("*")
        if not is_lor:
            return None

        cur_entry = self.entries_by_qid.get(target_cid)
        if cur_entry:
            same_page_entries = [e for e in self.entries_by_qid.values() if e["page_index"] == page_idx]
            if any(e["box_1000"][0] > cur_entry["box_1000"][0] for e in same_page_entries):
                return None

        doc = self.ms_proc.doc
        if page_idx + 1 >= len(doc):
            return None
        next_text = doc[page_idx + 1].get_text()
        has_indicative = bool(re.search(r"\bindicative\s+(?:points|content)\b|\bip1\b", next_text, re.IGNORECASE))
        if not has_indicative:
            return None

        return super()._find_lor_continuation(page_idx, target_cid, raw_id, row_text)

    def _find_next_page_continuation(
        self,
        page_idx: int,
        target_cid: str,
        raw_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Detects unnumbered calculation / table continuation rows on the next page
        for terminal questions that broke across a page boundary (e.g. 16(c), 17(c)).
        """
        doc = self.ms_proc.doc
        if page_idx + 1 >= len(doc):
            return None

        cur_entry = self.entries_by_qid.get(target_cid)
        if not cur_entry:
            return None

        # 1. Target question must be the last question on its page
        same_page_entries = [e for e in self.entries_by_qid.values() if e["page_index"] == page_idx]
        if any(e["box_1000"][0] > cur_entry["box_1000"][0] for e in same_page_entries):
            return None

        next_p_idx = page_idx + 1
        next_page = doc[next_p_idx]
        next_tables = list(next_page.find_tables().tables)
        if not next_tables:
            return None

        t0 = next_tables[0]
        t0_df = t0.extract()
        if not t0_df:
            return None

        # 2. First table on next page must NOT be a new question or table header
        has_hdr = any(is_ms_header_row(r) for r in t0_df[:2])
        first_c0 = str(t0_df[0][0]).strip() if t0_df[0] and t0_df[0][0] else ""
        q_pat = re.compile(r"^\s*\*?\s*(?:question\s+|q\.?\s*)?(\d{1,2}(?:\s*\*?\s*\([a-z0-9]+\)\s*\*?)*)(?:\s+|$|[\.\:\t\*])", re.I)
        m_q = q_pat.match(first_c0)
        if m_q:
            c0_cid = canonical_id(m_q.group(1))
            if c0_cid and c0_cid[0].isdigit():
                return None

        # 3. Must match parent question number or contain continuation formula/calculation
        m_p = re.match(r"^(\d+)", target_cid)
        parent_num = m_p.group(1) if m_p else target_cid
        t0_text = " ".join(str(c) for r in t0_df for c in r if c).lower()

        has_total = f"total for question {parent_num}" in t0_text
        if not (has_total or ("=" in t0_text and not has_hdr)):
            return None

        y0 = max(0, t0.bbox[1] - 4)
        y1 = t0.bbox[3]
        if len(next_tables) > 1:
            y1 = min(y1, next_tables[1].bbox[1] - 6)

        ph = next_page.rect.height
        return {
            "page_index": next_p_idx,
            "box_1000": [int(y0 / ph * 1000), 70, int(y1 / ph * 1000), 930],
            "label": "MARK SCHEME (CONTINUED)"
        }

    def crop_for_question(self, question_number: str, output_path: str) -> bool:
        """
        Physics-specific mark scheme cropping:
        - Strict question number matching handling compound sub-parts: 15(a), 15(b)(i), 18(c)(iii)
        - Strips leading lone mark integers PyMuPDF prepends to Col0 blocks
        - Strict table row boundary clamping: snaps y0 to row top and y1 to row bottom
        - Clamps internal rows to row divider so top padding never bleeds into preceding row
        - Blocks [INTER-TABLE MS DIAGRAM] from crossing into subsequent question rows in the same table
        - Preserves multi-page calculation continuation stitching (16(c), 17(c))
        """
        if self.embedded_qp_layout:
            entry = self._resolve_entry(question_number)
            if not entry or "embedded_rect" not in entry:
                return False
            return self._crop_embedded(entry, output_path)

        clean_qnum = re.sub(r"[*]", "", question_number).strip()
        target_cid = canonical_id(clean_qnum)
        entry = self.entries_by_qid.get(target_cid)

        if not entry:
            # Fallback fuzzy match across keys using canonical_id
            for k, v in self.entries_by_qid.items():
                if canonical_id(re.sub(r"[*]", "", k).strip()) == target_cid:
                    entry = v
                    break

        if not entry:
            # Fallback: if target is terminal e.g. '21bi' and MS grouped under '21b'
            m_sub = re.match(r"^(\d+[a-z])([ivx]+)$", target_cid)
            if m_sub:
                entry = self.entries_by_qid.get(m_sub.group(1))

        if not entry:
            # Fallback: if target is parent e.g. '21b' and MS entry is '21bi'
            entry = self.entries_by_qid.get(f"{target_cid}i")

        if not entry:
            # Fallback: if target is standalone question e.g. '15' and MS entry is '15a'
            entry = self.entries_by_qid.get(f"{target_cid}a")

        if not entry:
            return False

        page_idx = entry["page_index"]
        box_1000 = list(entry["box_1000"])

        page = self.ms_proc.doc[page_idx]
        ph = page.rect.height
        pw = page.rect.width
        rot_mat = page.rotation_matrix if page.rotation != 0 else None

        is_internal_row = entry.get("is_internal_row", False)
        table_row_y0 = entry.get("table_row_y0")
        table_row_y1 = entry.get("table_row_y1")
        next_row_y0 = entry.get("next_row_y0")

        # For internal rows, snap start_y_pts strictly to the table row's top divider line
        if is_internal_row and table_row_y0 is not None:
            start_y_pts = table_row_y0
            box_1000[0] = int(start_y_pts / ph * 1000)
            min_allowed_top = table_row_y0
        else:
            start_y_pts = box_1000[0] / 1000.0 * ph
            min_allowed_top = None

        col0_limit = min(115.0, pw * 0.15)

        # Strict Start Boundary Check for non-internal rows:
        if not is_internal_row:
            col0_questions = []
            page_dict = page.get_text("dict")
            for b in page_dict.get("blocks", []):
                if b.get("type") != 0:
                    continue
                for l in b.get("lines", []):
                    if l["bbox"][0] < col0_limit:
                        ltxt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                        cleaned = clean_col0_line(ltxt)
                        m_q = MS_COL0_Q_PAT.match(cleaned)
                        if m_q:
                            cid = canonical_id(m_q.group(1))
                            if cid and cid[0].isdigit():
                                col0_questions.append((l["bbox"][1], l["bbox"][3], cid, m_q.group(1)))

            target_item = next((q for q in col0_questions if q[2] == target_cid), None)
            if target_item and target_item[0] > start_y_pts + 15:
                earlier = [q for q in col0_questions if q[0] < target_item[0] and q[0] >= start_y_pts - 5]
                if earlier:
                    last_earlier_y1 = max(q[1] for q in earlier)
                    header_blocks = [
                        b for b in page.get_text("blocks")
                        if b[1] >= last_earlier_y1 - 2 and b[3] <= target_item[0] + 2
                        and re.search(r"Question\s+number", b[4], re.I)
                    ]
                    if header_blocks:
                        min_hdr_y0 = min(b[1] for b in header_blocks)
                        new_start_y = min_hdr_y0 - 2
                    else:
                        new_start_y = target_item[0] - 2
                    if new_start_y > start_y_pts:
                        start_y_pts = new_start_y
                        box_1000[0] = int(start_y_pts / ph * 1000)

        orig_table_y1_pts = box_1000[2] / 1000.0 * ph

        footer_pats = [re.compile(r"^\s*(?:\*?[a-z0-9_]+\*?|\d{1,3}|turn over)\s*$", re.I), re.compile(r"pearson|edexcel", re.I)]
        footer_blocks = []
        for b in page.get_text("blocks"):
            r = pymupdf.Rect(b[:4]) * rot_mat if rot_mat else pymupdf.Rect(b[:4])
            txt = b[4].strip()
            if r.y0 > ph - 75 and (r.y0 > ph - 45 or any(fp.search(txt) for fp in footer_pats)):
                footer_blocks.append(r.y0)
        footer_boundary = min(footer_blocks) - 6 if footer_blocks else ph - 20

        cand_limits = []

        # If a subsequent row exists in this same table, clamp strictly to its top divider
        if next_row_y0 is not None:
            cand_limits.append(next_row_y0)

        for t in page.find_tables().tables:
            table_w = t.bbox[2] - t.bbox[0]
            if t.bbox[1] > start_y_pts + 30 and t.bbox[0] < pw * 0.15 and table_w > pw * 0.65:
                t_df = t.extract()
                if not t_df:
                    continue
                has_hdr = any(is_ms_header_row(r) for r in t_df[:2])
                has_subsequent_q = False
                for r in t_df[:3]:
                    for c in (r[:2] if len(r) >= 2 else r):
                        if c:
                            txt_clean = clean_col0_line(str(c))
                            m = MS_COL0_Q_PAT.match(txt_clean)
                            if m:
                                cid = canonical_id(m.group(1))
                                if cid and cid[0].isdigit() and cid != target_cid and not target_cid.startswith(cid):
                                    m_target_p = re.match(r"^(\d+)", target_cid)
                                    m_cand_p = re.match(r"^(\d+)", cid)
                                    if not (m_target_p and m_cand_p and int(m_cand_p.group(1)) < int(m_target_p.group(1))):
                                        has_subsequent_q = True
                                        break
                    if has_subsequent_q:
                        break
                if has_hdr or has_subsequent_q:
                    cand_limits.append(t.bbox[1])

        # Line-level scanning for Column 0 question headers and total banners
        page_dict = page.get_text("dict")
        for b in page_dict.get("blocks", []):
            if b.get("type") != 0:
                continue
            for l in b.get("lines", []):
                line_y0 = l["bbox"][1]
                if line_y0 > start_y_pts + 15:
                    line_x0 = l["bbox"][0]
                    line_txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                    if line_x0 < col0_limit:
                        if re.match(r"^Question\s+number", line_txt, re.I):
                            cand_limits.append(line_y0)
                            continue
                        cleaned = clean_col0_line(line_txt)
                        m = MS_COL0_Q_PAT.match(cleaned)
                        if m:
                            cand_cid = canonical_id(m.group(1))
                            if cand_cid and cand_cid != target_cid and not target_cid.startswith(cand_cid):
                                m_target_p = re.match(r"^(\d+)", target_cid)
                                m_cand_p = re.match(r"^(\d+)", cand_cid)
                                if m_target_p and m_cand_p and int(m_cand_p.group(1)) < int(m_target_p.group(1)):
                                    continue
                                cand_limits.append(line_y0)
                    elif re.search(r"total\s+for\s+(?:question|section|paper)", line_txt, re.I):
                        cand_limits.append(line_y0)

        if cand_limits:
            next_min = min(cand_limits)
            # When next_row_y0 is the delimiter, snap to row divider line (allowing +2pt for border line)
            if next_row_y0 is not None and abs(next_min - next_row_y0) < 1.0:
                next_boundary = min(next_min + 2.0, footer_boundary)
            else:
                next_boundary = min(next_min - 2.0, footer_boundary)
            if orig_table_y1_pts > next_boundary and next_boundary > start_y_pts + 25:
                box_1000[2] = int(next_boundary / ph * 1000)
                orig_table_y1_pts = next_boundary
        else:
            next_boundary = footer_boundary

        # Same-Page Illustrative Diagram & Unnumbered Box Capture:
        # Crucial: NEVER expand ymax across an existing table row boundary (next_row_y0)
        # If this question is followed by another question in the same table,
        # drawings below orig_table_y1_pts belong to that next question!
        if next_row_y0 is None:
            diag_elements = []
            for t in page.find_tables().tables:
                if t.bbox[1] >= start_y_pts + 20 and t.bbox[3] <= next_boundary + 5:
                    t_df = t.extract()
                    has_hdr = any(is_ms_header_row(r) for r in t_df[:2]) if t_df else False
                    has_subsequent_q = False
                    if t_df:
                        for r in t_df[:3]:
                            for c in (r[:2] if len(r) >= 2 else r):
                                if c:
                                    txt_clean = clean_col0_line(str(c))
                                    m = MS_COL0_Q_PAT.match(txt_clean)
                                    if m:
                                        cid = canonical_id(m.group(1))
                                        if cid and cid[0].isdigit() and cid != target_cid and not target_cid.startswith(cid):
                                            m_target_p = re.match(r"^(\d+)", target_cid)
                                            m_cand_p = re.match(r"^(\d+)", cid)
                                            if not (m_target_p and m_cand_p and int(m_cand_p.group(1)) < int(m_target_p.group(1))):
                                                has_subsequent_q = True
                                                break
                            if has_subsequent_q:
                                break
                    if not has_hdr and not has_subsequent_q:
                        if t.bbox[3] > orig_table_y1_pts + 8:
                            diag_elements.append(t.bbox[3])

            for info in page.get_image_info():
                ibox = pymupdf.Rect(info["bbox"]) * rot_mat if rot_mat else pymupdf.Rect(info["bbox"])
                if ibox.y0 >= orig_table_y1_pts - 15 and ibox.y1 <= next_boundary + 5:
                    if ibox.y1 > orig_table_y1_pts + 8 and ibox.height >= 10 and ibox.width >= 20:
                        diag_elements.append(ibox.y1)

            for d in page.get_drawings():
                r = pymupdf.Rect(d["rect"]) * rot_mat if rot_mat else pymupdf.Rect(d["rect"])
                if r.y0 >= orig_table_y1_pts - 10 and r.y1 <= next_boundary + 5:
                    if r.y1 > orig_table_y1_pts + 8 and (r.width < pw * 0.98 or r.height < ph * 0.98):
                        diag_elements.append(r.y1)

            for b in page.get_text("blocks"):
                r = pymupdf.Rect(b[:4]) * rot_mat if rot_mat else pymupdf.Rect(b[:4])
                if r.y0 >= orig_table_y1_pts - 10 and r.y1 <= next_boundary:
                    txt = b[4].strip()
                    if txt and r.y1 > orig_table_y1_pts + 8 and not any(fp.search(txt) for fp in footer_pats):
                        diag_elements.append(r.y1)

            if diag_elements:
                bottom_diag_y1 = max(diag_elements)
                expanded_ymax_pts = min(next_boundary - 4, bottom_diag_y1 + 10)
                if expanded_ymax_pts > orig_table_y1_pts + 5:
                    box_1000[2] = int(expanded_ymax_pts / ph * 1000)
                    print(f"    [INTER-TABLE MS DIAGRAM] Enclosed mechanism diagram for {target_cid}: ymax expanded from {orig_table_y1_pts:.1f} to {expanded_ymax_pts:.1f} (boundary: {next_boundary:.1f})", flush=True)

        ms_crop = self.ms_proc.crop_box(
            page_idx,
            box_1000,
            dpi=300,
            padding=14,
            padding_top=0 if is_internal_row else 14,
            padding_bottom=4,
            clamp_horizontal=False,
            scan_markers=False,
            min_allowed_top_pts=min_allowed_top
        )

        raw_id = entry.get("raw_id", question_number)
        row_text = entry.get("row_text", "")
        diag = self._find_detached_diagram(page_idx, target_cid, raw_id, row_text)
        if diag:
            diag_crop = self.ms_proc.crop_box(
                diag["page_index"], diag["box_1000"], dpi=300, padding=14, padding_bottom=4, clamp_horizontal=False, scan_markers=False
            )
            ms_crop = PDFProcessor.stitch_stem_and_question(
                stem_img=ms_crop,
                question_img=diag_crop,
                stem_label="MARK SCHEME RUBRIC",
                question_label=diag.get("label", "EXAMPLE OF MECHANISM / REACTION SCHEME")
            )

        lor_cont = self._find_lor_continuation(page_idx, target_cid, raw_id, row_text)
        if lor_cont:
            lor_crop = self.ms_proc.crop_box(
                lor_cont["page_index"], lor_cont["box_1000"], dpi=300, padding=14, padding_bottom=14, clamp_horizontal=False, scan_markers=False
            )
            ms_crop = PDFProcessor.stitch_stem_and_question(
                stem_img=ms_crop,
                question_img=lor_crop,
                stem_label="LEVEL OF RESPONSE MARKING GRID",
                question_label=lor_cont.get("label", "INDICATIVE CONTENT & GUIDANCE")
            )

        # Multi-page calculation / table continuation (e.g. 16(c), 17(c))
        cont = self._find_next_page_continuation(page_idx, target_cid, raw_id)
        if cont:
            cont_crop = self.ms_proc.crop_box(
                cont["page_index"], cont["box_1000"], dpi=300,
                padding=0, padding_top=4, padding_bottom=0,
                clamp_horizontal=False, scan_markers=False
            )
            from PIL import Image
            cur_w = ms_crop.width
            cont_w = cont_crop.width
            w = max(cur_w, cont_w)
            joined = Image.new("RGB", (w, ms_crop.height + cont_crop.height), (255, 255, 255))
            joined.paste(ms_crop, (0, 0))
            joined.paste(cont_crop, (0, ms_crop.height))
            ms_crop = joined
            print(f"    [MS CONTINUATION STITCHED] {question_number} with Page {cont['page_index'] + 1} table", flush=True)

        dir_name = os.path.dirname(output_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        import time
        for attempt in range(5):
            try:
                ms_crop.save(output_path, "PNG", optimize=True)
                break
            except OSError:
                if attempt == 4:
                    raise
                time.sleep(0.15 * (attempt + 1))
        return True

