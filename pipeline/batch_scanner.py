"""
Batch Scanner & Pairing Module:
- Traverses all subdirectories inside papers/ (e.g. 'papers/2026 Jan/', 'papers/2025 May June/', etc.)
- Pairs Question Papers (QP) with corresponding Mark Schemes (MS)
- Extracts rich metadata: year, session, series, unit, paper_code, variant
"""

import os
import re
import hashlib
from typing import Dict, Any, List, Optional, Tuple

ROMAN_NUMERALS = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"}

SESSION_NORMALIZATION = {
    "jan": "January",
    "january": "January",
    "jun": "June",
    "june": "June",
    "may": "May",
    "may/june": "May/June",
    "may june": "May/June",
    "oct": "October",
    "october": "October",
}

def normalize_session(raw: str) -> str:
    cleaned = raw.strip().lower()
    for k, v in SESSION_NORMALIZATION.items():
        if k in cleaned:
            return v
    return raw.strip().capitalize()

def parse_series_folder(folder_name: str) -> Tuple[int, str, str]:
    """
    Parses folder name like '2026 Jan', '2019 January', '2025 May June', 'sample_papers' into:
    (year, session, normalized_series)
    """
    clean = folder_name.strip()
    if clean.lower().startswith("sample"):
        return 2025, "June", "2025 May/June"

    m_year = re.search(r"\b(20\d\d)\b", clean)
    year = int(m_year.group(1)) if m_year else 2025

    # Extract session string
    session_part = re.sub(r"\b20\d\d\b", "", clean).strip()
    session = normalize_session(session_part) if session_part else "June"
    series = f"{year} {session}"
    return year, session, series

def parse_paper_filename(filename: str, folder_hint: str = "") -> Dict[str, Any]:
    """
    Inspects filename and folder context to extract:
    is_qp, is_ms, unit_num (1..6), variant ('', 'R', 'A', 'UNUSED'), paper_code
    """
    fname = filename.lower()
    path_hint = folder_hint.lower()

    # Determine QP vs MS
    is_qp = False
    is_ms = False
    if "question-paper" in path_hint or "questionpaper" in path_hint:
        is_qp = True
    elif "mark-scheme" in path_hint or "markscheme" in path_hint:
        is_ms = True

    if not is_qp and not is_ms:
        if "_que_" in fname or "-que-" in fname or "_qp" in fname or "-qp" in fname or "que" in fname:
            is_qp = True
        elif "_rms_" in fname or "-rms-" in fname or "_msc_" in fname or "-msc-" in fname or "_ms" in fname or "-ms" in fname:
            is_ms = True

    # Detect unit number and variant
    unit_num = None
    variant = ""

    # Check for UNUSED paper
    if "unused" in fname:
        variant = "UNUSED"

    # Pattern 1: wch11-01a or wch11_01r or wch11-01
    m_wch_var = re.search(r"wch1([1-6])[-_]01([ra]?)", fname)
    if m_wch_var:
        unit_num = int(m_wch_var.group(1))
        if not variant and m_wch_var.group(2):
            variant = m_wch_var.group(2).upper()

    # Pattern 2: wch11 .. wch16
    if unit_num is None:
        m_wch = re.search(r"wch1([1-6])([ra]?)", fname)
        if m_wch:
            unit_num = int(m_wch.group(1))
            if not variant and m_wch.group(2):
                variant = m_wch.group(2).upper()

    # Pattern 3: u1a, u1r, u1, u6_a
    if unit_num is None:
        m_u = re.search(r"[^a-z0-9]u([1-6])[\s_-]?([ra]?)[^a-z0-9]", fname)
        if m_u:
            unit_num = int(m_u.group(1))
            if not variant and m_u.group(2):
                variant = m_u.group(2).upper()

    # Pattern 4: unit 1, unit_1, unit 1r
    if unit_num is None:
        m_unit = re.search(r"unit[\s_-]?([1-6])[\s_-]?([ra]?)", fname)
        if m_unit:
            unit_num = int(m_unit.group(1))
            if not variant and m_unit.group(2):
                variant = m_unit.group(2).upper()

    # If still not found, fallback to any digit after WCH or U
    if unit_num is None:
        m_fallback = re.search(r"[uU]([1-6])", filename)
        if m_fallback:
            unit_num = int(m_fallback.group(1))

    # Normalize variant: e.g. R papers are sometimes labeled 'A' or 'R'
    if variant in ["A", "R"]:
        # Standardize variant
        variant = "R" if variant == "R" else "A"

    unit_code = f"WCH1{unit_num}" if unit_num else "UNKNOWN"
    if variant and variant != "UNUSED":
        unit_code_with_var = f"{unit_code}{variant}"
    elif variant == "UNUSED":
        unit_code_with_var = f"{unit_code}_UNUSED"
    else:
        unit_code_with_var = unit_code

    paper_code = f"{unit_code}/01{variant}" if variant else f"{unit_code}/01"

    return {
        "is_qp": is_qp,
        "is_ms": is_ms,
        "unit_num": unit_num,
        "variant": variant,
        "unit_code": unit_code_with_var,
        "base_unit_code": unit_code,
        "unit_name": f"Unit {unit_num}" if unit_num else "Unit 1",
        "paper_code": paper_code
    }

def compute_file_hash(filepath: str) -> str:
    """Computes SHA-256 hash of a file."""
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return ""

def scan_papers_directory(
    papers_dir: str = "papers",
    unit_filter: Optional[str] = None,
    series_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Scans papers directory and pairs QPs with MSs.
    Returns sorted list of paper pair dictionaries with complete metadata.
    """
    if not os.path.exists(papers_dir):
        return []

    # Check if papers_dir is directly a flat directory (like sample_papers/)
    # or contains series subdirectories
    children = sorted(os.listdir(papers_dir))
    subdirs = [c for c in children if os.path.isdir(os.path.join(papers_dir, c))]

    series_folders: List[Tuple[str, str]] = []
    if subdirs and any(re.search(r"20\d\d", d) for d in subdirs):
        for sd in subdirs:
            series_folders.append((sd, os.path.join(papers_dir, sd)))
    else:
        # Flat directory
        series_folders.append((os.path.basename(papers_dir), papers_dir))

    all_pairs: List[Dict[str, Any]] = []

    for folder_name, folder_path in series_folders:
        year, session, series_str = parse_series_folder(folder_name)

        # Apply series filter if given
        if series_filter:
            f_year, f_session, _ = parse_series_folder(series_filter)
            sf = series_filter.strip().lower()
            sf_clean = re.sub(r"[^a-z0-9]+", "", sf)
            fn_clean = re.sub(r"[^a-z0-9]+", "", folder_name.lower())
            ser_clean = re.sub(r"[^a-z0-9]+", "", series_str.lower())
            matched = (
                (f_year == year and f_session.lower() == session.lower())
                or sf in folder_name.lower()
                or sf in series_str.lower()
                or folder_name.lower() in sf
                or sf_clean in fn_clean
                or fn_clean in sf_clean
                or sf_clean == ser_clean
            )
            if not matched:
                continue

        qp_dict: Dict[Tuple[int, str], Dict[str, Any]] = {}
        ms_dict: Dict[Tuple[int, str], Dict[str, Any]] = {}

        for root, _, files in os.walk(folder_path):
            for f in files:
                if not f.lower().endswith(".pdf"):
                    continue
                full_path = os.path.join(root, f)
                parsed = parse_paper_filename(f, folder_hint=root)
                u_num = parsed["unit_num"]
                if u_num is None:
                    continue
                var = parsed["variant"]
                key = (u_num, var)

                if parsed["is_qp"]:
                    qp_dict[key] = {
                        "filename": f,
                        "path": full_path,
                        "parsed": parsed
                    }
                elif parsed["is_ms"]:
                    ms_dict[key] = {
                        "filename": f,
                        "path": full_path,
                        "parsed": parsed
                    }

        # Filter out byte-identical duplicate mark schemes across variants in the same folder
        # (e.g. October 2025 where Chemistry_U3A_MS.pdf is a duplicate copy of Chemistry_U3_MS.pdf)
        ms_hashes: Dict[str, Tuple[int, str]] = {}
        valid_ms_dict: Dict[Tuple[int, str], Dict[str, Any]] = {}
        # Prioritize standard paper (variant == '') over variants so standard paper is retained
        for k in sorted(ms_dict.keys(), key=lambda x: (x[0], x[1] != "")):
            v = ms_dict[k]
            try:
                with open(v["path"], "rb") as ms_f:
                    h = hashlib.sha256(ms_f.read()).hexdigest()
                if h in ms_hashes:
                    continue
                ms_hashes[h] = k
                valid_ms_dict[k] = v
            except Exception:
                valid_ms_dict[k] = v
        ms_dict = valid_ms_dict

        # Pair QPs with matching MSs
        for key, qp_info in qp_dict.items():
            u_num, var = key
            parsed = qp_info["parsed"]

            # Filter by unit if given
            if unit_filter:
                uf = unit_filter.strip().lower()
                matched = False
                if uf in [str(u_num), f"u{u_num}", f"unit {u_num}", f"unit{u_num}"]:
                    matched = True
                elif uf in ["wch11", "wch12", "wch13", "wch14", "wch15", "wch16"]:
                    matched = (uf == parsed["base_unit_code"].lower())
                elif uf == parsed["unit_code"].lower() or uf == parsed["base_unit_code"].lower():
                    matched = True
                if not matched:
                    continue

            # Find matching MS
            ms_info = ms_dict.get(key)
            if not ms_info:
                # Omit question papers without an authentic matching mark scheme
                continue

            # Unique sanitized Paper ID e.g. wch11_2026_jan or wch11r_2026_june
            var_slug = f"_{var.lower()}" if var else ""
            session_slug = re.sub(r"[^a-zA-Z0-9]+", "", session.lower())
            paper_id = f"{parsed['base_unit_code'].lower()}{var_slug}_{year}_{session_slug}"

            all_pairs.append({
                "paper_id": paper_id,
                "unit_num": u_num,
                "unit_code": parsed["unit_code"],
                "base_unit_code": parsed["base_unit_code"],
                "unit_name": parsed["unit_name"],
                "paper_code": parsed["paper_code"],
                "year": year,
                "session": session,
                "series": series_str,
                "series_folder": folder_name,
                "variant": var,
                "que_path": qp_info["path"],
                "rms_path": ms_info["path"] if ms_info else None,
                "que_filename": qp_info["filename"],
                "rms_filename": ms_info["filename"] if ms_info else None
            })

    # Sort pairs by year descending, session, unit_num, variant
    all_pairs.sort(key=lambda p: (-p["year"], p["series"], p["unit_num"], p["variant"]))
    return all_pairs
