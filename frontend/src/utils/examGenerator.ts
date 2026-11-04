import { QuestionItem, Subject } from '../types';
import { getQuestionType } from './questionClassification';

export type SmartGenerateMode = 'balanced' | 'review_first' | 'unattempted_only';
export type ExamStructure = 'authentic' | 'theory_only' | 'mcq_sprint';

export interface ExamGeneratorOptions {
  targetMarks: number;
  questionCount?: number;
  mode?: SmartGenerateMode;
  structure?: ExamStructure;
  subject?: Subject;
  selectedUnits?: string[];
  selectedTopics?: string[];
  selectedSubtopics?: string[];
  isMcqOnly?: boolean;
  questionStatuses?: Record<string, string>;
  bookmarks?: Set<string> | string[];
}

export interface ExamGeneratorResult {
  selected: QuestionItem[];
  actualMarks: number;
  relaxedConstraints: string[];
}

/**
 * Unbiased O(n) Fisher-Yates shuffle.
 */
export function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Detects unit category from selected units filter to enable intelligent preset auto-switching.
 */
export function detectUnitCategory(selectedUnits: string[]): 'unit3_6' | 'ia2' | 'as' | 'mixed_or_all' {
  if (!selectedUnits || selectedUnits.length === 0) return 'mixed_or_all';

  const unitNumbers = new Set<number>();
  for (const u of selectedUnits) {
    const match = u.match(/unit\s*([1-6])/i);
    if (match) {
      unitNumbers.add(parseInt(match[1], 10));
    } else {
      const codeMatch = u.match(/w[a-z]{2}1([1-6])/i);
      if (codeMatch) {
        unitNumbers.add(parseInt(codeMatch[1], 10));
      } else if (/^[1-6]$/.test(u.trim())) {
        unitNumbers.add(parseInt(u.trim(), 10));
      }
    }
  }

  if (unitNumbers.size === 0) return 'mixed_or_all';

  const nums = Array.from(unitNumbers);
  const allUnit3or6 = nums.every((n) => n === 3 || n === 6);
  if (allUnit3or6) return 'unit3_6';

  const allIA2 = nums.every((n) => n === 4 || n === 5);
  if (allIA2) return 'ia2';

  const allAS = nums.every((n) => n === 1 || n === 2);
  if (allAS) return 'as';

  return 'mixed_or_all';
}

/**
 * 1D Subset-Sum Dynamic Programming solver over mark values (target <= 200 marks).
 * Pre-filters eligible questions, randomizes order with Fisher-Yates shuffle,
 * prioritizes lower paper usage, and backtracks DP table in O(n * target) time (< 2ms).
 */
export function findExactSubset(
  candidates: QuestionItem[],
  target: number,
  paperUsage: Map<string, number>,
  _maxTimeMs: number = 30
): QuestionItem[] | null {
  if (target === 0) return [];
  if (!candidates || candidates.length === 0 || target < 0) return null;

  const maxTarget = Math.min(200, Math.round(target));
  if (maxTarget <= 0) return null;

  const shuffled = fisherYatesShuffle(
    candidates.filter((q) => {
      const m = Math.round(q.marks || 0);
      return m > 0 && m <= maxTarget;
    })
  );
  if (shuffled.length === 0) return null;

  // Prefer lower paper usage while preserving randomized order within usage tiers
  shuffled.sort((a, b) => {
    const aUse = paperUsage.get(a.paperId || a.id) || 0;
    const bUse = paperUsage.get(b.paperId || b.id) || 0;
    return aUse - bUse;
  });

  // 1D DP table: dpChoice[s] = index in `shuffled` used to first reach sum `s` (-2 for base 0, -1 for unreachable)
  const dpChoice = new Int32Array(maxTarget + 1).fill(-1);
  const dpPrevSum = new Int32Array(maxTarget + 1).fill(-1);
  dpChoice[0] = -2;
  dpPrevSum[0] = 0;

  for (let i = 0; i < shuffled.length; i++) {
    const m = Math.round(shuffled[i].marks || 0);
    if (m <= 0 || m > maxTarget) continue;

    for (let s = maxTarget; s >= m; s--) {
      if (dpChoice[s] === -1 && dpChoice[s - m] !== -1) {
        dpChoice[s] = i;
        dpPrevSum[s] = s - m;
      }
    }

    if (dpChoice[maxTarget] !== -1) {
      break;
    }
  }

  if (dpChoice[maxTarget] === -1) {
    return null;
  }

  const result: QuestionItem[] = [];
  let cur = maxTarget;
  while (cur > 0 && dpChoice[cur] >= 0) {
    const idx = dpChoice[cur];
    result.push(shuffled[idx]);
    cur = dpPrevSum[cur];
  }

  return result.reverse();
}

/**
 * Finds the closest subset to target marks using 1D Subset-Sum Dynamic Programming,
 * prioritizing an exact match when available.
 */
export function findClosestSubset(
  candidates: QuestionItem[],
  target: number,
  paperUsage: Map<string, number>
): { subset: QuestionItem[]; marks: number } {
  if (!candidates || candidates.length === 0 || target <= 0) {
    return { subset: [], marks: 0 };
  }

  const exact = findExactSubset(candidates, target, paperUsage);
  if (exact) {
    const marks = exact.reduce((sum, q) => sum + (q.marks || 0), 0);
    return { subset: exact, marks };
  }

  const viable = fisherYatesShuffle(candidates.filter((q) => (q.marks || 0) > 0));
  if (viable.length === 0) {
    return { subset: [], marks: 0 };
  }

  viable.sort((a, b) => {
    const aUse = paperUsage.get(a.paperId || a.id) || 0;
    const bUse = paperUsage.get(b.paperId || b.id) || 0;
    return aUse - bUse;
  });

  const totalAvailable = viable.reduce((sum, q) => sum + Math.round(q.marks || 0), 0);
  if (totalAvailable <= target) {
    return { subset: viable, marks: totalAvailable };
  }

  const maxCap = Math.min(220, Math.round(target) + 12);
  const dpChoice = new Int32Array(maxCap + 1).fill(-1);
  const dpPrevSum = new Int32Array(maxCap + 1).fill(-1);
  dpChoice[0] = -2;
  dpPrevSum[0] = 0;

  for (let i = 0; i < viable.length; i++) {
    const m = Math.round(viable[i].marks || 0);
    if (m <= 0 || m > maxCap) continue;

    for (let s = maxCap; s >= m; s--) {
      if (dpChoice[s] === -1 && dpChoice[s - m] !== -1) {
        dpChoice[s] = i;
        dpPrevSum[s] = s - m;
      }
    }
  }

  let bestSum = 0;
  let bestDiff = Infinity;
  for (let s = 1; s <= maxCap; s++) {
    if (dpChoice[s] !== -1) {
      const diff = Math.abs(s - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSum = s;
      }
    }
  }

  if (bestSum === 0) {
    return { subset: [viable[0]], marks: viable[0].marks || 0 };
  }

  const subset: QuestionItem[] = [];
  let cur = bestSum;
  while (cur > 0 && dpChoice[cur] >= 0) {
    const idx = dpChoice[cur];
    subset.push(viable[idx]);
    cur = dpPrevSum[cur];
  }

  return { subset: subset.reverse(), marks: bestSum };
}

/**
 * Sorts selected questions in authentic Pearson Edexcel examination order:
 * - Mathematics: Ascending by marks (4-6m warm-up -> 7-9m mid-paper -> 10-16m major multi-part questions)
 * - Chemistry & Physics: Section A 1m MCQs first -> Section B/C structured theory grouped by parent question -> 6m extended/LOR questions at end
 */
export function sortExamQuestionsAuthentic(questions: QuestionItem[], isMath: boolean): QuestionItem[] {
  if (isMath) {
    return [...questions].sort((a, b) => {
      const aMarks = a.marks || 0;
      const bMarks = b.marks || 0;
      if (aMarks !== bMarks) {
        return aMarks - bMarks;
      }
      if (a.unitCode !== b.unitCode) {
        return (a.unitCode || '').localeCompare(b.unitCode || '');
      }
      return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
    });
  }

  // Chemistry & Physics
  const mcqs = questions.filter((q) => getQuestionType(q) === 'mcq');
  const theory = questions.filter((q) => getQuestionType(q) !== 'mcq');

  mcqs.sort((a, b) => {
    if (a.unitCode !== b.unitCode) return (a.unitCode || '').localeCompare(b.unitCode || '');
    return (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true });
  });

  // Group theory questions by parent question
  const clusters = new Map<string, QuestionItem[]>();
  theory.forEach((q) => {
    const paperPrefix = q.paperId || q.paperCode || q.unitCode || 'paper';
    const parent = q.parent_question_id
      ? `${paperPrefix}_${q.parent_question_id}`
      : `${paperPrefix}_${q.parentQuestion || q.questionNumber.split(/[(a-z]/)[0] || q.id}`;
    if (!clusters.has(parent)) {
      clusters.set(parent, []);
    }
    clusters.get(parent)!.push(q);
  });

  // Sort inside each cluster by subPart or questionNumber
  for (const group of clusters.values()) {
    group.sort((a, b) => (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, { numeric: true }));
  }

  // Sort clusters: normal structured groups first, groups with 6m Level of Response / extended questions at the end
  const clusterList = Array.from(clusters.values());
  clusterList.sort((groupA, groupB) => {
    const maxMarksA = Math.max(...groupA.map((q) => q.marks || 0));
    const maxMarksB = Math.max(...groupB.map((q) => q.marks || 0));
    const isLoraA = maxMarksA >= 6;
    const isLoraB = maxMarksB >= 6;
    if (isLoraA !== isLoraB) {
      return isLoraA ? 1 : -1;
    }
    const totA = groupA.reduce((sum, q) => sum + (q.marks || 0), 0);
    const totB = groupB.reduce((sum, q) => sum + (q.marks || 0), 0);
    return totA - totB;
  });

  const sortedTheory = clusterList.flat();

  return [...mcqs, ...sortedTheory];
}

/**
 * 3-Stage Smart Auto-Generate Mock Exam Selector with 1D DP Subset-Sum Solver
 * and Constraint Relaxation Telemetry.
 */
export function autoGenerateExam(
  pool: QuestionItem[],
  targetMarksOrOptions: number | ExamGeneratorOptions,
  modeArg?: SmartGenerateMode,
  structureOrStatuses?: ExamStructure | Record<string, string>,
  statusesOrBookmarks?: Record<string, string> | Set<string> | string[],
  bookmarksList?: Set<string> | string[]
): ExamGeneratorResult {
  if (!pool || pool.length === 0) {
    return { selected: [], actualMarks: 0, relaxedConstraints: [] };
  }

  let options: ExamGeneratorOptions;
  if (typeof targetMarksOrOptions === 'object') {
    options = { ...targetMarksOrOptions };
  } else {
    let examStructure: ExamStructure = 'authentic';
    let questionStatuses: Record<string, string> = {};
    let bookmarksSet = new Set<string>();

    if (typeof structureOrStatuses === 'string') {
      examStructure = structureOrStatuses as ExamStructure;
      if (statusesOrBookmarks && !(statusesOrBookmarks instanceof Set) && !Array.isArray(statusesOrBookmarks)) {
        questionStatuses = statusesOrBookmarks as Record<string, string>;
      }
      if (bookmarksList instanceof Set) {
        bookmarksSet = bookmarksList;
      } else if (Array.isArray(bookmarksList)) {
        bookmarksSet = new Set(bookmarksList);
      }
    } else if (structureOrStatuses && typeof structureOrStatuses === 'object') {
      questionStatuses = structureOrStatuses as Record<string, string>;
      if (statusesOrBookmarks instanceof Set) {
        bookmarksSet = statusesOrBookmarks;
      } else if (Array.isArray(statusesOrBookmarks)) {
        bookmarksSet = new Set(statusesOrBookmarks);
      }
    }

    options = {
      targetMarks: targetMarksOrOptions,
      mode: modeArg || 'balanced',
      structure: examStructure,
      questionStatuses,
      bookmarks: bookmarksSet,
    };
  }

  const {
    targetMarks,
    questionCount,
    mode = 'balanced',
    structure = 'authentic',
    selectedUnits,
    selectedTopics,
    selectedSubtopics,
    isMcqOnly,
    questionStatuses = {},
  } = options;

  if (targetMarks <= 0 && (!questionCount || questionCount <= 0)) {
    return { selected: [], actualMarks: 0, relaxedConstraints: [] };
  }

  const relaxedConstraints: string[] = [];
  const bookmarksSet: Set<string> =
    options.bookmarks instanceof Set ? options.bookmarks : new Set(options.bookmarks || []);

  const validPool = pool.filter((q) => (q.marks || 0) > 0);
  if (validPool.length === 0) {
    return { selected: [], actualMarks: 0, relaxedConstraints: ['No questions with valid marks available'] };
  }

  // Step 1: Hard Unit Filter if passed in options
  let unitFiltered = validPool;
  if (selectedUnits && selectedUnits.length > 0 && !selectedUnits.includes('all')) {
    const matched = validPool.filter((q) =>
      selectedUnits.some(
        (u) =>
          String(q.unit).toLowerCase() === u.toLowerCase() ||
          String(q.unitCode).toLowerCase() === u.toLowerCase() ||
          `unit ${q.unit}`.toLowerCase() === u.toLowerCase()
      )
    );
    if (matched.length > 0) {
      unitFiltered = matched;
    } else {
      relaxedConstraints.push(`Unit filter (${selectedUnits.join(', ')})`);
    }
  }

  const isMath = unitFiltered.some(
    (q) => q.unitCode?.startsWith('WMA') || q.unitCode?.startsWith('WME') || q.unitCode?.startsWith('WST')
  );
  const isPhysics = !isMath && unitFiltered.some((q) => q.unitCode?.startsWith('WPH'));
  const isOnlyUnit3or6 =
    !isMath &&
    unitFiltered.every((q) => {
      const code = q.unitCode || '';
      return code.endsWith('13') || code.endsWith('16') || (q.unit && /^(unit\s*)?[36]$/i.test(String(q.unit)));
    });

  // Effective structure: Mathematics and Units 3 & 6 have 0 MCQs
  const effectiveStructure: ExamStructure = isMcqOnly
    ? 'mcq_sprint'
    : isMath || isOnlyUnit3or6
    ? 'theory_only'
    : structure;

  let candidates: QuestionItem[] = [...unitFiltered];
  if (effectiveStructure === 'theory_only') {
    const theoryOnly = unitFiltered.filter((q) => getQuestionType(q) !== 'mcq');
    if (theoryOnly.length > 0) {
      candidates = theoryOnly;
    } else {
      relaxedConstraints.push('Theory-only filter');
    }
  } else if (effectiveStructure === 'mcq_sprint') {
    const mcqOnly = unitFiltered.filter((q) => getQuestionType(q) === 'mcq');
    if (mcqOnly.length > 0) {
      candidates = mcqOnly;
    } else {
      relaxedConstraints.push('MCQ-only filter');
    }
  }

  // Soft Constraint: Topic & Subtopic filters
  const hasTopicFilter =
    (selectedTopics && selectedTopics.length > 0) || (selectedSubtopics && selectedSubtopics.length > 0);
  if (hasTopicFilter) {
    const topicFiltered = candidates.filter((q) => {
      if (selectedTopics && selectedTopics.length > 0) {
        if (!q.topic || !selectedTopics.includes(q.topic)) return false;
      }
      if (selectedSubtopics && selectedSubtopics.length > 0) {
        const qSubs = q.subtopics && q.subtopics.length > 0 ? q.subtopics : [q.subtopic];
        const hasMatch = qSubs.some((s) => s && selectedSubtopics.includes(s));
        if (!hasMatch) return false;
      }
      return true;
    });
    if (topicFiltered.length > 0) {
      candidates = topicFiltered;
    } else {
      relaxedConstraints.push('Selected topic/subtopic filter');
    }
  }

  // Soft Constraint: Unattempted-only mode
  if (mode === 'unattempted_only') {
    const unattempted = candidates.filter((q) => {
      const st = questionStatuses[q.id];
      return !st || st === 'unattempted';
    });
    const unattemptedMarks = unattempted.reduce((sum, q) => sum + (q.marks || 0), 0);
    if (unattempted.length > 0 && unattemptedMarks >= targetMarks) {
      candidates = unattempted;
    } else if (unattempted.length > 0 && unattempted.length < candidates.length) {
      relaxedConstraints.push('Unattempted-only mode (supplemented with attempted questions)');
    } else if (unattempted.length === 0) {
      relaxedConstraints.push('Unattempted-only mode (no unattempted questions remaining)');
    }
  }

  // Precompute deterministic priority per question
  const priorityMap = new Map<string, number>();
  for (const q of candidates) {
    let score = 50;
    const st = questionStatuses[q.id];
    if (mode === 'review_first') {
      const isBookmarked = bookmarksSet.has(q.id);
      if (isBookmarked || st === 'review' || st === 'incorrect') {
        score = 300;
      } else if (!st || st === 'unattempted') {
        score = 100;
      } else {
        score = 20;
      }
    } else if (mode === 'unattempted_only') {
      score = !st || st === 'unattempted' ? 250 : 40;
    }
    priorityMap.set(q.id, score + Math.random() * 40);
  }

  const getQuestionPriority = (q: QuestionItem): number => priorityMap.get(q.id) ?? 50;

  const paperUsage = new Map<string, number>();
  const selected: QuestionItem[] = [];
  const usedIds = new Set<string>();

  let mcqTarget = 0;
  if (effectiveStructure === 'authentic' && !isMath && !isOnlyUnit3or6) {
    const ratio = isPhysics ? 0.13 : 0.22;
    mcqTarget = Math.round(targetMarks * ratio);
  }

  // Step A: Allocate Section A MCQs (if authentic structure and MCQs available)
  if (mcqTarget > 0) {
    const mcqs = candidates.filter((q) => getQuestionType(q) === 'mcq');
    if (mcqs.length > 0) {
      const mcqBuckets = new Map<string, QuestionItem[]>();
      for (const q of fisherYatesShuffle(mcqs)) {
        const key = q.subtopic || q.topic || 'General';
        if (!mcqBuckets.has(key)) mcqBuckets.set(key, []);
        mcqBuckets.get(key)!.push(q);
      }

      for (const bucket of mcqBuckets.values()) {
        bucket.sort((a, b) => getQuestionPriority(b) - getQuestionPriority(a));
      }

      const bucketKeys = fisherYatesShuffle(Array.from(mcqBuckets.keys()));
      let mcqCount = 0;
      let bucketIdx = 0;
      let consecutivePassesWithoutPick = 0;

      while (mcqCount < mcqTarget && bucketKeys.length > 0) {
        const key = bucketKeys[bucketIdx % bucketKeys.length];
        const bucket = mcqBuckets.get(key)!;
        const available = bucket.filter((q) => !usedIds.has(q.id));

        if (available.length > 0) {
          available.sort((a, b) => (paperUsage.get(a.paperId) || 0) - (paperUsage.get(b.paperId) || 0));
          const pick = available[0];
          selected.push(pick);
          usedIds.add(pick.id);
          paperUsage.set(pick.paperId, (paperUsage.get(pick.paperId) || 0) + 1);
          mcqCount += pick.marks || 1;
          consecutivePassesWithoutPick = 0;
        } else {
          consecutivePassesWithoutPick++;
        }

        bucketIdx++;
        if (consecutivePassesWithoutPick >= bucketKeys.length) break;
      }
    }
  }

  // Step B: Stage 1 (Topic & Paper Diversification for Theory / Remaining marks)
  const currentMarksSoFar = selected.reduce((sum, q) => sum + (q.marks || 0), 0);
  const theoryTarget = targetMarks - currentMarksSoFar;

  if (theoryTarget > 0) {
    const theoryCandidates = candidates.filter(
      (q) => !usedIds.has(q.id) && (effectiveStructure === 'mcq_sprint' || getQuestionType(q) !== 'mcq')
    );
    const activeCandidates =
      theoryCandidates.length > 0 ? theoryCandidates : candidates.filter((q) => !usedIds.has(q.id));

    if (activeCandidates.length > 0) {
      const buffer = Math.min(18, Math.max(6, Math.floor(theoryTarget * 0.25)));
      const stage1Target = Math.max(0, theoryTarget - buffer);

      const subtopicBuckets = new Map<string, QuestionItem[]>();
      for (const q of fisherYatesShuffle(activeCandidates)) {
        const key = q.subtopic || q.topic || 'General';
        if (!subtopicBuckets.has(key)) subtopicBuckets.set(key, []);
        subtopicBuckets.get(key)!.push(q);
      }

      for (const bucket of subtopicBuckets.values()) {
        bucket.sort((a, b) => getQuestionPriority(b) - getQuestionPriority(a));
      }

      const bucketKeys = fisherYatesShuffle(Array.from(subtopicBuckets.keys()));
      let currentTheoryMarks = 0;
      let bucketIdx = 0;
      let consecutiveSkips = 0;

      while (currentTheoryMarks < stage1Target && bucketKeys.length > 0) {
        const key = bucketKeys[bucketIdx % bucketKeys.length];
        const bucket = subtopicBuckets.get(key)!;
        const available = bucket.filter((q) => !usedIds.has(q.id));

        if (available.length > 0) {
          const viable = available.filter((q) => currentTheoryMarks + (q.marks || 0) <= theoryTarget - 4);
          if (viable.length > 0) {
            viable.sort((a, b) => {
              const aUse = paperUsage.get(a.paperId) || 0;
              const bUse = paperUsage.get(b.paperId) || 0;
              if (aUse !== bUse) return aUse - bUse;
              return getQuestionPriority(b) - getQuestionPriority(a);
            });
            const pick = viable[0];
            selected.push(pick);
            usedIds.add(pick.id);
            paperUsage.set(pick.paperId, (paperUsage.get(pick.paperId) || 0) + 1);
            currentTheoryMarks += pick.marks || 0;
            consecutiveSkips = 0;
          } else {
            consecutiveSkips++;
          }
        } else {
          consecutiveSkips++;
        }

        bucketIdx++;
        if (consecutiveSkips >= bucketKeys.length) break;
      }

      // Step C: Stage 2 (1D Subset-Sum DP Exact Mark Solver — Zero Overshoot/Undershoot)
      const deficit = theoryTarget - currentTheoryMarks;
      if (deficit > 0) {
        const remainingCandidates = activeCandidates.filter((q) => !usedIds.has(q.id));
        const { subset } = findClosestSubset(remainingCandidates, deficit, paperUsage);
        for (const q of subset) {
          selected.push(q);
          usedIds.add(q.id);
          paperUsage.set(q.paperId, (paperUsage.get(q.paperId) || 0) + 1);
        }
      }
    }
  }

  let finalSelected = selected;
  let finalMarks = finalSelected.reduce((sum, q) => sum + (q.marks || 0), 0);

  if (finalMarks !== targetMarks) {
    const fullExact = findExactSubset(candidates, targetMarks, new Map());
    if (fullExact && fullExact.length > 0) {
      finalSelected = fullExact;
      finalMarks = targetMarks;
    }
  }

  if (finalMarks < targetMarks) {
    relaxedConstraints.push(`Target marks (${finalMarks}/${targetMarks}m available under current filters)`);
  }

  const sorted = sortExamQuestionsAuthentic(finalSelected, isMath);

  return { selected: sorted, actualMarks: finalMarks, relaxedConstraints };
}
