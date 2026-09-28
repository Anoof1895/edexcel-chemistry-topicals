"""
Comprehensive QP-to-MS Matching Audit & Data Integrity Check for Edexcel Chemistry Topicals.
Verifies:
1. 100% Mark Scheme Matching (non-null path, zero 'Mark Scheme Pending', physical file existence on disk).
2. Physical existence of Question Paper images on disk.
3. Specification Mark Audits:
   - Units 1 & 2: 20 marks Section A MCQ, 80 marks overall.
   - Units 4 & 5: 20 marks Section A MCQ, 90 marks overall.
   - Units 3 & 6: 50 marks overall, 0 MCQs.
"""

import os
import sys
import json
from collections import defaultdict
from typing import Dict, Any, List, Tuple

def run_audit(dataset_path: str = "frontend/public/dataset.json", public_dir: str = "frontend/public") -> bool:
    if not os.path.exists(dataset_path):
        print(f"[AUDIT ERROR] Dataset file not found at: {dataset_path}")
        return False

    with open(dataset_path, "r", encoding="utf-8") as f:
        questions: List[Dict[str, Any]] = json.load(f)

    total_questions = len(questions)
    print("=" * 80)
    print("EDEXCEL IAL CHEMISTRY: COMPREHENSIVE DATASET & MARK SCHEME AUDIT")
    print("=" * 80)
    print(f"Total Question Items in Dataset: {total_questions}")
    print(f"Dataset Path: {dataset_path}")
    print(f"Assets Public Root: {public_dir}\n")

    # ---------------------------------------------------------
    # PART A: 100% Mark Scheme Matching & File Integrity Audit
    # ---------------------------------------------------------
    missing_ms_count = 0
    missing_ms_files = 0
    missing_qp_files = 0
    pending_status_count = 0
    ms_errors: List[Tuple[str, str, str, str]] = []

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        paper_code = q.get("paperCode") or q.get("paperId") or "UNKNOWN"
        marks = str(q.get("marks", 0))

        # Check status
        status = str(q.get("status") or "")
        if "pending" in status.lower():
            pending_status_count += 1
            ms_errors.append((paper_code, qid, marks, f"Status is '{status}'"))

        # Check markSchemeImagePath
        ms_rel = q.get("markSchemeImagePath") or ""
        if not ms_rel or not ms_rel.strip():
            missing_ms_count += 1
            ms_errors.append((paper_code, qid, marks, "markSchemeImagePath is null/empty"))
        else:
            # Check physical file existence on disk
            clean_ms_rel = ms_rel.lstrip("/")
            ms_full_path = os.path.join(public_dir, clean_ms_rel)
            # Also check alternative in crops/
            crops_alt = os.path.join(public_dir, "crops", os.path.basename(clean_ms_rel))
            if not os.path.exists(ms_full_path) and not os.path.exists(crops_alt):
                missing_ms_files += 1
                ms_errors.append((paper_code, qid, marks, f"MS file missing on disk: {ms_rel}"))

        # Check questionImagePath
        qp_rel = q.get("questionImagePath") or ""
        if not qp_rel or not qp_rel.strip():
            missing_qp_files += 1
            ms_errors.append((paper_code, qid, marks, "questionImagePath is null/empty"))
        else:
            clean_qp_rel = qp_rel.lstrip("/")
            qp_full_path = os.path.join(public_dir, clean_qp_rel)
            crops_alt_qp = os.path.join(public_dir, "crops", os.path.basename(clean_qp_rel))
            if not os.path.exists(qp_full_path) and not os.path.exists(crops_alt_qp):
                missing_qp_files += 1
                ms_errors.append((paper_code, qid, marks, f"QP file missing on disk: {qp_rel}"))

    print("--- [PART A: QP-TO-MS MATCHING & ASSET INTEGRITY RESULTS] ---")
    matched_questions = total_questions - missing_ms_count
    match_rate = (matched_questions / total_questions * 100.0) if total_questions > 0 else 0.0

    print(f"Total Questions Evaluated       : {total_questions}")
    print(f"Matched Mark Schemes            : {matched_questions} / {total_questions} ({match_rate:.2f}%)")
    print(f"Questions Missing MS Reference  : {missing_ms_count}")
    print(f"Questions with Status 'Pending' : {pending_status_count}")
    print(f"Missing MS Image Files on Disk  : {missing_ms_files}")
    print(f"Missing QP Image Files on Disk  : {missing_qp_files}")

    if ms_errors:
        print("\n[!] MARK SCHEME MATCHING FAILURES DETECTED:")
        print(f"{'Paper Code':<20} | {'Question ID':<35} | {'Marks':<6} | {'Reason'}")
        print("-" * 90)
        for pcode, qid, marks, reason in ms_errors[:30]:
            print(f"{pcode:<20} | {qid:<35} | {marks:<6} | {reason}")
        if len(ms_errors) > 30:
            print(f"... and {len(ms_errors) - 30} more failure entries.")
    else:
        print("\n[SUCCESS] 100% of questions have valid, verified Mark Scheme assets on disk!")

    # ---------------------------------------------------------
    # PART B: Specification Mark Audits by Paper
    # ---------------------------------------------------------
    print("\n--- [PART B: SPECIFICATION MARK AUDIT BY PAPER] ---")
    papers_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for q in questions:
        pid = q.get("paperId") or "UNKNOWN_PAPER"
        papers_map[pid].append(q)

    total_papers = len(papers_map)
    spec_failures: List[str] = []
    unit_counts = defaultdict(int)

    for pid in sorted(papers_map.keys()):
        qlist = papers_map[pid]
        first_q = qlist[0]
        unit_str = first_q.get("unit") or ""
        unit_code = first_q.get("unitCode") or pid.split("_")[0].upper()
        unit_counts[unit_str or unit_code] += 1

        total_marks = sum(q.get("marks", 0) for q in qlist)
        mcq_count = sum(1 for q in qlist if q.get("questionType") == "mcq")
        sec_a_marks = sum(
            q.get("marks", 0)
            for q in qlist
            if q.get("section") == "A"
            or (q.get("questionType") == "mcq" and int(str(q.get("parentQuestion") or q.get("questionNumber") or 0)) <= 20)
        )

        is_practical = any(u in unit_str or u in unit_code for u in ["Unit 3", "Unit 6", "WCH13", "WCH16"])
        is_as_theory = any(u in unit_str or u in unit_code for u in ["Unit 1", "Unit 2", "WCH11", "WCH12"])
        is_a2_theory = any(u in unit_str or u in unit_code for u in ["Unit 4", "Unit 5", "WCH14", "WCH15"])

        if is_practical:
            # Practical Unit 3 & 6: Exactly 50 marks, 0 MCQs
            if total_marks != 50 or mcq_count != 0:
                spec_failures.append(
                    f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 50), MCQs = {mcq_count} (expected 0)"
                )
        elif is_as_theory:
            # AS Theory Unit 1 & 2: 20 marks Section A MCQ, 80 marks total
            if total_marks != 80 or sec_a_marks != 20:
                spec_failures.append(
                    f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 80), Sec A = {sec_a_marks} (expected 20)"
                )
        elif is_a2_theory:
            # A2 Theory Unit 4 & 5: 20 marks Section A MCQ, 90 marks total
            if total_marks != 90 or sec_a_marks != 20:
                spec_failures.append(
                    f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 90), Sec A = {sec_a_marks} (expected 20)"
                )

    print(f"Total Papers Evaluated Across All Units: {total_papers}")
    for u_name, count in sorted(unit_counts.items()):
        print(f"  • {u_name:<10}: {count} papers")

    if spec_failures:
        print(f"\n[!] SPECIFICATION MARK AUDIT WARNINGS ({len(spec_failures)} papers):")
        for f in spec_failures:
            print(f"  [X] {f}")
    else:
        print("\n[SUCCESS] All papers adhere 100% to Pearson specification mark distributions!")

    # Final summary check
    all_passed = (len(ms_errors) == 0 and len(spec_failures) == 0)
    print("\n" + "=" * 80)
    if all_passed:
        print("[VERIFICATION PASSED] Dataset meets 100% QP-to-MS match rate and specification integrity.")
    else:
        print(f"[VERIFICATION COMPLETED] {len(ms_errors)} MS errors, {len(spec_failures)} specification mark discrepancies.")
    print("=" * 80 + "\n")

    return all_passed

if __name__ == "__main__":
    d_path = sys.argv[1] if len(sys.argv) > 1 else "frontend/public/dataset.json"
    p_dir = sys.argv[2] if len(sys.argv) > 2 else "frontend/public"
    success = run_audit(dataset_path=d_path, public_dir=p_dir)
    sys.exit(0 if success else 1)
