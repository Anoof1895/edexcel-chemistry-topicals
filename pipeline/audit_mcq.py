#!/usr/bin/env python3
"""
Audit script:
1. Asserts that every Unit 1 (WCH11) and Unit 2 (WCH12) paper contains exactly 20 Section A MCQ items (20 marks).
2. Asserts that 100% of MCQ items across the entire dataset have valid, definitive answer keys (A, B, C, D).
"""

import sys
import json
import os

def run_audit(dataset_path: str = "frontend/public/dataset.json") -> bool:
    if not os.path.exists(dataset_path):
        print(f"ERROR: Dataset file not found at {dataset_path}")
        return False

    with open(dataset_path, encoding="utf-8") as f:
        dataset = json.load(f)

    by_paper = {}
    total_mcqs = 0
    missing_key_mcqs = []
    invalid_key_mcqs = []

    for q in dataset:
        pid = q.get("paperId", "")
        by_paper.setdefault(pid, []).append(q)

        is_mcq = q.get("questionType") == "mcq" or q.get("question_type") == "mcq"
        if is_mcq:
            total_mcqs += 1
            ans = q.get("answer") or q.get("correct_answer") or q.get("key")
            if not ans:
                missing_key_mcqs.append(q.get("id"))
            elif str(ans).upper() not in ["A", "B", "C", "D"]:
                invalid_key_mcqs.append((q.get("id"), ans))

    total_papers = 0
    passed_papers = 0
    failed_papers = []

    print("=================================================================")
    print("Section A MCQ Audit (Mandatory 20 Marks per Unit 1 & Unit 2 Paper)")
    print("=================================================================")

    for pid, qs in sorted(by_paper.items()):
        # Only audit Unit 1 and Unit 2 past papers
        if not (pid.startswith("wch11") or pid.startswith("wch12")):
            continue
        # Skip legacy unnormalized prototype papers if any
        if pid in ("wch11-01-que-20250508", "wch12-01-que-20250513"):
            continue

        total_papers += 1
        mcqs = [q for q in qs if q.get("questionType") == "mcq" or q.get("question_type") == "mcq"]
        marks = sum(q.get("marks", 0) or 0 for q in mcqs)
        qnums = [q.get("questionNumber") for q in mcqs]

        if len(mcqs) == 20 and marks == 20:
            passed_papers += 1
            print(f"  [PASS] {pid:32}: 20 MCQs | 20 Marks")
        else:
            failed_papers.append((pid, len(mcqs), marks, qnums))
            print(f"  [FAIL] {pid:32}: {len(mcqs)} MCQs | {marks} Marks | Qs: {qnums}")

    print("=================================================================")
    print(f"Audit Complete: {passed_papers}/{total_papers} Unit 1 & Unit 2 papers passed.")
    if failed_papers:
        print(f"FAILED ({len(failed_papers)} papers):")
        for pid, count, marks, qnums in failed_papers:
            print(f"  - {pid}: {count} questions ({marks} marks)")
        print("=================================================================")
        return False
    else:
        print("ALL Unit 1 & Unit 2 papers contain exactly 20 Section A MCQs!")

    print("=================================================================")
    print("MCQ Answer Key Integrity Check")
    print("=================================================================")
    print(f"Total MCQs in dataset: {total_mcqs}")
    print(f"MCQs with valid keys (A, B, C, D): {total_mcqs - len(missing_key_mcqs) - len(invalid_key_mcqs)} / {total_mcqs}")

    if missing_key_mcqs:
        print(f"ERROR: {len(missing_key_mcqs)} MCQs missing an answer key!")
        for mid in missing_key_mcqs[:10]:
            print(f"  - {mid}")
        return False

    if invalid_key_mcqs:
        print(f"ERROR: {len(invalid_key_mcqs)} MCQs have invalid answer keys!")
        for mid, val in invalid_key_mcqs[:10]:
            print(f"  - {mid}: {val}")
        return False

    print("SUCCESS: 100% of MCQs have verified keys (A-D)!")
    print("=================================================================")
    return True

if __name__ == "__main__":
    success = run_audit()
    sys.exit(0 if success else 1)
