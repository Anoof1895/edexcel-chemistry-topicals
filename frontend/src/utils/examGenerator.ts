import { QuestionItem } from '../types';
import { getQuestionType } from './questionClassification';

export type SmartGenerateMode = 'balanced' | 'review_first' | 'unattempted_only';
export type ExamStructure = 'authentic' | 'theory_only' | 'mcq_sprint';

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
 * Fast bounded backtracking search to find an exact subset of questions summing to target marks.
 * Prioritizes questions with lowest exam paper usage and prunes branches aggressively.
 */
export function findExactSubset(
  candidates: QuestionItem[],
  target: number,
  paperUsage: Map<string, number>,
  maxTimeMs: number = 30
): QuestionItem[] | null {
  if (target === 0) return [];
  if (!candidates || candidates.length === 0 || target < 0) return null;

  // Filter out candidates with marks <= 0 or marks > target
  const viable = candidates.filter((q) => (q.marks || 0) > 0 && (q.marks || 0) <= target);
  if (viable.length === 0) return null;

  // Sort viable: prefer lower paper usage first, then descending marks for rapid pruning
  viable.sort((a, b) => {
    const aUse = paperUsage.get(a.paperId) || 0;
    const bUse = paperUsage.get(b.paperId) || 0;
    if (aUse !== bUse) return aUse - bUse;
    return (b.marks || 0) - (a.marks || 0);
  });

  const startTime = performance.now();
  let result: QuestionItem[] | null = null;

  function dfs(index: number, rem: number, path: QuestionItem[]): boolean {
    if (rem === 0) {
      result = [...path];
      return true;
    }
    if (rem < 0 || index >= viable.length) return false;
    if (performance.now() - startTime > maxTimeMs) return false;

    // Option 1: Pick viable[index]
    const item = viable[index];
    const m = item.marks || 0;
    if (m <= rem) {
      path.push(item);
      if (dfs(index + 1, rem - m, path)) return true;
      path.pop();
    }

    // Option 2: Skip viable[index]
    if (dfs(index + 1, rem, path)) return true;

    return false;
  }

  dfs(0, target, []);
  return result;
}

/**
 * Finds the closest subset to target marks, prioritizing an exact match when available.
 */
export function findClosestSubset(
  candidates: QuestionItem[],
  target: number,
  paperUsage: Map<string, number>
): { subset: QuestionItem[]; marks: number } {
  const exact = findExactSubset(candidates, target, paperUsage, 25);
  if (exact) {
    const marks = exact.reduce((sum, q) => sum + (q.marks || 0), 0);
    return { subset: exact, marks };
  }

  const viable = candidates
    .filter((q) => (q.marks || 0) > 0)
    .sort((a, b) => {
      const aUse = paperUsage.get(a.paperId) || 0;
      const bUse = paperUsage.get(b.paperId) || 0;
      if (aUse !== bUse) return aUse - bUse;
      return (b.marks || 0) - (a.marks || 0);
    });

  const subset: QuestionItem[] = [];
  let cur = 0;
  for (const q of viable) {
    const m = q.marks || 0;
    if (cur + m <= target + 2) {
      subset.push(q);
      cur += m;
      if (Math.abs(cur - target) <= 1) break;
    }
  }
  return { subset, marks: cur };
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
 * 3-Stage Smart Auto-Generate Mock Exam Selector.
 * Respects all active filters, selection modes, exam structures, and achieves exact mark sums.
 */
export function autoGenerateExam(
  pool: QuestionItem[],
  targetMarks: number,
  mode: SmartGenerateMode,
  structureOrStatuses?: ExamStructure | Record<string, string>,
  statusesOrBookmarks?: Record<string, string> | Set<string> | string[],
  bookmarksList?: Set<string> | string[]
): { selected: QuestionItem[]; actualMarks: number } {
  if (!pool || pool.length === 0 || targetMarks <= 0) {
    return { selected: [], actualMarks: 0 };
  }

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

  const validPool = pool.filter((q) => (q.marks || 0) > 0);
  if (validPool.length === 0) return { selected: [], actualMarks: 0 };

  const isMath = validPool.some(
    (q) => q.unitCode?.startsWith('WMA') || q.unitCode?.startsWith('WME') || q.unitCode?.startsWith('WST')
  );
  const isPhysics = !isMath && validPool.some((q) => q.unitCode?.startsWith('WPH'));
  const isOnlyUnit3or6 =
    !isMath &&
    validPool.every((q) => {
      const code = q.unitCode || '';
      return code.endsWith('13') || code.endsWith('16') || (q.unit && /unit\s*[36]/i.test(q.unit));
    });

  // Effective structure: Mathematics and Units 3 & 6 have 0 MCQs
  const effectiveStructure: ExamStructure = isMath || isOnlyUnit3or6 ? 'theory_only' : examStructure;

  // Filter candidates by structure
  let candidates: QuestionItem[] = [...validPool];
  if (effectiveStructure === 'theory_only') {
    candidates = validPool.filter((q) => getQuestionType(q) !== 'mcq');
  } else if (effectiveStructure === 'mcq_sprint') {
    candidates = validPool.filter((q) => getQuestionType(q) === 'mcq');
  }

  if (candidates.length === 0) {
    candidates = [...validPool];
  }

  // Filter by Selection Mode (Unattempted)
  if (mode === 'unattempted_only') {
    const unattempted = candidates.filter((q) => {
      const st = questionStatuses[q.id];
      return !st || st === 'unattempted';
    });
    if (unattempted.length > 0) {
      candidates = unattempted;
    }
  }

  const getQuestionPriority = (q: QuestionItem): number => {
    let score = 50;
    if (mode === 'review_first') {
      const isBookmarked = bookmarksSet.has(q.id);
      const st = questionStatuses[q.id];
      if (isBookmarked || st === 'review' || st === 'incorrect') {
        score = 300;
      } else if (!st || st === 'unattempted') {
        score = 100;
      } else {
        score = 20;
      }
    }
    return score + Math.random() * 40;
  };

  const runTrial = (): { selected: QuestionItem[]; currentMarks: number } => {
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
        mcqs.forEach((q) => {
          const key = q.subtopic || q.topic || 'General';
          if (!mcqBuckets.has(key)) mcqBuckets.set(key, []);
          mcqBuckets.get(key)!.push(q);
        });

        for (const bucket of mcqBuckets.values()) {
          bucket.sort((a, b) => getQuestionPriority(b) - getQuestionPriority(a));
        }

        const bucketKeys = Array.from(mcqBuckets.keys()).sort(() => Math.random() - 0.5);
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
            mcqCount += (pick.marks || 1);
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
      const activeCandidates = theoryCandidates.length > 0 ? theoryCandidates : candidates.filter((q) => !usedIds.has(q.id));

      if (activeCandidates.length > 0) {
        const buffer = Math.min(18, Math.max(6, Math.floor(theoryTarget * 0.25)));
        const stage1Target = Math.max(0, theoryTarget - buffer);

        const subtopicBuckets = new Map<string, QuestionItem[]>();
        activeCandidates.forEach((q) => {
          const key = q.subtopic || q.topic || 'General';
          if (!subtopicBuckets.has(key)) subtopicBuckets.set(key, []);
          subtopicBuckets.get(key)!.push(q);
        });

        for (const bucket of subtopicBuckets.values()) {
          bucket.sort((a, b) => getQuestionPriority(b) - getQuestionPriority(a));
        }

        const bucketKeys = Array.from(subtopicBuckets.keys()).sort(() => Math.random() - 0.5);
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
              currentTheoryMarks += (pick.marks || 0);
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

        // Step C: Stage 2 (Exact Mark Sum Solver — Zero Overshoot/Undershoot)
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

    const totalMarks = selected.reduce((sum, q) => sum + (q.marks || 0), 0);
    return { selected, currentMarks: totalMarks };
  };

  let bestSelected: QuestionItem[] = [];
  let bestDiff = Infinity;
  let bestMarks = 0;

  for (let trial = 0; trial < 30; trial++) {
    const { selected, currentMarks } = runTrial();
    const diff = Math.abs(currentMarks - targetMarks);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSelected = selected;
      bestMarks = currentMarks;
    }
    if (diff === 0) break;
  }

  const sorted = sortExamQuestionsAuthentic(bestSelected, isMath);

  return { selected: sorted, actualMarks: bestMarks };
}
