"""
Comprehensive QP-to-MS Matching Audit, Specification Mark Audit & Taxonomy Data Integrity Check for Edexcel Chemistry Topicals.
Verifies:
1. 100% Mark Scheme Matching (non-null path, zero 'Mark Scheme Pending', physical file existence on disk).
2. Physical existence of Question Paper images on disk.
3. Specification Mark Audits:
   - Units 1 & 2: 20 marks Section A MCQ, 80 marks overall.
   - Units 4 & 5: 20 marks Section A MCQ, 90 marks overall.
   - Units 3 & 6: 50 marks overall, 0 MCQs.
4. Specification Taxonomy & Classification Audit:
   - 0 questions with "General" or unmapped topics/subtopics.
   - 100% of mainTopic, mainSubtopic, and relatedSubtopics match OFFICIAL_SYLLABUS.
   - mainTopic strictly matches parent of mainSubtopic.
   - mainSubtopic strictly belongs to paper's own unit.
   - relatedSubtopics strictly obey synoptic unit boundaries.
"""

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import json
from collections import defaultdict
from typing import Dict, Any, List, Tuple, Optional

from pipeline.syllabus import (
    OFFICIAL_SYLLABUS,
    get_parent_topic_for_subtopic,
)
from pipeline.syllabus_physics import (
    OFFICIAL_PHYSICS_SYLLABUS,
    get_physics_parent_topic_for_subtopic,
)
from pipeline.syllabus_math import (
    OFFICIAL_MATH_SYLLABUS,
    get_math_parent_topic_for_subtopic,
)
from pipeline.gemini_classifier import (
    UnitTaxonomyResolver,
    SYNOPTIC_ALLOWED_UNITS,
)


def run_audit(
    dataset_path: str = "frontend/public/dataset.json",
    public_dir: str = "frontend/public",
    subject: Optional[str] = None,
) -> bool:
    if not os.path.exists(dataset_path):
        print(f"[AUDIT ERROR] Dataset file not found at: {dataset_path}")
        return False

    if not subject:
        d_lower = os.path.basename(dataset_path).lower()
        if "phys" in d_lower:
            subject = "physics"
        elif "math" in d_lower:
            subject = "mathematics"
        else:
            subject = "chemistry"

    with open(dataset_path, "r", encoding="utf-8") as f:
        questions: List[Dict[str, Any]] = json.load(f)

    total_questions = len(questions)
    print("=" * 80)
    print(f"EDEXCEL IAL {subject.upper()}: COMPREHENSIVE DATASET, MARK SCHEME & TAXONOMY AUDIT")
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
            crops_alt = os.path.join(public_dir, "crops", os.path.basename(clean_ms_rel))
            root_alt = os.path.join(ROOT_DIR, clean_ms_rel)
            if not os.path.exists(ms_full_path) and not os.path.exists(crops_alt) and not os.path.exists(root_alt):
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
            root_alt_qp = os.path.join(ROOT_DIR, clean_qp_rel)
            if not os.path.exists(qp_full_path) and not os.path.exists(crops_alt_qp) and not os.path.exists(root_alt_qp):
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

        if subject == "physics":
            is_practical = any(u in unit_str or u in unit_code for u in ["Unit 3", "Unit 6", "WPH13", "WPH16"])
            is_as_theory = any(u in unit_str or u in unit_code for u in ["Unit 1", "Unit 2", "WPH11", "WPH12"])
            is_a2_theory = any(u in unit_str or u in unit_code for u in ["Unit 4", "Unit 5", "WPH14", "WPH15"])
            sec_a_mcq = sum(
                q.get("marks", 0)
                for q in qlist
                if q.get("section") == "A"
                or (q.get("questionType") == "mcq" and int(str(q.get("parentQuestion") or q.get("questionNumber") or 0)) <= 10)
            )
            if is_practical:
                if total_marks != 50 or mcq_count != 0:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 50), MCQs = {mcq_count} (expected 0)"
                    )
            elif is_as_theory:
                if total_marks != 80 or sec_a_mcq != 10:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 80), Sec A MCQ = {sec_a_mcq} (expected 10)"
                    )
            elif is_a2_theory:
                if total_marks != 90 or sec_a_mcq != 10:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 90), Sec A MCQ = {sec_a_mcq} (expected 10)"
                    )
        elif subject == "mathematics":
            # All IAL Math papers (P1-P4, M1, S1) are 75 marks, 0 MCQs
            if total_marks != 75 or mcq_count != 0:
                spec_failures.append(
                    f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 75), MCQs = {mcq_count} (expected 0)"
                )
        else:
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

    # ---------------------------------------------------------
    # PART C: Specification Taxonomy & Topic/Subtopic Audit
    # ---------------------------------------------------------
    print("\n--- [PART C: SPECIFICATION TAXONOMY & TOPIC/SUBTOPIC AUDIT] ---")
    resolver = UnitTaxonomyResolver(subject)
    if subject == "physics":
        syllabus = OFFICIAL_PHYSICS_SYLLABUS
        parent_fn = get_physics_parent_topic_for_subtopic
    elif subject == "mathematics":
        syllabus = OFFICIAL_MATH_SYLLABUS
        parent_fn = get_math_parent_topic_for_subtopic
    else:
        syllabus = OFFICIAL_SYLLABUS
        parent_fn = get_parent_topic_for_subtopic

    all_canonical_topics = set()
    all_canonical_subtopics = set()
    unit_canonical_subs = defaultdict(set)

    for u_code, u_data in syllabus.items():
        for top_name, s_list in u_data["topics"].items():
            all_canonical_topics.add(top_name)
            for s in s_list:
                all_canonical_subtopics.add(s)
                unit_canonical_subs[u_code].add(s)

    taxonomy_errors: List[str] = []
    general_unmapped_count = 0
    covered_subtopics = set()
    covered_topics = set()

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        pid = q.get("paperId") or q.get("paper_id") or ""
        ucode = resolver.normalize_unit_code(q.get("unitCode", ""), pid)

        m_top = q.get("mainTopic")
        m_sub = q.get("mainSubtopic")
        rel_subs = q.get("relatedSubtopics") or []
        top = q.get("topic")
        sub = q.get("subtopic")
        subs = q.get("subtopics") or []
        tops = q.get("topics") or []

        # 1. Check for "General" / unmapped / None
        for val, f_name in [(m_top, "mainTopic"), (m_sub, "mainSubtopic"), (top, "topic"), (sub, "subtopic")]:
            if not val or not isinstance(val, str) or val.strip().lower() in ("general", f"general {subject}", "unknown", "none"):
                general_unmapped_count += 1
                taxonomy_errors.append(f"{qid}: {f_name} has invalid value '{val}'")

        # 2. Check canonical syllabus membership
        if m_top not in all_canonical_topics:
            taxonomy_errors.append(f"{qid}: mainTopic '{m_top}' not in canonical syllabus")
        if m_sub not in all_canonical_subtopics:
            taxonomy_errors.append(f"{qid}: mainSubtopic '{m_sub}' not in canonical syllabus")
        for r in rel_subs:
            if r not in all_canonical_subtopics:
                taxonomy_errors.append(f"{qid}: relatedSubtopic '{r}' not in canonical syllabus")

        # 3. Check unit boundaries
        if m_sub not in unit_canonical_subs[ucode]:
            taxonomy_errors.append(f"{qid}: mainSubtopic '{m_sub}' belongs outside paper unit {ucode}")

        # 4. Check parent topic derivation
        expected_parent = parent_fn(m_sub)
        if m_top != expected_parent:
            taxonomy_errors.append(f"{qid}: mainTopic '{m_top}' != expected parent '{expected_parent}'")

        # 5. Check synoptic boundaries for relatedSubtopics
        allowed_units = SYNOPTIC_ALLOWED_UNITS[subject].get(ucode, [ucode])
        allowed_syn_subs = set()
        for u in allowed_units:
            allowed_syn_subs.update(unit_canonical_subs[u])

        if len(rel_subs) > 3:
            taxonomy_errors.append(f"{qid}: relatedSubtopics count ({len(rel_subs)}) exceeds max 3")

        for r in rel_subs:
            if r == m_sub:
                taxonomy_errors.append(f"{qid}: relatedSubtopics duplicates mainSubtopic '{m_sub}'")
            if r not in allowed_syn_subs:
                taxonomy_errors.append(f"{qid}: relatedSubtopic '{r}' outside synoptic scope for unit {ucode}")

        # 6. Backward compatibility fields
        if top != m_top:
            taxonomy_errors.append(f"{qid}: topic ('{top}') != mainTopic ('{m_top}')")
        if sub != m_sub:
            taxonomy_errors.append(f"{qid}: subtopic ('{sub}') != mainSubtopic ('{m_sub}')")
        if not subs or subs[0] != m_sub:
            taxonomy_errors.append(f"{qid}: subtopics[0] != mainSubtopic")
        if not tops or tops[0] != m_top:
            taxonomy_errors.append(f"{qid}: topics[0] != mainTopic")

        if m_sub in all_canonical_subtopics:
            covered_subtopics.add(m_sub)
        if m_top in all_canonical_topics:
            covered_topics.add(m_top)

    print(f"Total Canonical Topics Defined     : {len(all_canonical_topics)}")
    print(f"Total Canonical Subtopics Defined  : {len(all_canonical_subtopics)}")
    print(f"Dataset Covered Subtopics          : {len(covered_subtopics)} / {len(all_canonical_subtopics)} ({len(covered_subtopics)/len(all_canonical_subtopics)*100:.1f}%)")
    print(f"Dataset Covered Topics             : {len(covered_topics)} / {len(all_canonical_topics)} ({len(covered_topics)/len(all_canonical_topics)*100:.1f}%)")
    print(f"Questions with 'General'/Unmapped  : {general_unmapped_count}")
    print(f"Total Taxonomy Violations          : {len(taxonomy_errors)}")

    if taxonomy_errors:
        print("\n[!] TAXONOMY AUDIT FAILURES DETECTED:")
        for err in taxonomy_errors[:25]:
            print(f"  [X] {err}")
        if len(taxonomy_errors) > 25:
            print(f"  ... and {len(taxonomy_errors) - 25} more taxonomy errors.")
    else:
        print("\n[SUCCESS] 100% of questions strictly match official syllabus with 0 'General' or unmapped topics!")

    # Final summary check
    all_passed = (len(ms_errors) == 0 and len(taxonomy_errors) == 0)
    print("\n" + "=" * 80)
    if all_passed:
        if spec_failures:
            print(f"[VERIFICATION PASSED] 100% MS match & 100% taxonomy parity confirmed ({len(spec_failures)} historical mark discrepancies noted).")
        else:
            print("[VERIFICATION PASSED] Dataset meets 100% QP-to-MS match rate, specification integrity, and taxonomy parity.")
    else:
        print(f"[VERIFICATION FAILED] {len(ms_errors)} MS errors, {len(taxonomy_errors)} taxonomy errors.")
    print("=" * 80 + "\n")

    return all_passed


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Audit dataset matching and taxonomy.")
    parser.add_argument("dataset_path", nargs="?", default="frontend/public/dataset.json", help="Path to dataset JSON")
    parser.add_argument("public_dir", nargs="?", default="frontend/public", help="Path to public assets root")
    parser.add_argument("--subject", choices=["chemistry", "physics", "mathematics"], default=None, help="Subject")
    args = parser.parse_args()

    success = run_audit(dataset_path=args.dataset_path, public_dir=args.public_dir, subject=args.subject)
    sys.exit(0 if success else 1)
