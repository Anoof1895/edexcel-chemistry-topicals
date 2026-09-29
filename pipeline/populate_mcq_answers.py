"""
Populate & Audit MCQ Answers:
Scans all Mark Scheme PDFs across Section A and extracts the definitive correct option (A, B, C, D)
for every Multiple Choice Question using strict Edexcel mark scheme phrasing.
Updates both dataset.json and frontend/public/dataset.json.
"""

import os
import re
import json
import pymupdf
from pipeline.batch_scanner import scan_papers_directory
from pipeline.ms_matcher import canonical_id

# Strict Edexcel MCQ Answer pattern matching:
# Strictly captures the definitive Edexcel MCQ phrase:
#   - "The only correct answer is [A-D]"
#   - "The correct answer is [A-D]"
#   - "Answer: [A-D]"
#   - "Correct Answer: [A-D]"
# Ensures it NEVER captures subsequent rationale lines like "A is incorrect...", "C is incorrect...", etc.
EDEXCEL_MCQ_REGEX = re.compile(
    r"(?:The only correct answer is\s*|The correct answer is\s*|Answer\s*[:\s]\s*|Correct\s+Answer\s*[:\s]\s*)([A-D])\b",
    re.I
)

def extract_mcq_answers_for_paper(ms_path: str) -> dict:
    """
    Extracts MCQ answers from a Mark Scheme PDF for Section A.
    Returns a mapping of question keys (e.g. '1', '1a', '1(a)', '10bi') to answer letter ('A', 'B', 'C', 'D').
    """
    answers = {}
    try:
        doc = pymupdf.open(ms_path)
    except Exception as e:
        print(f"Error opening {ms_path}: {e}")
        return answers

    last_parent = None

    for p_idx in range(len(doc)):
        page = doc[p_idx]
        text = page.get_text()

        # Check for Section B boundary
        is_sec_b = bool(re.search(r'\bsection\s+b\b', text, re.I))

        tables = page.find_tables()
        for t in tables:
            for row in t.extract():
                row_txt = ' '.join(str(c) for c in row if c)

                # Strict regex match for definitive Edexcel MCQ phrase
                m = EDEXCEL_MCQ_REGEX.search(row_txt)
                if not m:
                    # Fallback: standalone single-letter cell in column 1/2 if not header row
                    if not any('question' in str(c).lower() or 'answer' in str(c).lower() for c in row if c):
                        for cell in row[1:3]:
                            if cell and re.match(r'^\s*([A-D])\s*$', str(cell)):
                                m = re.match(r'^\s*([A-D])\s*$', str(cell))
                                break

                if m:
                    ans_letter = m.group(1).upper()
                    first_cells = ' '.join(str(c) for c in row[:2] if c)

                    # 1. Try first_cells for question number e.g. 10(b)(i), 1(a), 12a, 14, 20
                    qm = re.search(r'\b(20|1\d|[1-9])\s*(?:\(?([a-z])\)?)?\s*(?:\(?([ivx]+)\)?)?\b', first_cells, re.I)
                    sub_m = re.search(r'^\s*\(?([a-z])\)?\s*$', first_cells.strip(), re.I)

                    if qm and qm.group(1):
                        p_num = qm.group(1)
                        s_let = qm.group(2) or ''
                        roman = qm.group(3) or ''
                        last_parent = p_num
                    elif sub_m and last_parent:
                        p_num = last_parent
                        s_let = sub_m.group(1)
                        roman = ''
                    else:
                        # Fallback to row prefix (excluding the last cell which has marks like (1))
                        prefix_txt = ' '.join(str(c) for c in row[:-1] if c)
                        qm = re.search(r'\b(20|1\d|[1-9])\s*(?:\(?([a-z])\)?)?\s*(?:\(?([ivx]+)\)?)?\b', prefix_txt, re.I)
                        if qm and qm.group(1):
                            p_num = qm.group(1)
                            s_let = qm.group(2) or ''
                            roman = qm.group(3) or ''
                            last_parent = p_num
                        else:
                            p_num = None

                    if p_num:
                        full_key = f"{p_num}{s_let}{roman}".lower()
                        c_id = canonical_id(full_key)
                        answers[c_id] = ans_letter
                        answers[full_key] = ans_letter

                        if s_let:
                            answers[f"{p_num}({s_let.lower()})"] = ans_letter
                            answers[f"{p_num}{s_let.lower()}"] = ans_letter
                        if roman:
                            answers[f"{p_num}({s_let.lower()})({roman.lower()})"] = ans_letter
                            answers[f"{p_num}({roman.lower()})"] = ans_letter
                        if not s_let and not roman:
                            answers[p_num] = ans_letter

        # Section A MCQs are typically 20 questions
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

    for paper_id, pair in paper_map.items():
        ms_path = pair.get("rms_path")
        if not ms_path or not os.path.exists(ms_path):
            continue
        unit_code = pair.get("unit_code", "")
        if unit_code in ["WCH13", "WCH16"]:
            continue

        paper_answers = extract_mcq_answers_for_paper(ms_path)
        all_paper_answers[paper_id] = paper_answers

    matched_count = 0
    corrections = []
    unmatched = []

    # Populate dataset
    for q in data:
        if q.get("question_type") != "mcq" and q.get("questionType") != "mcq":
            continue

        pid = q.get("paperId")
        qnum = str(q.get("questionNumber") or "").strip()
        pq = str(q.get("parentQuestion") or "").strip()
        sp = str(q.get("subPart") or "").strip()

        c_qnum = canonical_id(qnum)
        c_pq_sp = canonical_id(f"{pq}{sp}")

        paper_ans = all_paper_answers.get(pid, {})
        new_ans = (
            paper_ans.get(c_qnum)
            or paper_ans.get(c_pq_sp)
            or paper_ans.get(qnum)
            or paper_ans.get(f"{pq}{sp}")
        )
        if not new_ans and not sp:
            new_ans = paper_ans.get(pq)

        # Handling for question numbering anomaly in wch15_2024_june Q10
        if not new_ans and pid == "wch15_2024_june":
            if "i" in qnum.lower() and "ii" not in qnum.lower():
                new_ans = paper_ans.get("10bi")
            elif "ii" in qnum.lower():
                new_ans = paper_ans.get("10bii")

        current_ans = q.get("answer") or q.get("correct_answer") or q.get("key")

        if new_ans:
            matched_count += 1
            if current_ans != new_ans:
                corrections.append({
                    "id": q.get("id"),
                    "paperId": pid,
                    "questionNumber": qnum,
                    "old_answer": current_ans,
                    "new_answer": new_ans
                })
            q["answer"] = new_ans
            q["correct_answer"] = new_ans
            q["correctAnswer"] = new_ans
        else:
            unmatched.append({
                "id": q.get("id"),
                "paperId": pid,
                "questionNumber": qnum
            })

    print(f"Matched MCQs: {matched_count} / {len(mcq_items)} ({matched_count/len(mcq_items)*100:.2f}%)")
    print(f"Total keys corrected against official mark schemes: {len(corrections)}")

    if unmatched:
        print(f"Warning: {len(unmatched)} unmatched MCQs remaining:")
        for u in unmatched:
            print(" ", u)

    # Print sample of corrections including the reported Q1(a) bug
    print("\nSample corrected keys:")
    q1_sample = [c for c in corrections if "wch11_2024_january_q1_a" in c["id"]]
    for c in q1_sample:
        print(f"  [Verified Target] {c['id']} ({c['questionNumber']}): '{c['old_answer']}' -> '{c['new_answer']}'")

    for c in corrections[:15]:
        if "wch11_2024_january_q1_a" not in c["id"]:
            print(f"  {c['id']} ({c['questionNumber']}): '{c['old_answer']}' -> '{c['new_answer']}'")

    # Save to both dataset files
    for path in dataset_paths:
        if os.path.exists(path):
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"Successfully updated {path} with corrected MCQ answers.")

if __name__ == "__main__":
    main()
