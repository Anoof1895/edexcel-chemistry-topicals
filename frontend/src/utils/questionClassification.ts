import { QuestionItem, Subject } from '../types';
import { isSubtopicValidForQuestionUnit } from '../constants/taxonomy';

/**
 * Single source of truth for detecting a question's subject ('chemistry' | 'physics' | 'mathematics')
 * from its unitCode, paperId, id, or questionImagePath.
 */
export function getQuestionSubject(q?: QuestionItem | null): Subject {
  if (!q) return 'chemistry';
  const unitCode = (q.unitCode || '').toUpperCase();
  const paperId = (q.paperId || (q as any).paper_id || '').toLowerCase();
  const imgPath = (q.questionImagePath || (q as any).image || '').toLowerCase();
  const qId = (q.id || '').toLowerCase();

  if (
    unitCode.startsWith('WMA') ||
    unitCode.startsWith('WME') ||
    unitCode.startsWith('WST') ||
    paperId.startsWith('wma') ||
    paperId.startsWith('wme') ||
    paperId.startsWith('wst') ||
    qId.startsWith('wma') ||
    qId.startsWith('wme') ||
    qId.startsWith('wst') ||
    imgPath.includes('crops_math')
  ) {
    return 'mathematics';
  }

  if (
    unitCode.startsWith('WPH') ||
    paperId.startsWith('wph') ||
    qId.startsWith('wph') ||
    imgPath.includes('crops_physics')
  ) {
    return 'physics';
  }

  return 'chemistry';
}

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
  // Rule 0: Mathematics papers strictly have 0 MCQs (all structured whole questions)
  if (getQuestionSubject(q) === 'mathematics') {
    return false;
  }

  const unitCode = (q.unitCode || '').toUpperCase();
  // Rule 1: Practical papers have 0 MCQs
  const unit = (q.unit || '').toLowerCase();
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


/**
 * Checks whether a question matches a selected unit filter string.
 * Supports numeric unit digits ('1'-'6'), unit prefixes ('Unit 1'),
 * paper codes ('WCH11', 'WPH11', 'WMA11', 'WME01', 'WST01'),
 * and short Math paper labels ('P1', 'P2', 'P3', 'P4', 'M1', 'S1').
 */
export function doesQuestionMatchUnit(q: QuestionItem, filterUnit: string): boolean {
  if (!filterUnit || !q) return false;
  const fu = filterUnit.trim().toLowerCase();
  const qu = (q.unit || '').trim().toLowerCase();
  const qc = (q.unitCode || '').trim().toLowerCase();

  // Exact match with unit or unitCode
  if (fu === qu || fu === qc) return true;

  // Code matches (e.g. 'wch11', 'wma11')
  if (qc && (qc === fu || qc.replace(/\s+/g, '') === fu.replace(/\s+/g, ''))) return true;

  // Mathematics short code mapping (e.g. 'P1' <-> 'WMA11')
  const MATH_UNIT_MAP: Record<string, string> = {
    p1: 'wma11',
    p2: 'wma12',
    p3: 'wma13',
    p4: 'wma14',
    m1: 'wme01',
    s1: 'wst01',
  };
  if (MATH_UNIT_MAP[fu] && qc === MATH_UNIT_MAP[fu]) return true;

  // Parenthetical short code in q.unit (e.g. "Unit 1: Pure Mathematics 1 (P1)" matching "p1")
  const mathCodeMatch = qu.match(/\(([a-z0-9]+)\)/);
  if (mathCodeMatch && mathCodeMatch[1].toLowerCase() === fu) {
    return true;
  }

  // Prefix matching before colon, e.g. "unit 1"
  const fuPrefix = fu.split(':')[0].trim();
  const quPrefix = qu.split(':')[0].trim();
  if (fuPrefix && quPrefix && fuPrefix === quPrefix) {
    return true;
  }

  // Pure digit match (e.g. filter is "1" or "Unit 1" and question is "1" or "Unit 1: ...")
  const fuDigits = fu.match(/\b([1-6])\b/)?.[1];
  const quDigits = qu.match(/\b([1-6])\b/)?.[1];
  if (fuDigits && quDigits && fuDigits === quDigits) {
    return true;
  }

  return false;
}

/**
 * Resolves the primary canonical topic for a question.
 */
export function getQuestionMainTopic(q?: QuestionItem | null): string {
  if (!q) return '';
  return q.mainTopic || q.topic || '';
}

/**
 * Resolves the primary canonical subtopic for a question.
 */
export function getQuestionMainSubtopic(q?: QuestionItem | null): string {
  if (!q) return '';
  return q.mainSubtopic || q.subtopic || (q.subtopics && q.subtopics[0]) || '';
}

/**
 * Resolves secondary/related subtopics for a question (excluding the main subtopic),
 * strictly filtering out any residual cross-unit secondary tags so a Unit X question
 * can never match a Unit Y subtopic filter.
 */
export function getQuestionRelatedSubtopics(q?: QuestionItem | null): string[] {
  if (!q) return [];
  const main = getQuestionMainSubtopic(q);
  const rawList = Array.isArray(q.relatedSubtopics)
    ? q.relatedSubtopics
    : Array.isArray(q.subtopics) && q.subtopics.length > 1
    ? q.subtopics.filter((s) => s !== main)
    : [];

  const valid: string[] = [];
  for (const s of rawList) {
    if (!s || s === main || valid.includes(s)) continue;
    if (isSubtopicValidForQuestionUnit(s, q.unit, q.unitCode)) {
      valid.push(s);
    }
  }
  return valid.slice(0, 1);
}

/**
 * Resolves all valid unit-scoped subtopics for a question (`[mainSubtopic, ...relatedSubtopics]`),
 * or only `[mainSubtopic]` when `includeSecondary` is false.
 */
export function getQuestionValidSubtopics(
  q?: QuestionItem | null,
  includeSecondary: boolean = true
): string[] {
  if (!q) return [];
  const main = getQuestionMainSubtopic(q);
  const validMain =
    main && isSubtopicValidForQuestionUnit(main, q.unit, q.unitCode) ? [main] : main ? [main] : [];
  if (!includeSecondary) {
    return validMain;
  }
  const rels = getQuestionRelatedSubtopics(q);
  return Array.from(new Set([...validMain, ...rels]));
}

/**
 * Returns true if any of the selectedSubtopics is the PRIMARY subtopic (`mainSubtopic`) of question `q`.
 */
export function isPrimarySubtopicMatch(
  q?: QuestionItem | null,
  selectedSubtopics?: string[]
): boolean {
  if (!q || !selectedSubtopics || selectedSubtopics.length === 0) return true;
  const main = getQuestionMainSubtopic(q);
  return Boolean(main && selectedSubtopics.includes(main));
}

/**
 * Resolves all parent topics tested by this question, with the main topic first.
 */
export function getQuestionTopics(q?: QuestionItem | null): string[] {
  if (!q) return [];
  if (Array.isArray(q.topics) && q.topics.length > 0) {
    return q.topics;
  }
  const mainTop = getQuestionMainTopic(q);
  return mainTop ? [mainTop] : [];
}
