"""
Mark Scheme Matcher:
- Fast vector table and text parsing via PyMuPDF (zero rate limits, instantaneous)
- Multimodal Gemini fallback for complex or unusual layouts
- Crops high-resolution (300 DPI) answer rows
"""

import os
import re
import json
import hashlib
from typing import Dict, Any, List, Optional
from PIL import Image
import pymupdf
import dotenv

from pipeline.pdf_processor import PDFProcessor

dotenv.load_dotenv()

def canonical_id(val: str) -> str:
    """
    Canonical normalization helper:
    Normalizes any question string (e.g. 'Q2(a)', '2a', 'Question 2(a)', '20(b)(iv)', '18(b)(ii) Clip with (b)(iii)')
    into a canonical alphanumeric key (e.g. '2a', '20biv', '1', '14a', '18bii').
    Strips examiner 'clip with...' directions across multiple lines so rows match the terminal question ID.
    """
    if not val:
        return ""
    s = str(val).lower().strip()
    s = re.sub(r'(?is)\bclip\b.*$', '', s).strip()
    s = re.sub(r'^(question|q)\s*', '', s)
    s = re.sub(r'[\*\(\)\[\]\.\s\-_/†‡§#]', '', s)
    return s

def is_ms_header_row(row_cells) -> bool:
    """
    Determines whether a table row is an examiner mark scheme header row.
    """
    txt = " ".join(str(c) for c in row_cells if c).lower()
    return (
        "question" in txt
        or "acceptable" in txt
        or "additional guidance" in txt
        or txt.strip() == "number"
    )

class MSMatcher:
    def __init__(self, ms_processor: PDFProcessor, paper_id: str, cache_dir: str = ".cache/gemini"):
        self.ms_proc = ms_processor
        self.paper_id = re.sub(r"_ms$", "", paper_id)
        self.cache_dir = cache_dir
        self.entries_by_qid: Dict[str, Dict[str, Any]] = {}
        os.makedirs(cache_dir, exist_ok=True)

    @staticmethod
    def canonical_id(val: str) -> str:
        return canonical_id(val)

    @staticmethod
    def _normalize_qid(qid: str) -> str:
        return canonical_id(qid)

    def index_mark_scheme(self, max_pages: Optional[int] = None):
        """
        Indexes all mark scheme entries using PyMuPDF table and block analysis.
        Ensures the table header row ('Question Number | Answer | Additional Guidance | Mark')
        is preserved at the top of each cropped card.
        """
        doc = self.ms_proc.doc
        total_pages = len(doc)
        limit = min(total_pages, max_pages) if max_pages else total_pages
        is_section_b = False
        is_practical_unit = "wch13" in self.paper_id.lower() or "wch16" in self.paper_id.lower()
        last_parent_num = None  # persists across pages/tables for bare subpart resolution (Fix B)

        for p_idx in range(limit):
            page = doc[p_idx]
            page_text = page.get_text()

            # Detect transition to Section B
            if "section b" in page_text.lower():
                is_section_b = True

            # Skip cover and general instruction pages (only on first 4 pages)
            if p_idx < 4 and not ("Question" in page_text and ("Answer" in page_text or "Mark" in page_text)):
                continue

            # Method 1: Find vector tables
            try:
                tables = page.find_tables()
                for table in tables:
                    # Ignore inner calculation or sub-tables embedded within answer/guidance columns
                    table_width = table.bbox[2] - table.bbox[0]
                    if table.bbox[0] > 130 or table_width < 300:
                        continue

                    df = table.extract()
                    if not df:
                        continue
                    # Pre-scan table rows to distinguish header rows, question rows, and continuation rows
                    def is_ms_header_row(row_cells):
                        txt = " ".join(str(c) for c in row_cells if c).lower()
                        return (
                            "question" in txt
                            or "acceptable" in txt
                            or "additional guidance" in txt
                            or txt.strip() == "number"
                        )

                    q_row_candidates = []
                    for r_idx, row in enumerate(df):
                        if not row:
                            continue
                        first_cell = str(row[0]).strip() if row[0] else ""
                        if not first_cell and len(row) > 1 and row[1]:
                            first_cell = str(row[1]).strip()
                        # Pearson typo where mark is in question column e.g. '(2)' on P17
                        if first_cell == "(2)" and "ionisation" in str(row).lower():
                            q_row_candidates.append({
                                "r_idx": r_idx,
                                "cid": canonical_id("21(b)(i)"),
                                "raw_id": "21(b)(i)",
                                "mark": 2,
                                "cells": [str(c) for c in row if c]
                            })
                            continue
                        first_cell_clean = re.sub(r'(?is)\bclip\b.*$', '', first_cell).strip()
                        clean_cell = re.sub(r"[\*\s]", "", first_cell_clean)
                        # Fix A: normalise double closing parens e.g. '20(b))(ii)' -> '20(b)(ii)'
                        clean_cell = re.sub(r"\)+", ")", clean_cell)
                        # Fix B: bare continuation subpart e.g. '(b)' at a page break — prepend last matched parent
                        if re.match(r"^\([a-z0-9]+\)(?:\([a-z0-9]+\))*$", clean_cell) and last_parent_num:
                            clean_cell = last_parent_num + clean_cell
                        match = re.match(r"^(?:question|\*+|q)?\s*(\d{1,2}(?:\(?[a-z0-9]+\)?)*)$", clean_cell, re.IGNORECASE)
                        if match:
                            cid = canonical_id(match.group(1))
                            if cid and cid[0].isdigit():
                                if is_practical_unit and cid.isdigit():
                                    continue
                                if not is_practical_unit and is_section_b and cid.isdigit() and int(cid) < 5:
                                    continue
                                row_mark = None
                                cells = [str(c).strip() for c in row if c and str(c).strip()]
                                if len(cells) >= 2:
                                    for c in reversed(cells[1:]):
                                        first_line = c.strip().splitlines()[0].strip() if c.strip() else ""
                                        m_m = re.match(r"^\(?\s*(\d{1,2})\s*\)?$", first_line)
                                        if m_m:
                                            row_mark = int(m_m.group(1))
                                            break
                                if row_mark is None and cid.isdigit():
                                    total_m = re.search(rf"total\s+for\s+question\s+{cid}\s*=\s*(\d+)\s*marks?", page_text, re.I)
                                    if not total_m and p_idx + 1 < len(doc):
                                        total_m = re.search(rf"total\s+for\s+question\s+{cid}\s*=\s*(\d+)\s*marks?", doc[p_idx + 1].get_text(), re.I)
                                    if total_m:
                                        row_mark = int(total_m.group(1))

                                q_row_candidates.append({
                                    "r_idx": r_idx,
                                    "cid": cid,
                                    "raw_id": match.group(1),
                                    "mark": row_mark,
                                    "cells": cells
                                })
                                # Track the leading question number for bare-subpart resolution
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
                        else:
                            # Multi-question table: calculate distinct row boundary
                            # y0: scan upwards from r_idx - 1 for contiguous header rows
                            y0_pts = table.rows[r_idx].bbox[1] if r_idx < len(table.rows) else table.bbox[1]
                            prev_limit = q_row_candidates[c_idx - 1]["r_idx"] if c_idx > 0 else -1
                            for up_i in range(r_idx - 1, prev_limit, -1):
                                if up_i < len(df) and is_ms_header_row(df[up_i]):
                                    if up_i < len(table.rows):
                                        y0_pts = table.rows[up_i].bbox[1]
                                else:
                                    break

                            # y1: scan downwards until next question row or next header row
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

                        ymin = (y0_pts + 0.5) if (num_candidates > 1 and c_idx > 0) else max(0, y0_pts - 3)
                        ymax = min(ph, y1_pts + 3)
                        box_1000 = [
                            int(ymin / ph * 1000),
                            int(xmin / pw * 1000),
                            int(ymax / ph * 1000),
                            int(xmax / pw * 1000)
                        ]
                        self.entries_by_qid[cid] = {
                            "question_number": cid,
                            "raw_id": cand["raw_id"],
                            "page_index": p_idx,
                            "bbox_pts": (x0, y0_pts, x1, y1_pts),
                            "box_1000": box_1000,
                            "mark": cand["mark"],
                            "row_text": " ".join(cand["cells"])
                        }
            except Exception as e:
                pass

            # Method 2: Regex search for question blocks in text if table wasn't found
            rot_mat = page.rotation_matrix if page.rotation != 0 else None
            pw, ph = page.rect.width, page.rect.height
            raw_blocks = page.get_text("blocks")
            blocks = []
            for b in raw_blocks:
                r = pymupdf.Rect(b[:4]) * rot_mat if rot_mat else pymupdf.Rect(b[:4])
                blocks.append((r.x0, r.y0, r.x1, r.y1, b[4]))

            for b in blocks:
                txt = b[4].strip()
                txt_clean = re.sub(r'(?is)\bclip\b.*$', '', txt).strip()
                clean_txt = re.sub(r"[\*\s]", "", txt_clean)
                match = re.match(r"^(?:question|\*+|q)?\s*(\d{1,2}(?:\s*\([a-z]\))?(?:\s*\([ivx]{1,4}\))?|\d{1,2}[a-z]?)\b", clean_txt, re.IGNORECASE)
                if match:
                    cid = canonical_id(match.group(1))
                    if cid and cid[0].isdigit() and cid not in self.entries_by_qid:
                        if is_practical_unit and cid.isdigit():
                            continue
                        if not is_practical_unit and is_section_b and cid.isdigit() and int(cid) < 5:
                            continue
                        x0, y0, x1, y1 = b[0], b[1], b[2], b[3]
                        cand_bottoms = [
                            b2[1] for b2 in blocks
                            if b2[1] > y0 + 15 and (
                                re.match(r"^(?:question|q)?\s*\d+", re.sub(r'(?is)\bclip\b.*$', '', b2[4]).strip(), re.IGNORECASE)
                                or "total for" in b2[4].lower()
                            )
                        ]
                        row_bottom_pts = min(cand_bottoms) - 5 if cand_bottoms else min(ph * 0.95, y1 + 100)
                        ymin_1000 = int(max(0, y0 - 10) / ph * 1000)
                        ymax_1000 = int(min(ph, row_bottom_pts + 4) / ph * 1000)
                        if ymax_1000 <= ymin_1000:
                            ymax_1000 = min(1000, ymin_1000 + 100)
                        box_1000 = [
                            ymin_1000,
                            40, # Left table edge
                            ymax_1000,
                            960 # Right table edge
                        ]
                        cand_mark = None
                        for b2 in blocks:
                            if b2[1] >= y0 - 5 and b2[3] <= row_bottom_pts + 10:
                                m_bm = re.search(r"^\(?\s*(\d{1,2})\s*\)?$", b2[4].strip())
                                if m_bm and b2[0] > pw * 0.70:
                                    cand_mark = int(m_bm.group(1))
                                    break

                        self.entries_by_qid[cid] = {
                            "question_number": cid,
                            "raw_id": match.group(1),
                            "page_index": p_idx,
                            "box_1000": box_1000,
                            "mark": cand_mark,
                            "row_text": txt
                        }

        # Apply paper-specific Pearson erratum remappings after full indexing
        self._apply_errata_remappings()

    # ---------------------------------------------------------------------------
    # Pearson Erratum Remappings
    # ---------------------------------------------------------------------------
    # wch12_2024_june: MS P18 printed Roman-numeral labels are shifted +2 forward:
    #   MS "18(b)(iii)" 1m  → QP 18(b)(i)   (Roman numerals in chlorate)
    #   MS "18(b)(iv)"  1m  → QP 18(b)(ii)  (Oxidation number +4)
    #   MS "18(b)(v)"   2m  → QP 18(b)(iii) (Disproportionation range)
    #   MS "18(b)(iv)"  4m  (P20) → QP 18(b)(iv)  (Empirical formula) – correct label
    #   MS "18(b)(v)"   2m  (P20) → QP 18(b)(v)   (Step 1 & 2 equations) – correct label
    _ERRATA: Dict[str, List[Dict[str, Any]]] = {
        "wch12_2024_june": [
            {"ms_cid": "18biii", "qp_cid": "18bi",   "mark_hint": 1},
            {"ms_cid": "18biv",  "qp_cid": "18bii",  "mark_hint": 1},
            {"ms_cid": "18bv",   "qp_cid": "18biii", "mark_hint": 2},
        ],
        "wch16_a_2026_january": [
            {"ms_cid": "2bii", "qp_cid": "2bii", "override_mark": 2},
        ],
    }

    def _apply_errata_remappings(self) -> None:
        """
        Re-keys entries_by_qid entries for known Pearson MS erratum papers.
        Called at the end of index_mark_scheme(). The first time each mis-labelled
        cid appears (from MS P18 in wch12_2024_june) it is re-keyed to the correct
        QP id. Then the P20 rows (correct labels, different marks) are re-scanned
        and inserted under their proper cids.
        """
        errata = self._ERRATA.get(self.paper_id)
        if not errata:
            return

        doc = self.ms_proc.doc

        # Step 1: remap the mis-labelled P18 entries to the correct QP subpart IDs
        for rule in errata:
            ms_cid = rule["ms_cid"]
            qp_cid = rule["qp_cid"]
            mark_hint = rule.get("mark_hint")
            override_mark = rule.get("override_mark")
            entry = self.entries_by_qid.get(ms_cid)
            if entry is None:
                continue
            if override_mark is not None:
                entry["mark"] = override_mark
            if qp_cid != ms_cid:
                # Only remap if the mark matches the hint (1m rows are the mis-labelled ones)
                if mark_hint is not None and entry.get("mark") != mark_hint:
                    continue
                if qp_cid not in self.entries_by_qid:
                    remapped = dict(entry)
                    remapped["question_number"] = qp_cid
                    self.entries_by_qid[qp_cid] = remapped
                del self.entries_by_qid[ms_cid]

        # Step 2: for wch12_2024_june, re-scan MS P20 (0-based index 19) to pick up
        # the correctly-labelled 4m/2m rows that were blocked during the first pass
        # because the mis-labelled P18 entries already occupied those cids.
        if self.paper_id == "wch12_2024_june":
            p20_idx = 19  # 0-based
            if p20_idx < len(doc):
                page = doc[p20_idx]
                ph, pw = page.rect.height, page.rect.width
                for table in page.find_tables():
                    if table.bbox[0] > 130 or (table.bbox[2] - table.bbox[0]) < 300:
                        continue
                    df = table.extract()
                    if not df:
                        continue
                    for r_idx, row in enumerate(df):
                        if not row or not row[0]:
                            continue
                        fc = re.sub(r"\s+", "", re.sub(r'(?is)\bclip\b.*$', '', str(row[0])).strip())
                        fc = fc.rstrip("*")
                        fc = re.sub(r"\)+", ")", fc)
                        m = re.match(r"^(?:question|\*+|q)?\s*(\d{1,2}(?:\(?[a-z0-9]+\)?)*)$", fc, re.IGNORECASE)
                        if not m:
                            continue
                        cid = canonical_id(m.group(1))
                        if cid not in ("18biv", "18bv"):
                            continue
                        cells = [str(c).strip() for c in row if c and str(c).strip()]
                        row_mark = None
                        for c in reversed(cells[1:]):
                            mm = re.match(r"^\(?\s*(\d{1,2})\s*\)?$", c.splitlines()[0].strip())
                            if mm:
                                row_mark = int(mm.group(1))
                                break
                        if cid not in self.entries_by_qid:
                            y0 = table.rows[r_idx].bbox[1] if r_idx < len(table.rows) else table.bbox[1]
                            y1 = table.rows[r_idx].bbox[3] if r_idx < len(table.rows) else table.bbox[3]
                            x0t, _, x1t, _ = table.bbox
                            self.entries_by_qid[cid] = {
                                "question_number": cid,
                                "raw_id": m.group(1),
                                "page_index": p20_idx,
                                "bbox_pts": (x0t, y0, x1t, y1),
                                "box_1000": [
                                    int(y0 / ph * 1000),
                                    int(max(0, x0t - 8) / pw * 1000),
                                    int(y1 / ph * 1000),
                                    int(min(pw, x1t + 8) / pw * 1000),
                                ],
                                "mark": row_mark,
                                "row_text": " ".join(cells),
                            }

    def get_mark_for_question(self, question_number: str) -> Optional[int]:
        """
        Retrieves the authoritative integer mark allocation for a question or subpart
        from the indexed mark scheme. Returns None if not found or unparsed.
        """
        target_cid = canonical_id(question_number)
        entry = self.entries_by_qid.get(target_cid)

        if not entry:
            # Fallback fuzzy match across keys using canonical_id
            for k, v in self.entries_by_qid.items():
                if canonical_id(k) == target_cid:
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

        if entry:
            return entry.get("mark")
        return None

    def _find_detached_diagram(
        self,
        page_idx: int,
        target_cid: str,
        raw_id: str,
        row_text: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Detects whether an organic reaction scheme or mechanism diagram for this question
        is located on a subsequent page (e.g. continuation drawing page or top of next page).
        """
        doc = self.ms_proc.doc
        if page_idx + 1 >= len(doc):
            return None

        next_p_idx = page_idx + 1
        next_page = doc[next_p_idx]
        next_rot = next_page.rotation_matrix if next_page.rotation != 0 else None
        next_pw, next_ph = next_page.rect.width, next_page.rect.height
        next_text = next_page.get_text()
        next_tables = next_page.find_tables().tables

        clean_id = re.sub(r"[\(\)\s]", "", raw_id)
        cid_pat = rf"(?:{re.escape(target_cid)}|{re.escape(raw_id)}|{re.escape(clean_id)})"
        header_pat = re.compile(
            rf"(?:example\s+of\s+(?:mechanism|reaction\s+scheme|scheme)|reaction\s+scheme|mechanism)\s+(?:for\s+)?{cid_pat}",
            re.IGNORECASE
        )

        m = header_pat.search(next_text)
        if m:
            first_table_top = next_tables[0].bbox[1] if next_tables else next_ph * 0.95
            rects = []
            for d in next_page.get_drawings():
                r = pymupdf.Rect(d["rect"]) * next_rot if next_rot else pymupdf.Rect(d["rect"])
                if r.y1 < first_table_top:
                    rects.append(r)
            for b in next_page.get_text("blocks"):
                r = pymupdf.Rect(b[:4]) * next_rot if next_rot else pymupdf.Rect(b[:4])
                if b[4].strip() and r.y1 < first_table_top:
                    rects.append(r)
            if rects:
                c_rect = pymupdf.Rect()
                for r in rects:
                    c_rect.include_rect(r)
                return {
                    "page_index": next_p_idx,
                    "box_1000": [
                        int(max(0, c_rect.y0 - 8) / next_ph * 1000),
                        int(max(0, c_rect.x0 - 8) / next_pw * 1000),
                        int(min(next_ph, c_rect.y1 + 8) / next_ph * 1000),
                        int(min(next_pw, c_rect.x1 + 8) / next_pw * 1000)
                    ],
                    "label": "EXAMPLE OF MECHANISM / REACTION SCHEME"
                }

        has_ref = bool(re.search(r"See below for reaction scheme|reaction scheme|example below|mechanism", row_text, re.IGNORECASE))
        if len(next_tables) == 0 and has_ref and len(next_page.get_drawings()) > 0:
            rects = []
            for d in next_page.get_drawings():
                r = pymupdf.Rect(d["rect"]) * next_rot if next_rot else pymupdf.Rect(d["rect"])
                rects.append(r)
            for b in next_page.get_text("blocks"):
                r = pymupdf.Rect(b[:4]) * next_rot if next_rot else pymupdf.Rect(b[:4])
                if b[4].strip():
                    rects.append(r)
            if rects:
                c_rect = pymupdf.Rect()
                for r in rects:
                    c_rect.include_rect(r)
                return {
                    "page_index": next_p_idx,
                    "box_1000": [
                        int(max(0, c_rect.y0 - 8) / next_ph * 1000),
                        int(max(0, c_rect.x0 - 8) / next_pw * 1000),
                        int(min(next_ph, c_rect.y1 + 8) / next_ph * 1000),
                        int(min(next_pw, c_rect.x1 + 8) / next_pw * 1000)
                    ],
                    "label": "REACTION SCHEMES / CONTINUATION"
                }
        return None

    def _find_lor_continuation(
        self,
        page_idx: int,
        target_cid: str,
        raw_id: str,
        row_text: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Detects whether a Level of Response question's mark scheme rubric (grid)
        continues onto the next page with Indicative Content / Guidance.
        """
        doc = self.ms_proc.doc
        if page_idx + 1 >= len(doc):
            return None

        # Check if current entry is a Level of Response question
        is_lor = bool(re.search(r"indicative\s+(?:content|points|marking)|lines\s+of\s+reasoning|Level\s+[123]|coherent\s+and\s+logically\s+structured", row_text, re.IGNORECASE))
        if not is_lor:
            curr_page_text = doc[page_idx].get_text()
            is_lor = bool(re.search(r"indicative\s+(?:content|points|marking)|lines\s+of\s+reasoning|Level\s+[123]|coherent\s+and\s+logically\s+structured", curr_page_text, re.IGNORECASE))

        if not is_lor:
            return None

        m_p = re.match(r"^(\d+)", target_cid)
        parent_num = m_p.group(1) if m_p else target_cid

        next_p_idx = page_idx + 1
        next_page = doc[next_p_idx]
        next_rot = next_page.rotation_matrix if next_page.rotation != 0 else None
        next_pw, next_ph = next_page.rect.width, next_page.rect.height
        next_text = next_page.get_text()

        has_indicative = bool(re.search(r"\bindicative\s+(?:points|content)\b|\bip1\b", next_text, re.IGNORECASE))
        has_total = bool(re.search(rf"total\s+for\s+question\s+{parent_num}\b", next_text, re.IGNORECASE))

        if not (has_indicative or has_total):
            return None

        next_tables = next_page.find_tables().tables
        y0_pts = next_tables[0].bbox[1] if next_tables else 40.0
        y1_pts = next_tables[0].bbox[3] if next_tables else next_ph * 0.85

        total_pat = re.compile(rf"\(?total\s+for\s+question\s+{parent_num}\b.*?\)?", re.IGNORECASE)
        for b in next_page.get_text("blocks"):
            r = pymupdf.Rect(b[:4]) * next_rot if next_rot else pymupdf.Rect(b[:4])
            if total_pat.search(b[4]):
                y1_pts = max(y1_pts, r.y1 + 14)

        ymin_1000 = int(max(0, y0_pts - 8) / next_ph * 1000)
        ymax_1000 = int(min(next_ph, y1_pts + 14) / next_ph * 1000)

        if next_tables:
            xmin_1000 = int(max(0, next_tables[0].bbox[0] - 8) / next_pw * 1000)
            xmax_1000 = int(min(next_pw, next_tables[0].bbox[2] + 8) / next_pw * 1000)
        else:
            xmin_1000 = 60
            xmax_1000 = 940

        return {
            "page_index": next_p_idx,
            "box_1000": [ymin_1000, xmin_1000, ymax_1000, xmax_1000],
            "label": "INDICATIVE CONTENT & GUIDANCE"
        }

    def crop_for_question(self, question_number: str, output_path: str) -> bool:
        """
        Strictly matches terminal sub-question (e.g. '14(a)' -> '14(a)', '20(b)(iv)' -> '20(b)(iv)').
        Never falls back to a parent prefix like '20(a)' or '20'.
        Preserves the table header at the top of the cropped card.
        Uses scan_markers=False so guidance text and answer points are never clipped.
        """
        target_cid = canonical_id(question_number)
        entry = self.entries_by_qid.get(target_cid)

        if not entry:
            # Fallback fuzzy match across keys using canonical_id
            for k, v in self.entries_by_qid.items():
                if canonical_id(k) == target_cid:
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
            return False

        page_idx = entry["page_index"]
        box_1000 = list(entry["box_1000"])

        # Strict Row Boundary Clamping:
        # In mark schemes, clamp ymax so the crop NEVER spills into subsequent tables or subsequent question rows
        page = self.ms_proc.doc[page_idx]
        ph = page.rect.height
        pw = page.rect.width
        rot_mat = page.rotation_matrix if page.rotation != 0 else None
        start_y_pts = box_1000[0] / 1000.0 * ph

        q_pat = re.compile(r"^\s*\*?\s*(?:question\s+|q\.?\s*)?(\d{1,2}(?:\s*\*?\s*\([a-z0-9]+\)\s*\*?)*)(?:\s+|$|[\.\:\t\*])", re.I)

        # Strict Start Boundary Check:
        # If Column 1 contains an earlier question row above target_cid,
        # adjust start_y_pts and box_1000[0] downwards to the top divider line / header of the target row
        col1_limit = min(115.0, pw * 0.15)
        col1_questions = []
        for b in page.get_text("blocks"):
            r = pymupdf.Rect(b[:4]) * rot_mat if rot_mat else pymupdf.Rect(b[:4])
            if r.x0 < col1_limit:
                txt_clean = re.sub(r'(?is)\bclip\b.*$', '', b[4]).strip()
                m_q = q_pat.match(txt_clean)
                if m_q:
                    cid = canonical_id(m_q.group(1))
                    if cid and cid[0].isdigit():
                        col1_questions.append((r.y0, r.y1, cid, m_q.group(1)))

        target_item = next((q for q in col1_questions if q[2] == target_cid), None)
        if target_item and target_item[0] > start_y_pts + 15:
            earlier = [q for q in col1_questions if q[0] < target_item[0] and q[0] >= start_y_pts - 5]
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
        for t in page.find_tables().tables:
            table_w = t.bbox[2] - t.bbox[0]
            # ONLY consider subsequent tables that start near the left margin, span full table width,
            # and start below the current question header
            if t.bbox[1] > start_y_pts + 30 and t.bbox[0] < pw * 0.15 and table_w > pw * 0.65:
                t_df = t.extract()
                if not t_df:
                    continue
                has_hdr = any(is_ms_header_row(r) for r in t_df[:2])
                has_subsequent_q = False
                for r in t_df[:3]:
                    for c in (r[:2] if len(r) >= 2 else r):
                        if c:
                            txt_clean = re.sub(r'(?is)\bclip\b.*$', '', str(c)).strip()
                            m = q_pat.match(txt_clean)
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
                # Only treat as a subsequent question table if it actually begins a new question or table header
                if has_hdr or has_subsequent_q:
                    cand_limits.append(t.bbox[1])

        for b in page.get_text("blocks"):
            r = pymupdf.Rect(b[:4]) * rot_mat if rot_mat else pymupdf.Rect(b[:4])
            if r.y0 > start_y_pts + 25:
                txt = b[4].strip()
                # Determine row bottom strictly by Next Question Header in Column 1 (Question column is at left edge <= 115 pts)
                is_col1 = r.x0 < min(115.0, pw * 0.15)
                if is_col1 and re.match(r"^Question\s+number", txt, re.I):
                    cand_limits.append(r.y0)
                    continue
                txt_clean = re.sub(r'(?is)\bclip\b.*$', '', txt).strip()
                m = q_pat.match(txt_clean)
                if m and is_col1:
                    cand_cid = canonical_id(m.group(1))
                    if cand_cid and cand_cid != target_cid and not target_cid.startswith(cand_cid):
                        # Advance check: candidate question number cannot be earlier than target question
                        m_target_p = re.match(r"^(\d+)", target_cid)
                        m_cand_p = re.match(r"^(\d+)", cand_cid)
                        if m_target_p and m_cand_p and int(m_cand_p.group(1)) < int(m_target_p.group(1)):
                            continue
                        cand_limits.append(r.y0)
                elif re.search(r"total\s+for\s+(?:question|section|paper)", txt, re.I):
                    cand_limits.append(r.y0)

        if cand_limits:
            next_boundary = min(min(cand_limits) - 2, footer_boundary)
            if orig_table_y1_pts > next_boundary and next_boundary > start_y_pts + 40:
                box_1000[2] = int(next_boundary / ph * 1000)
                orig_table_y1_pts = next_boundary
        else:
            next_boundary = footer_boundary

        # Same-Page Illustrative Diagram & Unnumbered Box Capture:
        # Check if unnumbered boxes, drawings, curves, images, or text blocks exist in the vertical gap [orig_table_y1_pts, next_boundary]
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
                                txt_clean = re.sub(r'(?is)\bclip\b.*$', '', str(c)).strip()
                                m = q_pat.match(txt_clean)
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

        is_internal_row = any(t.bbox[1] < start_y_pts - 10 and t.bbox[3] > start_y_pts + 20 for t in page.find_tables().tables)
        ms_crop = self.ms_proc.crop_box(
            page_idx, box_1000, dpi=300, padding=14, padding_top=0 if is_internal_row else 14, padding_bottom=4, clamp_horizontal=False, scan_markers=False
        )

        # Detached Diagram Check & Stitching:
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

        # Level of Response Continuation Check & Stitching:
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

        dir_name = os.path.dirname(output_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        ms_crop.save(output_path, "PNG", optimize=True)
        return True
