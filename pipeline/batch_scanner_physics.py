"""
Batch Scanner & Pairing Module for Edexcel IAL Physics (WPH11–WPH16):
- Traverses all subdirectories inside papers_physics/ (e.g. 'papers_physics/2024 Jan/', 'papers_physics/2025 Oct Nov/', etc.)
- Pairs Question Papers (QP) with corresponding Mark Schemes (MS)
- Extracts rich metadata: year, session, series, unit, paper_code, variant
"""

import os
import re
import hashlib
from typing import Dict, Any, List, Optional, Tuple

SESSION_NORMALIZATION = {
    "jan": "January",
    "january": "January",
    "jun": "June",
    "june": "June",
    "may": "May",
    "may/june": "May/June",
    "may june": "May/June",
    "oct nov": "October",
    "oct/nov": "October",
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
    Parses folder name like '2024 Jan', '2025 Oct Nov', '2019 January', '2026 June' into:
    (year, session, normalized_series)
    """
    clean = folder_name.strip()
    if clean.lower().startswith("sample"):
        return 2025, "June", "2025 May/June"

    m_year = re.search(r"\b(20\d\d)\b", clean)
    year = int(m_year.group(1)) if m_year else 2025

    session_part = re.sub(r"\b20\d\d\b", "", clean).strip()
    session = normalize_session(session_part) if session_part else "June"
    series = f"{year} {session}"
    return year, session, series

def parse_physics_paper_filename(filename: str, folder_hint: str = "") -> Dict[str, Any]:
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
        if any(x in fname for x in ["_que_", "-que-", "_qp", "-qp", "que", "questionpaper"]):
            is_qp = True
        elif any(x in fname for x in ["_rms_", "-rms_", "_msc_", "-msc-", "_ms", "-ms", "markscheme"]):
            is_ms = True

    unit_num = None
    variant = ""

    # Check for UNUSED paper
    if "unused" in fname:
        variant = "UNUSED"

    # Pattern 1: wph11-01a or wph11_01r or wph11-01
    m = re.search(r"wph1([1-6])[-_]01([ra]?)", fname)
    if m:
        unit_num = int(m.group(1))
        if not variant and m.group(2):
            variant = m.group(2).upper()

    # Pattern 2: wph11 .. wph16
    if unit_num is None:
        m = re.search(r"wph1([1-6])([ra]?)", fname)
        if m:
            unit_num = int(m.group(1))
            if not variant and m.group(2):
                variant = m.group(2).upper()

    # Pattern 3: Unit 1, Unit1, Unit1(WPH11)
    if unit_num is None:
        m = re.search(r"unit[\s_-]?([1-6])(?:\(wph1[1-6]\))?[\s_-]?([ra]?)", fname)
        if m:
            unit_num = int(m.group(1))
            if not variant and m.group(2):
                variant = m.group(2).upper()

    # Pattern 4: Physics_U1_QP or 25_06_QP_U1 or Physics_U3A_MS
    if unit_num is None:
        m = re.search(r"[_\s-]u([1-6])([ra]?)[_\s\.]", fname)
        if m:
            unit_num = int(m.group(1))
            if not variant and m.group(2):
                variant = m.group(2).upper()

    # Pattern 5: ial-wph13-01-oct19.pdf
    if unit_num is None:
        m = re.search(r"wph1([1-6])", fname)
        if m:
            unit_num = int(m.group(1))

    # Fallback to Unit 1 if unknown
    if unit_num is None:
        unit_num = 1

    unit_code = f"WPH1{unit_num}"
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
        "unit_name": f"Unit {unit_num}",
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

def scan_physics_papers_directory(
    papers_dir: str = "papers_physics",
    unit_filter: Optional[str] = None,
    series_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Scans papers_physics directory and pairs QPs with MSs.
    Returns sorted list of paper pair dictionaries with complete metadata.
    """
    if not os.path.exists(papers_dir):
        return []

    children = sorted(os.listdir(papers_dir))
    subdirs = [c for c in children if os.path.isdir(os.path.join(papers_dir, c))]

    series_folders: List[Tuple[str, str]] = []
    if subdirs and any(re.search(r"20\d\d", d) for d in subdirs):
        for sd in subdirs:
            series_folders.append((sd, os.path.join(papers_dir, sd)))
    else:
        series_folders.append((os.path.basename(papers_dir), papers_dir))

    all_pairs: List[Dict[str, Any]] = []

    for folder_name, folder_path in series_folders:
        year, session, series_str = parse_series_folder(folder_name)

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
                parsed = parse_physics_paper_filename(f, folder_hint=root)
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
        ms_hashes: Dict[str, Tuple[int, str]] = {}
        valid_ms_dict: Dict[Tuple[int, str], Dict[str, Any]] = {}
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

            if unit_filter:
                uf = unit_filter.strip().lower()
                matched = False
                if uf in [str(u_num), f"u{u_num}", f"unit {u_num}", f"unit{u_num}"]:
                    matched = True
                elif uf in ["wph11", "wph12", "wph13", "wph14", "wph15", "wph16"]:
                    matched = (uf == parsed["base_unit_code"].lower())
                elif uf == parsed["unit_code"].lower() or uf == parsed["base_unit_code"].lower():
                    matched = True
                if not matched:
                    continue

            ms_info = ms_dict.get(key)
            if not ms_info:
                continue

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

    all_pairs.sort(key=lambda p: (-p["year"], p["series"], p["unit_num"], p["variant"]))
    return all_pairs

if __name__ == "__main__":
    import argparse
    from pipeline.extract_physics import run_physics_extraction

    parser = argparse.ArgumentParser(description="Edexcel IAL Physics Batch Extractor (WPH11–WPH16)")
    parser.add_argument("--all", action="store_true", help="Scan and process all series across papers_physics/")
    parser.add_argument("--papers-dir", default="papers_physics", help="Directory containing past paper series")
    parser.add_argument("--output-crops-dir", default="crops_physics", help="Directory for cropped images")
    parser.add_argument("--output-dataset", default="dataset_physics.json", help="Path to output dataset JSON")
    parser.add_argument("--manifest", default="pipeline_manifest_physics.json", help="Path to manifest JSON")
    parser.add_argument("--unit", default=None, help="Filter by unit (e.g. WPH12)")
    parser.add_argument("--series", default=None, help="Filter by series")
    parser.add_argument("--paper", "--paper-id", dest="paper", default=None, help="Filter by paper ID or filename")
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
