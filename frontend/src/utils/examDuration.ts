/**
 * Calculates official Pearson Edexcel IAL examination duration in minutes.
 *
 * Official Exam Timings:
 * - Mathematics: 75 marks -> 90 mins (1 hr 30 mins) [Math.round(totalMarks * 1.2)]
 * - Chemistry & Physics AS (Unit 1 & 2): 80 marks -> 90 mins (1 hr 30 mins)
 * - Chemistry & Physics IA2 (Unit 4 & 5): 90 marks -> 105 mins (1 hr 45 mins)
 * - Chemistry & Physics Practical (Unit 3 & 6): 50 marks -> 80 mins (1 hr 20 mins)
 * - Other custom mark totals:
 *   - Mathematics: Math.round(totalMarks * 1.2)
 *   - Science: Math.round(totalMarks * 1.15)
 */
export function calculateExamDurationMinutes(
  totalMarks: number,
  isMath: boolean,
  selectedUnits: string[] = []
): number {
  if (totalMarks <= 0) return 0;

  if (isMath) {
    return Math.round(totalMarks * 1.2);
  }

  // Official Chemistry & Physics Full Paper durations
  if (totalMarks === 80) return 90;
  if (totalMarks === 90) return 105;
  if (totalMarks === 50) return 80;

  // If Unit 3 or Unit 6 is the focus and marks are approximately 50 (48-52m)
  const isPracticalUnit = selectedUnits.some(
    (u) => /unit\s*[36]/i.test(u) || /w[a-z]{2}1[36]/i.test(u)
  );
  if (isPracticalUnit && Math.abs(totalMarks - 50) <= 2) {
    return 80;
  }

  return Math.round(totalMarks * 1.15);
}
