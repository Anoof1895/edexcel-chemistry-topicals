export interface QuestionItem {
  id: string;
  paperId: string;
  unit: string;
  unitCode: string;
  paperCode?: string;
  paper_code?: string;
  year: number;
  session?: string;
  series: string;
  questionNumber: string;
  parentQuestion: string;
  subPart: string;
  marks: number;
  topic: string;
  subtopic: string;
  subtopics?: string[];
  section?: string;
  question_type?: 'mcq' | 'theory';
  questionType?: 'mcq' | 'theory';
  hasStem: boolean;
  stemSummary: string | null;
  parent_question_id?: string;
  all_subparts?: string[];
  questionImagePath: string;
  markSchemeImagePath: string | null;
  answer?: string;
  correctAnswer?: string;
  correct_answer?: string;
}

export type ViewMode = 'split' | 'question-only' | 'ms-only';

export type MasteryStatus = 'unattempted' | 'review' | 'mastered';

export type StatusFilter = 'all' | 'review' | 'unattempted' | 'mastered';

export type QuestionTypeFilter = 'all' | 'mcq' | 'theory';

export interface FilterState {
  selectedUnits: string[];     // Array of checked units; empty means all
  selectedSubtopics: string[]; // Array of checked subtopics; empty means all
  selectedYears: string[];     // Array of checked years; empty means all
  selectedSeries: string[];    // Array of checked series ('January' | 'May/June' | 'October'); empty means all
  searchQuery: string;
  statusFilter: StatusFilter; // 'all' | 'review' | 'unattempted' | 'mastered'
  questionType: QuestionTypeFilter; // 'all' | 'mcq' | 'theory'
  bookmarkedOnly: boolean;
  // Backwards compatibility optional fields
  unit?: string;
  year?: string;
  series?: string;
}

export type AppView = 'home' | 'chemistry-topical' | 'chemistry-test-maker';

export interface TestPaperConfig {
  title: string;
  questionIds: string[];
}
