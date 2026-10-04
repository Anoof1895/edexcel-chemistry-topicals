import { QuestionItem } from '../types';

/**
 * Determines whether a question is strictly a Multiple Choice Question (MCQ)
 * or a Theory question.
 *
 * Rules:
 * 1. Practical papers (Unit 3 & Unit 6 / WCH13 / WCH16) never have MCQs; all are structured theory/practical.
 * 2. Any question with sub-parts containing roman numerals or nested sub-parts (e.g. (b)(i), (c)(ii), (iv))
 *    is strictly 'theory', even if worth only 1 mark.
 * 3. Any question in Section B (e.g. Q21+, or Q17+ with sub-parts, or Q15+ in Unit 1) is strictly 'theory',
 *    even if worth only 1 mark.
 * 4. A question is strictly 'mcq' IF AND ONLY IF:
 *    - Its question number belongs to Section A (parent <= 20 with no nested sub-part letters/roman numerals),
 *      OR its ID/metadata is explicitly tagged question_type === 'mcq' (and not in Section B).
 * 5. Under NO circumstances should questions be classified as MCQ based on marks == 1.
 */
export function isMCQ(q: QuestionItem): boolean {
  // Rule 1: Practical papers have 0 MCQs
  const unit = (q.unit || '').toLowerCase();
  const unitCode = (q.unitCode || '').toUpperCase();
  if (
    unit.includes('unit 3') || 
    unit.includes('unit 6') || 
    unitCode === 'WCH13' || 
    unitCode === 'WCH16' ||
    unitCode === 'WPH13' || 
    unitCode === 'WPH16'
  ) {
    return false;
  }

  // Rule 2: Explicit section or type from pipeline dataset takes absolute priority
  if (q.section === 'A' || q.question_type === 'mcq' || q.questionType === 'mcq') {
    return true;
  }
  if (q.section === 'B' || q.section === 'C' || q.question_type === 'theory' || q.questionType === 'theory') {
    return false;
  }

  const parentNum = parseInt(q.parentQuestion || q.questionNumber || '0', 10);

  // Rule 3: Any question Q21+ is strictly Section B/C theory
  if (parentNum > 20) {
    return false;
  }

  // Rule 4: Sub-parts with roman numerals or deep parts outside Section A are theory
  const qNum = (q.questionNumber || q.id || '').toLowerCase();
  const sub = (q.subPart || '').toLowerCase();
  const hasSubpartNotation = 
    /\([a-z]\)\([ivx]+\)/.test(qNum) ||
    /\([ivx]+\)/.test(qNum) ||
    /\([ivx]+\)/.test(sub);
  if (hasSubpartNotation) {
    return false;
  }

  // Rule 5: Section A fallback: question number prefix <= 20
  if (parentNum >= 1 && parentNum <= 20) {
    return true;
  }

  return false;
}

export function getQuestionType(q: QuestionItem): 'mcq' | 'theory' {
  return isMCQ(q) ? 'mcq' : 'theory';
}
