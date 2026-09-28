"""
Populate MCQ Answers:
Scans all Mark Scheme PDFs across Section A and extracts the correct option (A, B, C, D)
for every Multiple Choice Question, storing 'answer' on each item in dataset.json.
"""

import os
import re
import json
import pymupdf
from pipeline.batch_scanner import scan_papers_directory

def extract_mcq_answers_for_paper(ms_path: str) -> dict:
    answers = {}
    try:
        doc = pymupdf.open(ms_path)
    except Exception as e:
        print(f"Error opening {ms_path}: {e}")
        return answers

    for p_idx in range(len(doc)):
        page = doc[p_idx]
        text = page.get_text()

        # Check for Section B boundary
        is_sec_b = bool(re.search(r'\bsection\s+b\b', text, re.I))

        tables = page.find_tables()
        for t in tables:
            for row in t.extract():
                txt = ' '.join(str(c) for c in row if c)
                # Match "The only correct answer is B" or "The correct answer is B" or "Accept B" or "B is the correct answer"
                m = re.search(r'(?:only\s+correct\s+answer\s+is|correct\s+answer\s+is|the\s+answer\s+is)\s+([A-D])\b', txt, re.I)
                if not m:
                    # Alternative pattern: row cell with single letter A, B, C, D in column 1/2
                    for cell in row[1:3]:
                        if cell and re.match(r'^\s*([A-D])\s*$', str(cell)):
                            m = re.match(r'^\s*([A-D])\s*$', str(cell))
                            break

                if m:
                    ans_letter = m.group(1).upper()
                    # Resolve question number: e.g. "1", "20", "14(a)", "14a", "14 (a)"
                    first_cells = ' '.join(str(c) for c in row[:2] if c)
                    qm = re.search(r'\b([1-9]|1[0-9]|20)\s*(?:\(([a-z])\))?\b', first_cells)
                    if not qm:
                        qm = re.search(r'\b([1-9]|1[0-9]|20)\s*(?:\(([a-z])\))?\b', txt)
                    if qm:
                        parent_num = qm.group(1)
                        sub_letter = qm.group(2)
                        key = f"{parent_num}{sub_letter}" if sub_letter else parent_num
                        answers[key] = ans_letter
                        # Also register bare parent_num if not subpart
                        if not sub_letter:
                            answers[parent_num] = ans_letter

        if is_sec_b and len(answers) >= 18:
            break

    return answers

def main():
    dataset_paths = [
        "frontend/public/dataset.json",
        "dataset.json"
    ]

    target_path = "frontend/public/dataset.json"
    if not os.path.exists(target_path):
        print(f"Target dataset {target_path} not found!")
        return

    with open(target_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} total questions from {target_path}.")
    mcq_items = [q for q in data if q.get("question_type") == "mcq" or q.get("questionType") == "mcq"]
    print(f"Total MCQ questions in dataset: {len(mcq_items)}")

    # Group papers
    pairs = scan_papers_directory("papers")
    paper_map = {p["paper_id"]: p for p in pairs}

    # Extract answers per paper
    all_paper_answers = {}
    matched_count = 0

    for paper_id, pair in paper_map.items():
        ms_path = pair.get("rms_path")
        if not ms_path or not os.path.exists(ms_path):
            continue
        unit_code = pair.get("unit_code", "")
        if unit_code in ["WCH13", "WCH16"]:
            continue

        paper_answers = extract_mcq_answers_for_paper(ms_path)
        all_paper_answers[paper_id] = paper_answers

    # Populate dataset
    for q in data:
        if q.get("question_type") != "mcq" and q.get("questionType") != "mcq":
            continue

        pid = q.get("paperId")
        qnum = str(q.get("questionNumber") or "").strip()
        pq = str(q.get("parentQuestion") or "").strip()
        sp = str(q.get("subPart") or "").strip()

        # Try paper_answers
        paper_ans = all_paper_answers.get(pid, {})
        ans = (
            paper_ans.get(qnum)
            or paper_ans.get(f"{pq}{sp}")
            or paper_ans.get(pq)
        )

        if ans:
            q["answer"] = ans
            q["correct_answer"] = ans
            q["correctAnswer"] = ans
            matched_count += 1

    print(f"Successfully populated answers for {matched_count} / {len(mcq_items)} MCQs ({matched_count/len(mcq_items)*100:.1f}%)!")

    for path in dataset_paths:
        if os.path.exists(path):
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"Updated {path} with MCQ answers.")

if __name__ == "__main__":
    main()
