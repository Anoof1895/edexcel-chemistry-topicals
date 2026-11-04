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
  is_mcq?: boolean;
  hasStem: boolean;
  stemSummary: string | null;
  parent_question_id?: string;
  all_subparts?: string[];
  questionImagePath: string;
  markSchemeImagePath: string | null;
  question_image_url?: string;
  mark_scheme_image_url?: string;
  question_image?: string;
  mark_scheme_image?: string;
  image?: string;
  image_url?: string;
  crop_path?: string;
  image_path?: string;
  ms_image?: string;
  ms_image_url?: string;
  ms_crop_path?: string;
  ms_image_path?: string;
  mark_scheme_image_path?: string;
  subject?: string;
  answer?: string;
  correctAnswer?: string;
  correct_answer?: string;
}

export type ViewMode = 'split' | 'question-only' | 'ms-only';

export type MasteryStatus = 'unattempted' | 'review' | 'mastered' | 'correct' | 'incorrect';

export interface UserProgressRecord {
  user_id: string;
  question_id: string;
  status: string;
  is_bookmarked: boolean;
  user_answer: string | null;
  updated_at: string;
}

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

export type Subject = 'chemistry' | 'physics' | 'mathematics';

export interface MockExamPreset {
  id: string;
  subject: Subject;
  unit: string;
  unitCode: string;
  tier: 'AS' | 'A2' | 'Practical' | 'Applied' | 'MCQ';
  label: string;
  shortLabel: string;
  description: string;
  durationMinutes: number;
  durationLabel: string;
  targetMarks: number;
  questionCount?: number;
  isMcqOnly: boolean;
  calculatorAllowed: boolean;
}

export const MOCK_EXAM_PRESETS: MockExamPreset[] = [
  // Edexcel IAL Chemistry (WCH11 - WCH16)
  {
    id: 'chem_u1_wch11',
    subject: 'chemistry',
    unit: '1',
    unitCode: 'WCH11',
    tier: 'AS',
    label: 'Unit 1: Structure, Bonding & Intro to Organic (WCH11)',
    shortLabel: 'Unit 1 (WCH11)',
    description: 'AS Level • Section A MCQs (20m) + Section B Structured Questions (60m) • 1h 30m, 80 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 80,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'chem_u2_wch12',
    subject: 'chemistry',
    unit: '2',
    unitCode: 'WCH12',
    tier: 'AS',
    label: 'Unit 2: Energetics, Group Chemistry & Alcohols (WCH12)',
    shortLabel: 'Unit 2 (WCH12)',
    description: 'AS Level • Section A MCQs (20m) + Section B/C Structured & Extended (60m) • 1h 30m, 80 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 80,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'chem_u3_wch13',
    subject: 'chemistry',
    unit: '3',
    unitCode: 'WCH13',
    tier: 'Practical',
    label: 'Unit 3: Practical Skills in Chemistry I (WCH13)',
    shortLabel: 'Unit 3 Practical (WCH13)',
    description: 'AS Practical Paper • Qualitative, Quantitative & Experimental Techniques • 1h 15m, 50 marks',
    durationMinutes: 75,
    durationLabel: '1h 15m',
    targetMarks: 50,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'chem_u4_wch14',
    subject: 'chemistry',
    unit: '4',
    unitCode: 'WCH14',
    tier: 'A2',
    label: 'Unit 4: Rates, Equilibria & Further Organic (WCH14)',
    shortLabel: 'Unit 4 (WCH14)',
    description: 'A2 Level • Section A MCQs (20m) + Section B/C Structured & Data Questions (70m) • 1h 45m, 90 marks',
    durationMinutes: 105,
    durationLabel: '1h 45m',
    targetMarks: 90,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'chem_u5_wch15',
    subject: 'chemistry',
    unit: '5',
    unitCode: 'WCH15',
    tier: 'A2',
    label: 'Unit 5: Transition Metals & Organic Nitrogen (WCH15)',
    shortLabel: 'Unit 5 (WCH15)',
    description: 'A2 Level • Section A MCQs (20m) + Section B/C Synoptic & Synthesis (70m) • 1h 45m, 90 marks',
    durationMinutes: 105,
    durationLabel: '1h 45m',
    targetMarks: 90,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'chem_u6_wch16',
    subject: 'chemistry',
    unit: '6',
    unitCode: 'WCH16',
    tier: 'Practical',
    label: 'Unit 6: Practical Skills in Chemistry II (WCH16)',
    shortLabel: 'Unit 6 Practical (WCH16)',
    description: 'A2 Practical Paper • Advanced Synthesis, Titration & Spectroscopy Analysis • 1h 15m, 50 marks',
    durationMinutes: 75,
    durationLabel: '1h 15m',
    targetMarks: 50,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'chem_mcq_sprint',
    subject: 'chemistry',
    unit: 'all',
    unitCode: 'Section A',
    tier: 'MCQ',
    label: 'Section A: Multiple Choice Sprint (20 MCQs)',
    shortLabel: 'Section A MCQ (20m)',
    description: '20 Edexcel IAL Section A Multiple Choice Questions • 25m, 20 marks',
    durationMinutes: 25,
    durationLabel: '25m',
    targetMarks: 20,
    questionCount: 20,
    isMcqOnly: true,
    calculatorAllowed: true,
  },

  // Edexcel IAL Physics (WPH11 - WPH16)
  {
    id: 'phys_u1_wph11',
    subject: 'physics',
    unit: '1',
    unitCode: 'WPH11',
    tier: 'AS',
    label: 'Unit 1: Mechanics and Materials (WPH11)',
    shortLabel: 'Unit 1 (WPH11)',
    description: 'AS Level • Section A MCQs (10m) + Section B Structured Questions (70m) • 1h 30m, 80 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 80,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'phys_u2_wph12',
    subject: 'physics',
    unit: '2',
    unitCode: 'WPH12',
    tier: 'AS',
    label: 'Unit 2: Waves and Electricity (WPH12)',
    shortLabel: 'Unit 2 (WPH12)',
    description: 'AS Level • Section A MCQs (10m) + Section B Structured Questions (70m) • 1h 30m, 80 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 80,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'phys_u3_wph13',
    subject: 'physics',
    unit: '3',
    unitCode: 'WPH13',
    tier: 'Practical',
    label: 'Unit 3: Practical Skills in Physics I (WPH13)',
    shortLabel: 'Unit 3 Practical (WPH13)',
    description: 'AS Practical Paper • Experimental Planning, Uncertainty & Data Analysis • 1h 20m, 50 marks',
    durationMinutes: 80,
    durationLabel: '1h 20m',
    targetMarks: 50,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'phys_u4_wph14',
    subject: 'physics',
    unit: '4',
    unitCode: 'WPH14',
    tier: 'A2',
    label: 'Unit 4: Further Mechanics, Fields and Particles (WPH14)',
    shortLabel: 'Unit 4 (WPH14)',
    description: 'A2 Level • Section A MCQs (10m) + Section B Structured Questions (80m) • 1h 45m, 90 marks',
    durationMinutes: 105,
    durationLabel: '1h 45m',
    targetMarks: 90,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'phys_u5_wph15',
    subject: 'physics',
    unit: '5',
    unitCode: 'WPH15',
    tier: 'A2',
    label: 'Unit 5: Thermodynamics, Radiation, Oscillations & Cosmology (WPH15)',
    shortLabel: 'Unit 5 (WPH15)',
    description: 'A2 Level • Section A MCQs (10m) + Section B Structured Questions (80m) • 1h 45m, 90 marks',
    durationMinutes: 105,
    durationLabel: '1h 45m',
    targetMarks: 90,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'phys_u6_wph16',
    subject: 'physics',
    unit: '6',
    unitCode: 'WPH16',
    tier: 'Practical',
    label: 'Unit 6: Practical Skills in Physics II (WPH16)',
    shortLabel: 'Unit 6 Practical (WPH16)',
    description: 'A2 Practical Paper • Advanced Experimental Design, Log Graphs & Uncertainties • 1h 20m, 50 marks',
    durationMinutes: 80,
    durationLabel: '1h 20m',
    targetMarks: 50,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'phys_mcq_sprint',
    subject: 'physics',
    unit: 'all',
    unitCode: 'Section A',
    tier: 'MCQ',
    label: 'Section A: Multiple Choice Sprint (20 MCQs)',
    shortLabel: 'Section A MCQ (20m)',
    description: '20 Edexcel IAL Physics Multiple Choice Questions • 25m, 20 marks',
    durationMinutes: 25,
    durationLabel: '25m',
    targetMarks: 20,
    questionCount: 20,
    isMcqOnly: true,
    calculatorAllowed: true,
  },

  // Edexcel IAL Mathematics (WMA11 - WMA14, WME01, WST01)
  {
    id: 'math_p1_wma11',
    subject: 'mathematics',
    unit: 'P1',
    unitCode: 'WMA11',
    tier: 'AS',
    label: 'Pure Mathematics 1 (WMA11)',
    shortLabel: 'Pure 1 (WMA11)',
    description: 'AS Pure Mathematics • Algebra, Coordinate Geometry, Trigonometry & Calculus • 1h 30m, 75 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 75,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'math_p2_wma12',
    subject: 'mathematics',
    unit: 'P2',
    unitCode: 'WMA12',
    tier: 'AS',
    label: 'Pure Mathematics 2 (WMA12)',
    shortLabel: 'Pure 2 (WMA12)',
    description: 'AS Pure Mathematics • Proof, Sequences, Logarithms, Binomial & Integration • 1h 30m, 75 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 75,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'math_p3_wma13',
    subject: 'mathematics',
    unit: 'P3',
    unitCode: 'WMA13',
    tier: 'A2',
    label: 'Pure Mathematics 3 (WMA13)',
    shortLabel: 'Pure 3 (WMA13)',
    description: 'A2 Pure Mathematics • Functions, Trigonometric Identities, Exponentials & Differentiation • 1h 30m, 75 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 75,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'math_p4_wma14',
    subject: 'mathematics',
    unit: 'P4',
    unitCode: 'WMA14',
    tier: 'A2',
    label: 'Pure Mathematics 4 (WMA14)',
    shortLabel: 'Pure 4 (WMA14)',
    description: 'A2 Pure Mathematics • Parametric Equations, Vectors, Differential Equations & Integration • 1h 30m, 75 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 75,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'math_m1_wme01',
    subject: 'mathematics',
    unit: 'M1',
    unitCode: 'WME01',
    tier: 'Applied',
    label: 'Mechanics 1 (WME01)',
    shortLabel: 'Mechanics 1 (WME01)',
    description: 'Applied Mathematics • Kinematics, Dynamics, Statics, Moments & Vectors • 1h 30m, 75 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 75,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
  {
    id: 'math_s1_wst01',
    subject: 'mathematics',
    unit: 'S1',
    unitCode: 'WST01',
    tier: 'Applied',
    label: 'Statistics 1 (WST01)',
    shortLabel: 'Statistics 1 (WST01)',
    description: 'Applied Mathematics • Data Representation, Probability, Correlation, Discrete RV & Normal Distribution • 1h 30m, 75 marks',
    durationMinutes: 90,
    durationLabel: '1h 30m',
    targetMarks: 75,
    isMcqOnly: false,
    calculatorAllowed: true,
  },
];

export function getPresetsForSubject(subject: Subject): MockExamPreset[] {
  return MOCK_EXAM_PRESETS.filter((p) => p.subject === subject);
}

export type AppView = 
  | 'home' 
  | 'chemistry-topical' 
  | 'chemistry-test-maker'
  | 'physics-topical'
  | 'physics-test-maker'
  | 'mathematics-topical'
  | 'mathematics-test-maker';

export interface TestPaperConfig {
  title: string;
  questionIds: string[];
}
