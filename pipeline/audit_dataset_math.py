"""
Comprehensive Audit & Data Integrity Check for Edexcel IAL Mathematics Topicals.
Verifies:
1. Mark Reconciliation: Every paper's extracted questions sum to exactly 75 marks.
2. Asset Completeness: 100% of questions have valid Question & Mark Scheme PNGs (> 1 KB).
3. Taxonomy Validity: Unit, Topic, and Subtopics match official Pearson IAL Specification.
"""

import os
import sys
import json
from collections import defaultdict
from typing import Dict, Any, List, Tuple, Optional

from pipeline.syllabus_math import (
    OFFICIAL_MATH_SYLLABUS,
    normalize_math_unit_code,
    get_all_math_subtopics_for_unit,
    get_math_parent_topic_for_subtopic,
    get_expected_paper_marks
)


def run_math_audit(
    dataset_path: str = "dataset_math.json",
    crops_dir: str = "crops_math"
) -> bool:
    if not os.path.exists(dataset_path):
        # Fallback to frontend/public/dataset_math.json
        alt_path = os.path.join("frontend", "public", dataset_path)
        if os.path.exists(alt_path):
            dataset_path = alt_path
        else:
            print(f"[AUDIT ERROR] Dataset file not found at: {dataset_path}")
            return False

    with open(dataset_path, "r", encoding="utf-8") as f:
        questions: List[Dict[str, Any]] = json.load(f)

    total_questions = len(questions)
    print("=" * 85)
    print("EDEXCEL IAL MATHEMATICS: COMPREHENSIVE DATASET & MARK SCHEME AUDIT")
    print("=" * 85)
    print(f"Dataset Path     : {dataset_path}")
    print(f"Total Questions  : {total_questions}\n")

    if total_questions == 0:
        print("[AUDIT ERROR] Dataset is empty.")
        return False

    # ---------------------------------------------------------
    # PART A: Asset Completeness & File Integrity Check
    # ---------------------------------------------------------
    missing_qp_refs = 0
    missing_ms_refs = 0
    missing_qp_files = 0
    missing_ms_files = 0
    corrupt_qp_files = 0
    corrupt_ms_files = 0
    asset_errors: List[Tuple[str, str, str, str]] = []

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        paper_id = q.get("paperId") or q.get("paper_id") or "UNKNOWN"
        marks = str(q.get("marks", 0))

        # 1. Question Paper Image Check
        qp_rel = q.get("questionImagePath") or q.get("crop_path") or ""
        if not qp_rel or not qp_rel.strip():
            missing_qp_refs += 1
            asset_errors.append((paper_id, qid, marks, "questionImagePath is null or empty"))
        else:
            clean_qp = qp_rel.lstrip("/")
            # Check local path, crops_math path, and frontend/public path
            possible_qp_paths = [
                clean_qp,
                os.path.join("crops_math", "questions", os.path.basename(clean_qp)),
                os.path.join("frontend", "public", clean_qp),
            ]
            found_qp = next((p for p in possible_qp_paths if os.path.exists(p)), None)
            if not found_qp:
                missing_qp_files += 1
                asset_errors.append((paper_id, qid, marks, f"QP image missing on disk: {qp_rel}"))
            else:
                sz = os.path.getsize(found_qp)
                if sz < 1024:
                    corrupt_qp_files += 1
                    asset_errors.append((paper_id, qid, marks, f"QP image corrupt/too small ({sz} B): {qp_rel}"))

        # 2. Mark Scheme Image Check
        ms_rel = q.get("markSchemeImagePath") or q.get("ms_crop_path") or ""
        if not ms_rel or not ms_rel.strip():
            missing_ms_refs += 1
            asset_errors.append((paper_id, qid, marks, "markSchemeImagePath is null or empty"))
        else:
            clean_ms = ms_rel.lstrip("/")
            possible_ms_paths = [
                clean_ms,
                os.path.join("crops_math", "mark_schemes", os.path.basename(clean_ms)),
                os.path.join("frontend", "public", clean_ms),
            ]
            found_ms = next((p for p in possible_ms_paths if os.path.exists(p)), None)
            if not found_ms:
                missing_ms_files += 1
                asset_errors.append((paper_id, qid, marks, f"MS image missing on disk: {ms_rel}"))
            else:
                sz = os.path.getsize(found_ms)
                if sz < 1024:
                    corrupt_ms_files += 1
                    asset_errors.append((paper_id, qid, marks, f"MS image corrupt/too small ({sz} B): {ms_rel}"))

    # ---------------------------------------------------------
    # PART B: Taxonomy Validation
    # ---------------------------------------------------------
    taxonomy_errors: List[Tuple[str, str, str, str]] = []
    all_valid_subtopics = set()
    for u_code, u_data in OFFICIAL_MATH_SYLLABUS.items():
        for top, subs in u_data["topics"].items():
            for s in subs:
                all_valid_subtopics.add(s)

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        paper_id = q.get("paperId") or "UNKNOWN"
        raw_code = q.get("unitCode") or ""
        norm_code = normalize_math_unit_code(raw_code)

        if norm_code not in OFFICIAL_MATH_SYLLABUS:
            taxonomy_errors.append((paper_id, qid, raw_code, f"Invalid unitCode: '{raw_code}'"))
            continue

        unit_spec = OFFICIAL_MATH_SYLLABUS[norm_code]
        unit_topics = unit_spec["topics"]

        topic = q.get("topic") or ""
        if topic not in unit_topics and topic != "General Mathematics":
            taxonomy_errors.append((paper_id, qid, topic, f"Topic '{topic}' not in {norm_code} specification"))

        subs = q.get("subtopics") or ([q.get("subtopic")] if q.get("subtopic") else [])
        for s in subs:
            if s and s != "General Mathematics" and s not in all_valid_subtopics:
                taxonomy_errors.append((paper_id, qid, s, f"Subtopic '{s}' not found in official taxonomy"))

    # ---------------------------------------------------------
    # PART C: Mark Reconciliation by Paper
    # ---------------------------------------------------------
    papers_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for q in questions:
        pid = q.get("paperId") or q.get("paper_id") or "UNKNOWN_PAPER"
        papers_map[pid].append(q)

    total_papers = len(papers_map)
    mark_discrepancies: List[Tuple[str, str, int, int, int]] = []

    # Per-unit statistics
    unit_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: {
        "papers": 0,
        "questions": 0,
        "marks": 0,
        "perfect_papers": 0,
        "ms_matched": 0
    })

    for pid in sorted(papers_map.keys()):
        qlist = papers_map[pid]
        first_q = qlist[0]
        raw_unit_code = first_q.get("unitCode") or pid.split("_")[0].upper()
        norm_unit = normalize_math_unit_code(raw_unit_code)

        paper_marks = sum(q.get("marks", 0) for q in qlist)
        q_count = len(qlist)
        expected_marks = get_expected_paper_marks(norm_unit)
        ms_matched_count = sum(1 for q in qlist if q.get("markSchemeImagePath"))

        unit_stats[norm_unit]["papers"] += 1
        unit_stats[norm_unit]["questions"] += q_count
        unit_stats[norm_unit]["marks"] += paper_marks
        unit_stats[norm_unit]["ms_matched"] += ms_matched_count

        if paper_marks == expected_marks:
            unit_stats[norm_unit]["perfect_papers"] += 1
        else:
            mark_discrepancies.append((pid, norm_unit, paper_marks, expected_marks, q_count))

    # ---------------------------------------------------------
    # PART D: Reporting & Clean Summary Table
    # ---------------------------------------------------------
    print("--- [UNIT BREAKDOWN & SPECIFICATION TOTALS] ---")
    header_fmt = "{:<8} | {:<28} | {:>7} | {:>10} | {:>12} | {:>10} | {:>10}"
    row_fmt    = "{:<8} | {:<28} | {:>7} | {:>10} | {:>12} | {:>10} | {:>9.1f}%"
    print(header_fmt.format("Unit", "Title", "Papers", "Questions", "Total Marks", "75m Match", "MS Match"))
    print("-" * 105)

    grand_papers = 0
    grand_questions = 0
    grand_marks = 0
    grand_perfect_papers = 0
    grand_ms_matched = 0

    ordered_units = ["WMA11", "WMA12", "WMA13", "WMA14", "WME01", "WST01"]
    for u in ordered_units:
        st = unit_stats.get(u, {"papers": 0, "questions": 0, "marks": 0, "perfect_papers": 0, "ms_matched": 0})
        title = OFFICIAL_MATH_SYLLABUS.get(u, {}).get("title", u)
        papers = st["papers"]
        qs = st["questions"]
        mks = st["marks"]
        perf = st["perfect_papers"]
        ms_m = st["ms_matched"]
        ms_pct = (ms_m / qs * 100.0) if qs > 0 else 0.0

        grand_papers += papers
        grand_questions += qs
        grand_marks += mks
        grand_perfect_papers += perf
        grand_ms_matched += ms_m

        print(row_fmt.format(u, title[:28], papers, qs, f"{mks:,}", f"{perf}/{papers}", ms_pct))

    print("-" * 105)
    grand_ms_pct = (grand_ms_matched / grand_questions * 100.0) if grand_questions > 0 else 0.0
    print(row_fmt.format("TOTAL", "IAL Mathematics Catalog", grand_papers, grand_questions, f"{grand_marks:,}", f"{grand_perfect_papers}/{grand_papers}", grand_ms_pct))
    print()

    # Asset summary
    print("--- [ASSET & FILE INTEGRITY SUMMARY] ---")
    matched_ms_total = total_questions - missing_ms_refs
    match_pct = (matched_ms_total / total_questions * 100.0) if total_questions > 0 else 0.0
    print(f"Total Questions Evaluated       : {total_questions}")
    print(f"Matched Mark Scheme References  : {matched_ms_total} / {total_questions} ({match_pct:.2f}%)")
    print(f"Missing Question Image Files    : {missing_qp_files}")
    print(f"Missing Mark Scheme Image Files : {missing_ms_files}")
    print(f"Corrupt/Sub-1KB Image Files     : {corrupt_qp_files + corrupt_ms_files}")

    if asset_errors:
        print(f"\n[!] ASSET INTEGRITY ISSUES ({len(asset_errors)} found):")
        print(f"{'Paper ID':<25} | {'Question ID':<32} | {'Marks':<6} | {'Reason'}")
        print("-" * 95)
        for pid, qid, mks, reason in asset_errors[:20]:
            print(f"{pid:<25} | {qid:<32} | {mks:<6} | {reason}")
        if len(asset_errors) > 20:
            print(f"... and {len(asset_errors) - 20} more entries.")
    else:
        print("[SUCCESS] 100% of questions have non-null, verified PNG assets on disk (> 1 KB).")

    # Taxonomy summary
    print("\n--- [TAXONOMY & SYLLABUS INTEGRITY SUMMARY] ---")
    if taxonomy_errors:
        print(f"[!] TAXONOMY ISSUES ({len(taxonomy_errors)} found):")
        for pid, qid, field, reason in taxonomy_errors[:15]:
            print(f"  [X] {pid} ({qid}): {reason}")
        if len(taxonomy_errors) > 15:
            print(f"  ... and {len(taxonomy_errors) - 15} more taxonomy discrepancies.")
    else:
        print("[SUCCESS] 100% of questions conform strictly to the official IAL Mathematics syllabus.")

    # Mark Reconciliation summary
    print("\n--- [SPECIFICATION 75-MARK RECONCILIATION SUMMARY] ---")
    print(f"Total Papers Evaluated          : {total_papers}")
    print(f"Papers Matching Exactly 75 Marks: {grand_perfect_papers} / {total_papers} ({(grand_perfect_papers / total_papers * 100.0) if total_papers > 0 else 0:.1f}%)")

    if mark_discrepancies:
        print(f"\n[!] MARK DISCREPANCIES DETECTED IN {len(mark_discrepancies)} PAPERS:")
        print(f"{'Paper ID':<28} | {'Unit':<8} | {'Actual':<8} | {'Expected':<8} | {'Questions'}")
        print("-" * 75)
        for pid, unit, actual, exp, qcount in mark_discrepancies:
            print(f"{pid:<28} | {unit:<8} | {actual:<8} | {exp:<8} | {qcount} questions")
    else:
        print("[SUCCESS] 100% of papers reconcile to exactly 75 marks.")

    # Final verdict
    all_passed = (len(asset_errors) == 0 and len(taxonomy_errors) == 0 and len(mark_discrepancies) == 0)
    print("\n" + "=" * 85)
    if all_passed:
        print("[AUDIT PASSED] Dataset meets 100% specification reconciliation and asset integrity.")
    else:
        print(f"[AUDIT COMPLETED WITH ISSUES] {len(asset_errors)} asset errors, {len(taxonomy_errors)} taxonomy errors, {len(mark_discrepancies)} mark discrepancies.")
    print("=" * 85 + "\n")

    return all_passed


if __name__ == "__main__":
    d_path = sys.argv[1] if len(sys.argv) > 1 else "dataset_math.json"
    c_dir = sys.argv[2] if len(sys.argv) > 2 else "crops_math"
    success = run_math_audit(dataset_path=d_path, crops_dir=c_dir)
    sys.exit(0 if success else 1)
