import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Plus,
  Check,
  Layers,
  Search,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Printer,
  AlertCircle,
  X,
  Eye,
  Sparkles,
  Zap,
  ChevronDown,
  Shuffle,
  PlayCircle,
  Award,
  GripVertical,
  AlertTriangle,
} from 'lucide-react';
import {
  QuestionItem,
  FilterState,
  Subject,
  MockExamPreset,
  getPresetsForSubject,
} from '../types';
import { FilterMultiSelect, FilterOption } from './FilterMultiSelect';
import { SubtopicMultiSelect } from './SubtopicMultiSelect';
import { SubtopicGroup, buildStaticSubtopicHierarchy } from '../constants/taxonomy';
import {
  getQuestionType,
  getQuestionSubject,
  doesQuestionMatchUnit,
  getQuestionValidSubtopics,
  isPrimarySubtopicMatch,
} from '../utils/questionClassification';
import { sortQuestionsLatestFirst } from './QuestionList';
import { ImageCanvas } from './ImageCanvas';
import { resolveQuestionImageUrl, resolveMarkSchemeImageUrl } from '../utils/imageUrl';
import { useProgress } from '../context/ProgressContext';
import { SpotlightCard } from './SpotlightCard';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../utils/spotlight';
import {
  autoGenerateExam,
  detectUnitCategory,
  fisherYatesShuffle,
  ExamStructure,
  SmartGenerateMode,
} from '../utils/examGenerator';
import { calculateExamDurationMinutes, formatDuration } from '../utils/examDuration';
import { MockSittingModal } from './MockSittingModal';
import { FullPaperPresetsModal } from './FullPaperPresetsModal';

export { autoGenerateExam };
export type { SmartGenerateMode, ExamStructure };

interface TestMakerPageProps {
  subject?: Subject;
  questions: QuestionItem[];
  cartQuestionIds: string[];
  onAddToCart: (id: string) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  onReorderCart: (newIds: string[]) => void;
  testTitle: string;
  onSetTestTitle: (title: string) => void;
}

const PAGE_SIZE = 15;

const DEFAULT_EXAM_TITLES: Record<Subject, string> = {
  chemistry: 'Custom Chemistry Mock Exam',
  physics: 'Custom Physics Mock Exam',
  mathematics: 'Custom Mathematics Mock Exam',
};

export const TestMakerPage: React.FC<TestMakerPageProps> = ({
  subject,
  questions,
  cartQuestionIds,
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  onReorderCart,
  testTitle,
  onSetTestTitle,
}) => {
  // Detect active subject using single source of truth
  const activeSubject: Subject = useMemo(() => {
    return subject || getQuestionSubject(questions[0]);
  }, [subject, questions]);

  const isMath = activeSubject === 'mathematics';

  // Subject reactive color classes for modals & pills
  const accentClasses = useMemo(() => {
    switch (activeSubject) {
      case 'mathematics':
        return {
          primary: 'amber',
          text: 'text-amber-500 dark:text-amber-400',
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-50 dark:bg-amber-500/15',
          border: 'border-amber-300 dark:border-amber-500/30',
          gradient: 'from-amber-500 to-amber-600',
        };
      case 'physics':
        return {
          primary: 'indigo',
          text: 'text-indigo-500 dark:text-indigo-400',
          bg: 'bg-indigo-500',
          bgLight: 'bg-indigo-50 dark:bg-indigo-500/15',
          border: 'border-indigo-300 dark:border-indigo-500/30',
          gradient: 'from-indigo-500 to-indigo-600',
        };
      case 'chemistry':
      default:
        return {
          primary: 'cyan',
          text: 'text-cyan-500 dark:text-cyan-400',
          bg: 'bg-cyan-500',
          bgLight: 'bg-cyan-50 dark:bg-cyan-500/15',
          border: 'border-cyan-300 dark:border-cyan-500/30',
          gradient: 'from-cyan-500 to-cyan-600',
        };
    }
  }, [activeSubject]);

  // Center preview state: question currently being inspected
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'question' | 'ms' | 'split'>('split');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isExportingQP, setIsExportingQP] = useState<boolean>(false);
  const [isExportingMS, setIsExportingMS] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [includeFormalHeader, setIncludeFormalHeader] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('edexcel_export_formal_header');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [includeSourceTags, setIncludeSourceTags] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('edexcel_export_source_tags');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [includeHeaderFooter, setIncludeHeaderFooter] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('edexcel_export_header_footer');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('edexcel_export_formal_header', JSON.stringify(includeFormalHeader));
    } catch {
      // ignore storage errors
    }
  }, [includeFormalHeader]);

  useEffect(() => {
    try {
      localStorage.setItem('edexcel_export_source_tags', JSON.stringify(includeSourceTags));
    } catch {
      // ignore storage errors
    }
  }, [includeSourceTags]);

  useEffect(() => {
    try {
      localStorage.setItem('edexcel_export_header_footer', JSON.stringify(includeHeaderFooter));
    } catch {
      // ignore storage errors
    }
  }, [includeHeaderFooter]);

  // In-Browser Sitting Mode & Full Paper Presets Modals
  const [isSittingModalOpen, setIsSittingModalOpen] = useState<boolean>(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Native HTML5 Drag-and-Drop Reordering State & Refs
  const draggedIndexRef = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Generator Constraint Relaxation / Target Warning Toast
  const [generatorWarning, setGeneratorWarning] = useState<string | null>(null);
  const generatorWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showGeneratorWarning = (message: string) => {
    setGeneratorWarning(message);
    if (generatorWarningTimerRef.current) {
      clearTimeout(generatorWarningTimerRef.current);
    }
    generatorWarningTimerRef.current = setTimeout(() => {
      setGeneratorWarning(null);
    }, 6000);
  };

  // Lightweight Undo Stack for Cart Destruction Protection
  const [cartUndoStack, setCartUndoStack] = useState<string[][]>([]);
  const [showUndoToast, setShowUndoToast] = useState<boolean>(false);
  const undoToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushCartUndoState = (prevIds: string[]) => {
    if (prevIds.length === 0) return;
    setCartUndoStack((stack) => [...stack.slice(-9), [...prevIds]]);
    setShowUndoToast(true);
    if (undoToastTimerRef.current) {
      clearTimeout(undoToastTimerRef.current);
    }
    undoToastTimerRef.current = setTimeout(() => {
      setShowUndoToast(false);
    }, 5000);
  };

  const handleUndoCartReplace = () => {
    if (cartUndoStack.length === 0) return;
    const previousCart = cartUndoStack[cartUndoStack.length - 1];
    setCartUndoStack((stack) => stack.slice(0, -1));
    onReorderCart(previousCart);
    if (previousCart.length > 0) {
      setPreviewQuestionId(previousCart[0]);
    }
    setShowUndoToast(false);
    if (undoToastTimerRef.current) {
      clearTimeout(undoToastTimerRef.current);
      undoToastTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (undoToastTimerRef.current) clearTimeout(undoToastTimerRef.current);
      if (generatorWarningTimerRef.current) clearTimeout(generatorWarningTimerRef.current);
    };
  }, []);

  // Responsive state
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'pool' | 'preview' | 'cart'>('pool');

  // Local filter state for searching available questions
  const [filters, setFilters] = useState<FilterState>({
    selectedUnits: [],
    selectedSubtopics: [],
    selectedYears: [],
    selectedSeries: [],
    searchQuery: '',
    statusFilter: 'all',
    questionType: 'all',
    bookmarkedOnly: false,
  });

  // Marks filter: 'all' | '1m' | '2-3m' | '4-5m' | '6m+' (Science) or 'all' | '1-4m' | '5-7m' | '8-10m' | '11m+' (Math)
  const [marksFilter, setMarksFilter] = useState<string>('all');

  // Smart Auto-Generate Mock Exam State
  const [targetMarks, setTargetMarks] = useState<number>(isMath ? 75 : 80);
  const [generateMode, setGenerateMode] = useState<SmartGenerateMode>('balanced');
  const [examStructure, setExamStructure] = useState<ExamStructure>(isMath ? 'theory_only' : 'authentic');
  const [isSmartGenerateOpen, setIsSmartGenerateOpen] = useState<boolean>(false);
  const [lastGeneratedInfo, setLastGeneratedInfo] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.searchQuery);

  // Official Edexcel IAL Mock Presets for this subject
  const officialPresets: MockExamPreset[] = useMemo(() => {
    return getPresetsForSubject(activeSubject);
  }, [activeSubject]);

  // Clean cross-subject state reset when switching subjects inside Test Maker
  useEffect(() => {
    setFilters({
      selectedUnits: [],
      selectedSubtopics: [],
      selectedYears: [],
      selectedSeries: [],
      searchQuery: '',
      statusFilter: 'all',
      questionType: 'all',
      bookmarkedOnly: false,
    });
    setSearchInput('');
    setMarksFilter('all');
    setCurrentPage(1);
    setLastGeneratedInfo(null);
    setSelectedPresetId(null);
    setTargetMarks(activeSubject === 'mathematics' ? 75 : 80);
    setExamStructure(activeSubject === 'mathematics' ? 'theory_only' : 'authentic');
    setPreviewQuestionId(questions[0]?.id || null);
    setCartUndoStack([]);
    setShowUndoToast(false);
    setGeneratorWarning(null);
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);

    const isDefaultTitle = Object.values(DEFAULT_EXAM_TITLES).includes(testTitle);
    if (isDefaultTitle && testTitle !== DEFAULT_EXAM_TITLES[activeSubject]) {
      onSetTestTitle(DEFAULT_EXAM_TITLES[activeSubject]);
    }
  }, [activeSubject]);

  // Dynamic unit-aware preset and exam structure switching
  useEffect(() => {
    if (isMath) {
      setTargetMarks(75);
      setExamStructure('theory_only');
      setMarksFilter('all');
      return;
    }

    const category = detectUnitCategory(filters.selectedUnits);
    if (category === 'unit3_6') {
      setTargetMarks(50);
      setExamStructure('theory_only');
    } else if (category === 'ia2') {
      setTargetMarks(90);
      setExamStructure((prev) => (prev === 'theory_only' ? 'authentic' : prev));
    } else if (category === 'as') {
      setTargetMarks(80);
      setExamStructure((prev) => (prev === 'theory_only' ? 'authentic' : prev));
    }
  }, [filters.selectedUnits, isMath]);

  const { questionStatuses, bookmarks } = useProgress();

  // Debounced search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.searchQuery !== searchInput) {
        setFilters((prev) => ({ ...prev, searchQuery: searchInput }));
        setCurrentPage(1);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput, filters.searchQuery]);

  // Available filter options
  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    questions.forEach((q) => {
      if (q.unit) units.add(q.unit);
    });
    return Array.from(units).sort();
  }, [questions]);

  const unitOptions: FilterOption[] = useMemo(() => {
    return availableUnits.map((u) => ({ value: u, label: u }));
  }, [availableUnits]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    questions.forEach((q) => {
      if (q.year) years.add(q.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [questions]);

  const yearOptions: FilterOption[] = useMemo(() => {
    return availableYears.map((yr) => ({ value: String(yr), label: String(yr) }));
  }, [availableYears]);

  const seriesList = ['January', 'May/June', 'October'];
  const seriesOptions: FilterOption[] = useMemo(() => {
    return seriesList.map((s) => ({ value: s, label: s }));
  }, []);

  // Unit-filtered questions (excluding subtopic filter) for accurate subtopic counts
  const unitFilteredQuestions = useMemo(() => {
    if (filters.selectedUnits.length === 0) return questions;
    return questions.filter((q) =>
      filters.selectedUnits.some((fu) => {
        return doesQuestionMatchUnit(q, fu);



      })
    );
  }, [questions, filters.selectedUnits]);

  // Canonical Subtopic Hierarchy
  const subtopicHierarchy: SubtopicGroup[] = useMemo(() => {
    return buildStaticSubtopicHierarchy(filters.selectedUnits, unitFilteredQuestions, activeSubject, Boolean(filters.primarySubtopicsOnly));
  }, [unitFilteredQuestions, filters.selectedUnits, activeSubject, filters.primarySubtopicsOnly]);

  // Filter the question pool
  const filteredPool = useMemo(() => {
    return questions
      .filter((q) => {
        // Unit filter
        if (filters.selectedUnits.length > 0) {
          const matchesUnit = filters.selectedUnits.some((fu) => {
            return doesQuestionMatchUnit(q, fu);
    
    

          });
          if (!matchesUnit) return false;
        }

        // Subtopics filter
        if (filters.selectedSubtopics.length > 0) {
          const qSubs = getQuestionValidSubtopics(q, !filters.primarySubtopicsOnly);
          const hasMatch = qSubs.some((s) => s && filters.selectedSubtopics.includes(s));
          if (!hasMatch) return false;
        }

        // Year filter
        if (filters.selectedYears.length > 0 && !filters.selectedYears.includes(String(q.year))) {
          return false;
        }

        // Series filter
        if (filters.selectedSeries.length > 0) {
          const qSession = (q.session || '').toLowerCase();
          const qSeries = (q.series || '').toLowerCase();
          const matchesSeries = filters.selectedSeries.some((s) => {
            const target = s.toLowerCase();
            if (target === 'january') {
              return qSession.includes('jan') || qSeries.includes('jan');
            }
            if (target === 'may/june') {
              return (
                qSession.includes('june') ||
                qSession.includes('may') ||
                qSeries.includes('june') ||
                qSeries.includes('may')
              );
            }
            if (target === 'october') {
              return (
                qSession.includes('oct') ||
                qSession.includes('nov') ||
                qSeries.includes('oct') ||
                qSeries.includes('nov')
              );
            }
            return qSeries.includes(target) || qSession.includes(target);
          });
          if (!matchesSeries) return false;
        }

        // Question Type filter
        if (filters.questionType !== 'all') {
          const qType = getQuestionType(q);
          if (qType !== filters.questionType) return false;
        }

        // Marks filter
        if (marksFilter !== 'all') {
          const marks = q.marks || 0;
          if (isMath) {
            if (marksFilter === '1-4m' && (marks < 1 || marks > 4)) return false;
            if (marksFilter === '5-7m' && (marks < 5 || marks > 7)) return false;
            if (marksFilter === '8-10m' && (marks < 8 || marks > 10)) return false;
            if (marksFilter === '11m+' && marks < 11) return false;
          } else {
            if (marksFilter === '1m' && marks !== 1) return false;
            if (marksFilter === '2-3m' && (marks < 2 || marks > 3)) return false;
            if (marksFilter === '4-5m' && (marks < 4 || marks > 5)) return false;
            if ((marksFilter === '6m' || marksFilter === '6m+') && marks < 6) return false;
          }
        }

        // Search query
        if (filters.searchQuery.trim()) {
          const query = filters.searchQuery.toLowerCase();
          const matchQNum = q.questionNumber.toLowerCase().includes(query);
          const matchTopic = (q.topic || '').toLowerCase().includes(query);
          const matchSubtopic = (q.subtopic || '').toLowerCase().includes(query);
          const matchSubs = (q.subtopics || []).some((s) => s.toLowerCase().includes(query));
          const matchStem = (q.stemSummary || '').toLowerCase().includes(query);
          const matchSeries = (q.series || '').toLowerCase().includes(query);
          const matchSession = (q.session || '').toLowerCase().includes(query);
          const matchPaper = (q.paperCode || q.paper_code || q.unitCode || '')
            .toLowerCase()
            .includes(query);
          if (
            !matchQNum &&
            !matchTopic &&
            !matchSubtopic &&
            !matchSubs &&
            !matchStem &&
            !matchSeries &&
            !matchSession &&
            !matchPaper
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.selectedSubtopics && filters.selectedSubtopics.length > 0) {
          const aPrimary = isPrimarySubtopicMatch(a, filters.selectedSubtopics);
          const bPrimary = isPrimarySubtopicMatch(b, filters.selectedSubtopics);
          if (aPrimary && !bPrimary) return -1;
          if (!aPrimary && bPrimary) return 1;
        }
        return sortQuestionsLatestFirst(a, b);
      });
  }, [questions, filters, marksFilter, isMath]);

  const totalPages = Math.max(1, Math.ceil(filteredPool.length / PAGE_SIZE));
  const pagedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPool.slice(start, start + PAGE_SIZE);
  }, [filteredPool, currentPage]);

  // Set active preview question default to first filtered question if none selected
  useEffect(() => {
    if (!previewQuestionId && filteredPool.length > 0) {
      setPreviewQuestionId(filteredPool[0].id);
    }
  }, [filteredPool, previewQuestionId]);

  const activePreviewQuestion = useMemo(() => {
    if (!previewQuestionId) return null;
    return questions.find((q) => q.id === previewQuestionId) || null;
  }, [questions, previewQuestionId]);

  // Current question index in filteredPool for keyboard navigation
  const currentFilteredIndex = useMemo(() => {
    if (!previewQuestionId) return -1;
    return filteredPool.findIndex((q) => q.id === previewQuestionId);
  }, [filteredPool, previewQuestionId]);

  const goToNextQuestion = () => {
    if (filteredPool.length === 0) return;
    const nextIdx = currentFilteredIndex < filteredPool.length - 1 ? currentFilteredIndex + 1 : 0;
    const nextQ = filteredPool[nextIdx];
    if (nextQ) {
      setPreviewQuestionId(nextQ.id);
      const targetPage = Math.floor(nextIdx / PAGE_SIZE) + 1;
      if (targetPage !== currentPage) setCurrentPage(targetPage);
    }
  };

  const goToPrevQuestion = () => {
    if (filteredPool.length === 0) return;
    const prevIdx = currentFilteredIndex > 0 ? currentFilteredIndex - 1 : filteredPool.length - 1;
    const prevQ = filteredPool[prevIdx];
    if (prevQ) {
      setPreviewQuestionId(prevQ.id);
      const targetPage = Math.floor(prevIdx / PAGE_SIZE) + 1;
      if (targetPage !== currentPage) setCurrentPage(targetPage);
    }
  };

  const handleToggleCartActive = () => {
    if (!activePreviewQuestion) return;
    if (cartQuestionIds.includes(activePreviewQuestion.id)) {
      pushCartUndoState(cartQuestionIds);
      onRemoveFromCart(activePreviewQuestion.id);
    } else {
      onAddToCart(activePreviewQuestion.id);
    }
  };

  // Global Keyboard Navigation in Test Maker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toUpperCase();
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        tagName === 'BUTTON' ||
        target?.getAttribute('role') === 'checkbox' ||
        target?.closest('button, select, input, textarea, [role="checkbox"]') ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape') {
        setIsPresetsModalOpen(false);
        return;
      }

      if (isPresetsModalOpen || isSittingModalOpen || document.querySelector('[role="dialog"], [aria-modal="true"]')) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        goToNextQuestion();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        goToPrevQuestion();
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setPreviewTab((prev) => (prev === 'split' ? 'question' : 'split'));
        return;
      }

      if (e.key === 'Enter' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleToggleCartActive();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPresetsModalOpen,
    isSittingModalOpen,
    filteredPool,
    currentFilteredIndex,
    currentPage,
    activePreviewQuestion,
    cartQuestionIds,
  ]);

  // Full Cart Question objects preserving cart question ID order
  const cartQuestions = useMemo(() => {
    const qMap = new Map<string, QuestionItem>();
    questions.forEach((q) => qMap.set(q.id, q));
    return cartQuestionIds
      .map((id) => qMap.get(id))
      .filter((q): q is QuestionItem => q !== undefined);
  }, [questions, cartQuestionIds]);

  const totalCartMarks = useMemo(() => {
    return cartQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }, [cartQuestions]);

  // Estimated standard duration
  const targetTimeMinutes = useMemo(() => {
    return calculateExamDurationMinutes(totalCartMarks, activeSubject === 'physics', filters.selectedUnits);
  }, [totalCartMarks, activeSubject, filters.selectedUnits]);

  // 1-Click Official Edexcel Preset Selection Handler
  const handleApplyPreset = (preset: MockExamPreset) => {
    setSelectedPresetId(preset.id);
    setTargetMarks(preset.targetMarks);
    onSetTestTitle(`${preset.label} Mock`);

    const structure: ExamStructure = preset.isMcqOnly
      ? 'mcq_sprint'
      : isMath || preset.tier === 'Practical'
      ? 'theory_only'
      : 'authentic';
    setExamStructure(structure);

    // Filter pool to the preset's unit component if not a multi-unit MCQ sprint
    const isMultiUnitSprint = preset.isMcqOnly || preset.unit === 'all';
    const unitPool = isMultiUnitSprint
      ? questions
      : questions.filter(
          (q) =>
            q.unitCode?.toUpperCase() === preset.unitCode.toUpperCase() ||
            q.unit?.toUpperCase().includes(preset.unitCode.toUpperCase()) ||
            (preset.unitCode.startsWith('WCH1') &&
              q.unit?.startsWith(`Unit ${preset.unitCode.slice(-1)}`)) ||
            (preset.unitCode.startsWith('WPH1') &&
              q.unit?.startsWith(`Unit ${preset.unitCode.slice(-1)}`))
        );

    const poolToUse = unitPool.length > 0 ? unitPool : questions;

    const { selected, actualMarks, relaxedConstraints } = autoGenerateExam(poolToUse, {
      subject: activeSubject,
      targetMarks: preset.targetMarks,
      questionCount: preset.questionCount,
      mode: 'balanced',
      structure,
      isMcqOnly: preset.isMcqOnly,
      questionStatuses,
      bookmarks,
    });

    if (selected.length > 0) {
      if (cartQuestionIds.length > 0) {
        pushCartUndoState(cartQuestionIds);
      }
      const newIds = selected.map((q) => q.id);
      onReorderCart(newIds);
      setPreviewQuestionId(newIds[0]);
      setLastGeneratedInfo(`${selected.length} Qs • ${actualMarks}m`);
      if (relaxedConstraints.length > 0 || actualMarks !== preset.targetMarks) {
        const reasonText =
          relaxedConstraints.length > 0
            ? `Relaxed constraints: ${relaxedConstraints.join(', ')}`
            : `Closest valid total: ${actualMarks}m / ${preset.targetMarks}m`;
        showGeneratorWarning(reasonText);
      }
    } else {
      showGeneratorWarning('No questions matched constraints for this preset.');
    }
  };

  // Progressive Fill Remaining Handler: Appends questions to cart up to targetMarks
  const handleFillRemaining = () => {
    const neededMarks = targetMarks - totalCartMarks;
    if (neededMarks <= 0) return;

    const hasActiveFilters =
      filters.selectedUnits.length > 0 ||
      filters.selectedSubtopics.length > 0 ||
      filters.selectedYears.length > 0 ||
      filters.selectedSeries.length > 0 ||
      filters.questionType !== 'all' ||
      marksFilter !== 'all' ||
      Boolean(filters.searchQuery.trim());

    if (hasActiveFilters && filteredPool.length === 0) {
      showGeneratorWarning('No questions match your current filters. Please adjust your filters before generating.');
      return;
    }

    const basePool = (filteredPool.length > 0 ? filteredPool : questions).filter(
      (q) => !cartQuestionIds.includes(q.id)
    );

    if (basePool.length === 0) {
      showGeneratorWarning('No remaining questions match your active filters.');
      return;
    }

    const { selected, actualMarks, relaxedConstraints } = autoGenerateExam(basePool, {
      subject: activeSubject,
      targetMarks: neededMarks,
      mode: generateMode,
      structure: examStructure,
      selectedUnits: filters.selectedUnits,
      selectedSubtopics: filters.selectedSubtopics,
      primarySubtopicsOnly: Boolean(filters.primarySubtopicsOnly),
      questionStatuses,
      bookmarks,
    });

    if (selected.length === 0) {
      showGeneratorWarning('Could not match remaining questions.');
      return;
    }

    const newIds = [...cartQuestionIds, ...selected.map((q) => q.id)];
    onReorderCart(newIds);
    if (!previewQuestionId && selected.length > 0) {
      setPreviewQuestionId(selected[0].id);
    }
    setLastGeneratedInfo(`+${selected.length} Qs • +${actualMarks}m added`);
    if (relaxedConstraints.length > 0 || actualMarks !== neededMarks) {
      const reasonText =
        relaxedConstraints.length > 0
          ? `Relaxed constraints: ${relaxedConstraints.join(', ')}`
          : `Added closest valid total (+${actualMarks}m / +${neededMarks}m).`;
      showGeneratorWarning(reasonText);
    }
  };

  const handleSmartGenerate = () => {
    const hasActiveFilters =
      filters.selectedUnits.length > 0 ||
      filters.selectedSubtopics.length > 0 ||
      filters.selectedYears.length > 0 ||
      filters.selectedSeries.length > 0 ||
      filters.questionType !== 'all' ||
      marksFilter !== 'all' ||
      Boolean(filters.searchQuery.trim());

    if (hasActiveFilters && filteredPool.length === 0) {
      showGeneratorWarning('No questions match your current filters. Please adjust your filters before generating.');
      return;
    }
    const pool = filteredPool.length > 0 ? filteredPool : questions;
    if (pool.length === 0) {
      showGeneratorWarning('No questions available in the current filter pool.');
      return;
    }
    const { selected, actualMarks, relaxedConstraints } = autoGenerateExam(pool, {
      subject: activeSubject,
      targetMarks,
      mode: generateMode,
      structure: examStructure,
      selectedUnits: filters.selectedUnits,
      selectedSubtopics: filters.selectedSubtopics,
      primarySubtopicsOnly: Boolean(filters.primarySubtopicsOnly),
      questionStatuses,
      bookmarks,
    });
    if (selected.length === 0) {
      showGeneratorWarning('Could not match questions to target marks.');
      return;
    }
    if (cartQuestionIds.length > 0) {
      pushCartUndoState(cartQuestionIds);
    }
    const newIds = selected.map((q) => q.id);
    onReorderCart(newIds);
    setPreviewQuestionId(newIds[0]);
    const unitDescriptor =
      filters.selectedUnits.length > 0 ? filters.selectedUnits.join(' & ') : 'Complete Specification';
    onSetTestTitle(`${unitDescriptor} Mock Exam (${actualMarks}m)`);
    setLastGeneratedInfo(`${selected.length} Qs • ${actualMarks}m`);
    if (relaxedConstraints.length > 0 || actualMarks !== targetMarks) {
      const reasonText =
        relaxedConstraints.length > 0
          ? `Relaxed constraints: ${relaxedConstraints.join(', ')}`
          : `Closest valid total (${actualMarks}m / ${targetMarks}m).`;
      showGeneratorWarning(reasonText);
    }
  };

  const handleClearCartWithUndo = () => {
    if (cartQuestionIds.length === 0) return;
    pushCartUndoState(cartQuestionIds);
    onClearCart();
  };

  const handleRemoveFromCartWithUndo = (id: string) => {
    pushCartUndoState(cartQuestionIds);
    onRemoveFromCart(id);
  };

  const handleShuffleCart = () => {
    if (cartQuestionIds.length <= 1) return;
    onReorderCart(fisherYatesShuffle(cartQuestionIds));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newIds = [...cartQuestionIds];
    const temp = newIds[index - 1];
    newIds[index - 1] = newIds[index];
    newIds[index] = temp;
    onReorderCart(newIds);
  };

  const handleMoveDown = (index: number) => {
    if (index >= cartQuestionIds.length - 1) return;
    const newIds = [...cartQuestionIds];
    const temp = newIds[index + 1];
    newIds[index + 1] = newIds[index];
    newIds[index] = temp;
    onReorderCart(newIds);
  };

  // Native HTML5 Drag-and-Drop Reordering Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedIndexRef.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {
      // Ignore browser-specific setData restrictions
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = draggedIndexRef.current;
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (fromIndex === null || fromIndex === dropIndex) return;

    const newIds = [...cartQuestionIds];
    const [movedId] = newIds.splice(fromIndex, 1);
    newIds.splice(dropIndex, 0, movedId);
    onReorderCart(newIds);
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // PDF Export Handlers
  const handleExportQP = async () => {
    if (cartQuestions.length === 0) return;
    setIsExportingQP(true);
    setExportStatus('Generating Question Paper PDF...');
    try {
      const defaultTitle = isMath
        ? 'Custom Mathematics Mock Exam'
        : questions.some((q) => q.unitCode?.startsWith('WPH'))
        ? 'Custom Physics Mock Exam'
        : 'Custom Chemistry Mock Exam';

      const { generateQuestionPaperPDF } = await import('../utils/pdfGenerator');
      await generateQuestionPaperPDF({
        title: testTitle || defaultTitle,
        questions: cartQuestions,
        includeFormalHeader,
        includeSourceTags,
        includeHeaderFooter,
        onProgress: (_cur, _tot, text) => setExportStatus(text),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate Question Paper PDF. Check console for details.');
    } finally {
      setIsExportingQP(false);
      setExportStatus('');
    }
  };

  const handleExportMS = async () => {
    if (cartQuestions.length === 0) return;
    setIsExportingMS(true);
    setExportStatus('Generating Mark Scheme PDF...');
    try {
      const defaultTitle = isMath
        ? 'Custom Mathematics Mock Exam'
        : questions.some((q) => q.unitCode?.startsWith('WPH'))
        ? 'Custom Physics Mock Exam'
        : 'Custom Chemistry Mock Exam';

      const { generateMarkSchemePDF } = await import('../utils/pdfGenerator');
      await generateMarkSchemePDF({
        title: testTitle || defaultTitle,
        questions: cartQuestions,
        includeFormalHeader,
        includeSourceTags,
        includeHeaderFooter,
        onProgress: (_cur, _tot, text) => setExportStatus(text),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate Mark Scheme PDF. Check console for details.');
    } finally {
      setIsExportingMS(false);
      setExportStatus('');
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-dark-950 text-slate-800 dark:text-slate-100 select-none relative transition-colors">
      {/* ===================================================================== */}
      {/* MOBILE/TABLET TOP TAB BAR: [ Pool ] | [ Preview ] | [ Cart ] (< 1024px) */}
      {/* ===================================================================== */}
      <div className="flex lg:hidden items-center justify-center p-2 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-800 shrink-0">
        <div className="grid grid-cols-3 w-full max-w-lg bg-slate-100 dark:bg-dark-850 p-1 rounded-xl border border-slate-200 dark:border-dark-750 gap-1">
          <button
            type="button"
            onClick={() => setMobileTab('pool')}
            className={`min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all px-2 ${
              mobileTab === 'pool'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pool ({filteredPool.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all px-2 ${
              mobileTab === 'preview'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Preview {activePreviewQuestion ? `(Q${activePreviewQuestion.questionNumber})` : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all px-2 ${
              mobileTab === 'cart'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Cart ({cartQuestionIds.length} · {totalCartMarks}m)
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEFT COLUMN: Search & Filter Drawer + Question Pool                      */}
      {/* ========================================================================= */}
      <aside
        className={`
          border-r border-slate-200 dark:border-dark-800 bg-white/95 lg:bg-slate-50/70 dark:bg-dark-900/80 flex flex-col shrink-0 overflow-hidden
          w-full lg:w-[340px] lg:min-w-[320px] xl:w-[360px]
          ${mobileTab === 'pool' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'}
        `}
      >
        {/* Filter Controls Header */}
        <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 space-y-2.5 relative z-30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Question Search
            </span>
            <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
              {filteredPool.length} found
            </span>
          </div>

          {/* Row 1: Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search topic, question, or year..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Row 2: Unit (40%) & Subtopics (60%) Selectors */}
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2 min-w-0">
              <FilterMultiSelect
                labelSingular="Unit"
                labelPlural="Units"
                icon={<Layers className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                options={unitOptions}
                selectedValues={filters.selectedUnits}
                onChange={(units) => {
                  setFilters((prev) => ({ ...prev, selectedUnits: units }));
                  setCurrentPage(1);
                }}
                fullWidth
              />
            </div>

            <div className="col-span-3 min-w-0">
              <SubtopicMultiSelect
                hierarchy={subtopicHierarchy}
                selectedSubtopics={filters.selectedSubtopics}
                onChange={(subs) => {
                  setFilters((prev) => ({ ...prev, selectedSubtopics: subs }));
                  setCurrentPage(1);
                }}
                primaryOnly={Boolean(filters.primarySubtopicsOnly)}
                onTogglePrimaryOnly={() => {
                  setFilters((prev) => ({
                    ...prev,
                    primarySubtopicsOnly: !prev.primarySubtopicsOnly,
                  }));
                  setCurrentPage(1);
                }}
                activeSubject={activeSubject}
                questions={unitFilteredQuestions}
                fullWidth
                align="right"
              />
            </div>
          </div>

          {/* Row 3: Year (50%) & Series (50%) Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <FilterMultiSelect
              labelSingular="Year"
              labelPlural="Years"
              icon={<Calendar className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />}
              options={yearOptions}
              selectedValues={filters.selectedYears}
              onChange={(years) => {
                setFilters((prev) => ({ ...prev, selectedYears: years }));
                setCurrentPage(1);
              }}
              badgeFontMono
              fullWidth
            />

            <FilterMultiSelect
              labelSingular="Series"
              labelPlural="Series"
              icon={<Calendar className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />}
              options={seriesOptions}
              selectedValues={filters.selectedSeries}
              onChange={(series) => {
                setFilters((prev) => ({ ...prev, selectedSeries: series }));
                setCurrentPage(1);
              }}
              showSearch={false}
              fullWidth
              align="right"
            />
          </div>

          {/* Row 4: Dedicated Question Type & Marks Filter Rows */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-dark-800/80">
            {/* Line A: Question Type Segmented Switch & Reset */}
            <div className="flex items-center justify-between gap-2">
              {!isMath && (
                <div className="grid grid-cols-3 bg-slate-100 dark:bg-dark-800 p-0.5 rounded-lg text-xs font-medium flex-1">
                  {(['all', 'mcq', 'theory'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, questionType: t }));
                        setCurrentPage(1);
                      }}
                      className={`py-1 rounded-md capitalize text-center text-xs transition-all ${
                        filters.questionType === t
                          ? 'bg-cyan-600 text-white font-bold shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* Reset Filters */}
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setFilters({
                    selectedUnits: [],
                    selectedSubtopics: [],
                    selectedYears: [],
                    selectedSeries: [],
                    searchQuery: '',
                    statusFilter: 'all',
                    questionType: 'all',
                    bookmarkedOnly: false,
                  });
                  setMarksFilter('all');
                  setCurrentPage(1);
                }}
                title="Reset Search Filters"
                className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0 ${
                  isMath ? 'ml-auto' : ''
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Line B: Marks Filter Pills Evenly Spaced */}
            <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-dark-800 p-0.5 rounded-lg text-xs">
              {(isMath
                ? (['all', '1-4m', '5-7m', '8-10m', '11m+'] as const)
                : (['all', '1m', '2-3m', '4-5m', '6m+'] as const)
              ).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMarksFilter(m);
                    setCurrentPage(1);
                  }}
                  className={`py-1 rounded-md text-center text-xs font-medium transition-all ${
                    marksFilter === m
                      ? 'bg-cyan-600 dark:bg-cyan-500 text-white font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {m === 'all' ? 'All m' : m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filtered Questions List */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 pb-20 lg:pb-2">
          {pagedQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
              <p className="text-xs">No matching questions found.</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1">
                Try relaxing your search or unit filters.
              </p>
            </div>
          ) : (
            pagedQuestions.map((q) => {
              const isSelected = previewQuestionId === q.id;
              const isInCart = cartQuestionIds.includes(q.id);
              const qType = getQuestionType(q);
              const qSubject = getQuestionSubject(q);

              return (
                <div
                  key={q.id}
                  onPointerMove={handleSpotlightMove}
                  onPointerLeave={handleSpotlightLeave}
                  style={getSubjectSpotlightStyle(qSubject, 280)}
                  onClick={() => {
                    setPreviewQuestionId(q.id);
                  }}
                  className={`spotlight-surface min-w-0 overflow-hidden p-3 rounded-xl cursor-pointer transition-all border-y border-r border-l-4 ${
                    isSelected
                      ? 'bg-cyan-50/70 dark:bg-[#0D131F] border-y-cyan-400/70 border-r-cyan-400/70 dark:border-y-cyan-500/40 dark:border-r-cyan-500/40 border-l-cyan-500 dark:border-l-cyan-400 shadow-sm dark:shadow-[0_4px_20px_rgba(6,182,212,0.12),inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                      : isInCart
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border-y-emerald-200/80 border-r-emerald-200/80 dark:border-y-emerald-500/20 dark:border-r-emerald-500/20 border-l-emerald-500 dark:border-l-emerald-400'
                      : 'bg-white dark:bg-[#0B0E16]/75 hover:bg-slate-50 dark:hover:bg-white/[0.03] border-y-slate-200/80 border-r-slate-200/80 dark:border-y-white/[0.06] dark:border-r-white/[0.06] border-l-transparent hover:border-y-slate-300 hover:border-r-slate-300 dark:hover:border-y-white/12 dark:hover:border-r-white/12 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono tabular-nums font-bold text-xs text-cyan-700 dark:text-cyan-300">
                        Q{q.questionNumber}
                      </span>
                      <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25">
                        {q.marks}m
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {q.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Mobile/Tablet Preview Switch button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewQuestionId(q.id);
                          setMobileTab('preview');
                        }}
                        className="lg:hidden px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-dark-750 dark:hover:bg-dark-700 text-cyan-700 dark:text-cyan-300 text-[10px] font-semibold border border-slate-200 dark:border-dark-700"
                        title="View Diagram"
                      >
                        Inspect
                      </button>

                      {/* Quick Add / Remove Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isInCart) {
                            handleRemoveFromCartWithUndo(q.id);
                          } else {
                            onAddToCart(q.id);
                          }
                        }}
                        title={isInCart ? 'Remove from test' : 'Add to test'}
                        className={`flex items-center justify-center gap-1 min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                          isInCart
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]'
                            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-gradient-to-b hover:from-cyan-500 hover:to-cyan-600 hover:text-white hover:border-cyan-400/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                        }`}
                      >
                        {isInCart ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="relative z-10 text-[11px] text-slate-800 dark:text-slate-300 truncate font-medium">
                    {q.mainSubtopic || q.subtopic || q.topic}
                  </p>
                  <p className="relative z-10 text-[10px] text-slate-500 mt-0.5 truncate tabular-nums">
                    {q.series && q.year && q.series.includes(String(q.year))
                      ? q.series
                      : `${q.series || q.session} ${q.year}`}{' '}
                    • {qType === 'mcq' ? 'Section A' : 'Theory'}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="h-10 px-3 border-t border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex items-center justify-between shrink-0 text-xs text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dark-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dark-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* CENTER COLUMN: Live Question & Mark Scheme Preview Pane                  */}
      {/* ========================================================================= */}
      <main
        className={`
          flex-1 min-h-0 min-w-0 flex flex-col h-full bg-slate-100/50 dark:bg-dark-950 overflow-hidden border-r border-slate-200 dark:border-dark-800
          w-full
          ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}
        `}
      >
        {/* Preview Header Bar */}
        <div className="h-14 px-3 sm:px-5 border-b border-slate-200 dark:border-dark-800 bg-white/90 dark:bg-dark-900/90 flex items-center justify-between shrink-0 gap-2 min-w-0">
          {activePreviewQuestion ? (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
              {/* Back to Pool Button on Mobile/Tablet (< 1024px) */}
              <button
                type="button"
                onClick={() => setMobileTab('pool')}
                className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-xs font-semibold text-cyan-700 dark:text-cyan-300 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Pool</span>
              </button>

              {/* Prev / Next question navigation with [← / →] hotkey hint */}
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={goToPrevQuestion}
                  disabled={filteredPool.length <= 1}
                  title="Previous question (←, ↑, J)"
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-700 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  disabled={filteredPool.length <= 1}
                  title="Next question (→, ↓, K)"
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-700 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="font-mono font-bold text-sm text-cyan-700 dark:text-cyan-300 shrink-0">
                Q{activePreviewQuestion.questionNumber}
              </span>
              <span className="text-slate-300 dark:text-dark-600 hidden sm:inline">•</span>
              <div className="flex items-center gap-2 text-xs min-w-0 overflow-hidden">
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                  {activePreviewQuestion.marks}m
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate hidden sm:inline">
                  {activePreviewQuestion.unit} /{' '}
                  {activePreviewQuestion.mainSubtopic || activePreviewQuestion.subtopic || activePreviewQuestion.topic}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              No question selected for preview
            </span>
          )}

          {/* Preview Controls & Add/Remove Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* View Mode Toggle: Question / Split / MS */}
            <div className="flex items-center bg-slate-100 dark:bg-dark-850 p-0.5 rounded-lg border border-slate-200 dark:border-dark-750 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab('question')}
                className={`px-2 py-1 rounded transition-all font-medium ${
                  previewTab === 'question'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Question
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('split')}
                title="Split View — stacks vertically on narrow screens, side-by-side on wide screens (Space)"
                className={`px-2.5 py-1 rounded transition-all font-medium ${
                  previewTab === 'split'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('ms')}
                className={`px-2 py-1 rounded transition-all font-medium ${
                  previewTab === 'ms'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Answers
              </button>
            </div>

            {/* Primary Add/Remove from Test Cart Button */}
            {activePreviewQuestion && (
              <button
                type="button"
                onClick={handleToggleCartActive}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all ${
                  cartQuestionIds.includes(activePreviewQuestion.id)
                    ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 hover:bg-rose-100 dark:hover:bg-rose-500/30'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400/40 hover:brightness-110 shadow-cyan-900/10 dark:shadow-cyan-950/40'
                }`}
              >
                {cartQuestionIds.includes(activePreviewQuestion.id) ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Test</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Preview Canvas Workspace */}
        <div
          className={`flex-1 min-h-0 min-w-0 relative ${
            previewTab === 'split'
              ? 'flex flex-col 2xl:grid 2xl:grid-cols-2 overflow-y-auto 2xl:overflow-hidden pb-16 lg:pb-0'
              : 'flex flex-col overflow-hidden pb-16 lg:pb-0'
          }`}
        >
          {activePreviewQuestion ? (
            <>
              {(previewTab === 'question' || previewTab === 'split') && (
                <div
                  className={`flex flex-col min-w-0 ${
                    previewTab === 'split'
                      ? 'min-h-[420px] flex-1 2xl:min-h-0 2xl:h-full overflow-hidden border-b 2xl:border-b-0 2xl:border-r border-slate-200 dark:border-dark-800'
                      : 'flex-1 h-full overflow-hidden'
                  }`}
                >
                  <ImageCanvas
                    src={resolveQuestionImageUrl(activePreviewQuestion)}
                    title={`Question ${activePreviewQuestion.questionNumber}`}
                    badgeText={`${activePreviewQuestion.marks}m`}
                    badgeColor="cyan"
                    activeSubject={activeSubject}
                    placeholderTitle="Question crop missing"
                    enableAnnotation={true}
                    questionId={activePreviewQuestion.id}
                  />
                </div>
              )}

              {(previewTab === 'ms' || previewTab === 'split') && (
                <div
                  className={`flex flex-col min-w-0 ${
                    previewTab === 'split'
                      ? 'min-h-[420px] flex-1 2xl:min-h-0 2xl:h-full overflow-hidden'
                      : 'flex-1 h-full overflow-hidden'
                  }`}
                >
                  <ImageCanvas
                    src={resolveMarkSchemeImageUrl(activePreviewQuestion)}
                    title={`Official Mark Scheme: Q${activePreviewQuestion.questionNumber}`}
                    badgeText="Answers"
                    badgeColor="emerald"
                    activeSubject={activeSubject}
                    placeholderTitle="Mark Scheme not indexed"
                    placeholderMessage="Official mark scheme slice not found for this item."
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
              Select any question on the left to preview.
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FLOATING EXAM CART BADGE BUTTON (1024px - 1279px)                         */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-40 hidden lg:block xl:hidden">
        <button
          type="button"
          onClick={() => setIsCartDrawerOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-2xl shadow-cyan-950/40 border border-cyan-400/40 hover:scale-105 active:scale-95 transition-all select-none"
          title="Open Exam Cart"
        >
          <FileText className="w-4 h-4 text-cyan-200" />
          <span>Exam Cart ({cartQuestionIds.length})</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-dark-950 font-bold font-mono text-[11px]">
            {totalCartMarks}m
          </span>
        </button>
      </div>

      {/* Tablet/Laptop Backdrop for Cart Drawer (1024px - 1279px) */}
      {isCartDrawerOpen && mobileTab !== 'cart' && (
        <div
          className="fixed inset-0 z-40 bg-black/60 dark:bg-black/70 backdrop-blur-sm hidden lg:block xl:hidden animate-in fade-in duration-150"
          onClick={() => setIsCartDrawerOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Exam Paper Cart & PDF Builder Panel                         */}
      {/* ========================================================================= */}
      <aside
        className={`
          bg-white dark:bg-dark-900 flex flex-col shrink-0 overflow-hidden transition-transform duration-200
          ${
            mobileTab === 'cart'
              ? 'flex flex-1 w-full relative z-20'
              : isCartDrawerOpen
              ? 'fixed inset-y-0 right-0 z-50 flex w-full sm:w-[26rem] border-l border-slate-200 dark:border-dark-750 shadow-2xl translate-x-0'
              : 'fixed inset-y-0 right-0 z-50 hidden w-full sm:w-[26rem] translate-x-full'
          }
          xl:static xl:flex xl:w-80 2xl:w-96 xl:z-auto xl:border-l xl:border-slate-200 xl:dark:border-dark-800 xl:shadow-none xl:translate-x-0
        `}
      >
        {/* Cart Header */}
        <div className="p-3 border-b border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-850 space-y-2 shrink-0 max-h-[52%] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Custom Exam Cart
            </h3>
            <div className="flex items-center gap-2">
              {cartQuestionIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleShuffleCart}
                    title="Shuffle questions order"
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCartWithUndo}
                    className="text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
                    title="Remove all questions"
                  >
                    Clear All
                  </button>
                </>
              )}
              {/* Close Button on Mobile/Tablet/Small Laptop (< 1280px) */}
              <button
                type="button"
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  if (mobileTab === 'cart') {
                    setMobileTab('preview');
                  }
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-800 xl:hidden transition-colors"
                title="Close Exam Cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Test Title Input */}
          <div>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => onSetTestTitle(e.target.value)}
              placeholder="Exam Title (e.g. Unit 4 Kinetics & Equilibria Test)"
              aria-label="Exam Title"
              className="w-full bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Unified Monochrome Metallic Telemetry Console Ribbon */}
          <div
            onPointerMove={handleSpotlightMove}
            onPointerLeave={handleSpotlightLeave}
            style={getSubjectSpotlightStyle(subject, 300)}
            className="spotlight-surface rounded-xl bg-white dark:bg-[#0B0F19]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden"
          >
            <div className="relative z-10 grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-white/[0.06]">
              <div className="py-1.5 px-2 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Questions
                  </span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                  {cartQuestions.length}
                </div>
              </div>

              <div className="py-1.5 px-2 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Marks
                  </span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                  {totalCartMarks}
                </div>
              </div>

              <div className="py-1.5 px-2 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Est. Time
                  </span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                  {formatDuration(targetTimeMinutes)}
                </div>
              </div>
            </div>
          </div>

          {/* Smart Auto-Generate Mock Exam Panel */}
          <SpotlightCard
            spotlightColor="rgba(245, 158, 11, 0.11)"
            borderGlowColor="rgba(251, 191, 36, 0.45)"
            spotlightSize={360}
            className="rounded-xl bg-white dark:bg-[#0D111C]/90 p-2.5 transition-all border border-amber-500/30 dark:border-amber-500/25 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          >
            {/* Top Specular Laser Line */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"
            />
            <button
              type="button"
              onClick={() => setIsSmartGenerateOpen(!isSmartGenerateOpen)}
              className="w-full flex items-center justify-between text-left focus:outline-none"
            >
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-sm">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  Smart Auto-Generate
                </span>
                {lastGeneratedInfo && (
                  <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                    {lastGeneratedInfo}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isSmartGenerateOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSmartGenerateOpen && (
              <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                {/* Target Marks Presets */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                    <span>Target Paper Marks</span>
                    <span className="font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                      {targetMarks} marks
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(isMath
                      ? [
                          { marks: 25, label: '25m', desc: 'Mini Quiz' },
                          { marks: 40, label: '40m', desc: 'Half Paper' },
                          { marks: 75, label: '75m', desc: 'Full Paper' },
                          { marks: 100, label: '100m', desc: 'Extended' },
                        ]
                      : [
                          { marks: 25, label: '25m', desc: 'Mini Quiz' },
                          { marks: 50, label: '50m', desc: 'Unit 3/6' },
                          { marks: 80, label: '80m', desc: 'AS Paper' },
                          { marks: 90, label: '90m', desc: 'IA2 Paper' },
                        ]
                    ).map((preset) => (
                      <button
                        key={preset.marks}
                        type="button"
                        onClick={() => setTargetMarks(preset.marks)}
                        className={`py-1.5 px-1 rounded-xl text-center transition-all border duration-150 active:scale-[0.98] ${
                          targetMarks === preset.marks
                            ? 'bg-amber-600 text-white font-bold border-amber-500 shadow-md shadow-amber-600/30 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]'
                            : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] hover:border-slate-300 dark:hover:border-white/15'
                        }`}
                      >
                        <div className="text-[11px] font-mono tabular-nums font-bold leading-tight">
                          {preset.label}
                        </div>
                        <div
                          className={`text-[8.5px] leading-tight truncate mt-0.5 ${
                            targetMarks === preset.marks
                              ? 'text-amber-100'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {preset.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exam Structure Selector (Chemistry & Physics only) */}
                {!isMath && (
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                      <span>Exam Structure</span>
                      <span className="text-[9px] text-slate-400">
                        {examStructure === 'authentic'
                          ? 'Section A + B/C'
                          : examStructure === 'theory_only'
                          ? '0 MCQs'
                          : '100% MCQs'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'authentic', label: 'Authentic Mix' },
                          { id: 'theory_only', label: 'Theory Only' },
                          { id: 'mcq_sprint', label: 'MCQ Sprint' },
                        ] as const
                      ).map((struct) => (
                        <button
                          key={struct.id}
                          type="button"
                          onClick={() => setExamStructure(struct.id)}
                          className={`py-1 px-1 text-[10px] rounded text-center font-medium transition-all border ${
                            examStructure === struct.id
                              ? 'bg-amber-500 text-white font-semibold border-amber-600 shadow-sm'
                              : 'bg-white/80 dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-750 hover:bg-amber-50 dark:hover:bg-dark-750'
                          }`}
                        >
                          {struct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selection Modes */}
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                    Selection Mode
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'balanced', label: 'Balanced Mix' },
                        { id: 'review_first', label: 'Review First' },
                        { id: 'unattempted_only', label: 'Unattempted' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setGenerateMode(mode.id)}
                        className={`py-1 px-1 text-[10px] rounded text-center font-medium transition-all border ${
                          generateMode === mode.id
                            ? 'bg-cyan-500 text-white font-semibold border-cyan-600 shadow-sm'
                            : 'bg-white/80 dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-750 hover:bg-cyan-50 dark:hover:bg-dark-750'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions: Fill Remaining / Generate & Reshuffle + Official Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={
                      totalCartMarks < targetMarks && totalCartMarks > 0
                        ? handleFillRemaining
                        : handleSmartGenerate
                    }
                    className="group/gen flex-1 py-2 px-3 rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-400/50 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.45),inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-all active:scale-[0.98]"
                  >
                    {totalCartMarks < targetMarks && totalCartMarks > 0 ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>Fill Remaining ({targetMarks - totalCartMarks}m)</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current transition-transform duration-200 group-hover/gen:scale-110" />
                        <span>Generate Test ({targetMarks}m)</span>
                      </>
                    )}
                  </button>

                  {cartQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSmartGenerate}
                      title="Reshuffle entire test with current settings"
                      className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </button>
                  )}
                </div>

                {/* Official Edexcel IAL Presets Trigger */}
                <button
                  type="button"
                  onClick={() => setIsPresetsModalOpen(true)}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Official Edexcel Unit Presets</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Full Papers ▾
                  </span>
                </button>
              </div>
            )}
          </SpotlightCard>
        </div>

        {/* Selected Questions Reorderable List (with HTML5 Drag-and-Drop) */}
        <div className="flex-1 min-h-[140px] overflow-y-auto overflow-x-hidden p-2.5 space-y-1.5">
          {cartQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-slate-500">
              <FileText className="w-7 h-7 text-slate-400 dark:text-slate-600 mb-1.5" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Your Exam Cart is Empty
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-600 mt-1 max-w-[14rem]">
                Search questions and click &quot;Add&quot; or use Smart Auto-Generate to assemble your test.
              </p>
            </div>
          ) : (
            cartQuestions.map((q, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === cartQuestions.length - 1;
              const isPreviewed = previewQuestionId === q.id;
              const qSubj = getQuestionSubject(q);
              const isDragging = draggedIndex === idx;
              const isDropTarget =
                dragOverIndex === idx && draggedIndex !== null && draggedIndex !== idx;
              const dropIndicatorClass = isDropTarget
                ? draggedIndex < idx
                  ? 'border-b-2 border-b-cyan-500 scale-[1.01] ring-1 ring-cyan-500/30'
                  : 'border-t-2 border-t-cyan-500 scale-[1.01] ring-1 ring-cyan-500/30'
                : '';

              return (
                <div
                  key={q.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnter={(e) => handleDragEnter(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onPointerMove={handleSpotlightMove}
                  onPointerLeave={handleSpotlightLeave}
                  style={getSubjectSpotlightStyle(qSubj, 240)}
                  onClick={() => {
                    setPreviewQuestionId(q.id);
                    if (window.innerWidth < 1280) {
                      setMobileTab('preview');
                      setIsCartDrawerOpen(false);
                    }
                  }}
                  className={`spotlight-surface p-2 rounded-xl border-y border-r border-l-4 flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isDragging
                      ? 'opacity-50 border-dashed border-cyan-500/60 bg-cyan-500/5'
                      : isPreviewed
                      ? 'bg-cyan-50/70 dark:bg-[#0D131F] border-y-cyan-400/70 border-r-cyan-400/70 dark:border-y-cyan-500/40 dark:border-r-cyan-500/40 border-l-cyan-500 dark:border-l-cyan-400 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#0B0E16]/80 dark:hover:bg-white/[0.04] border-y-slate-200 border-r-slate-200 dark:border-y-white/[0.07] dark:border-r-white/[0.07] border-l-transparent dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                  } ${dropIndicatorClass}`}
                >
                  {/* Left: Drag Handle + Index & Question Info */}
                  <div className="relative z-10 flex items-center gap-2 min-w-0 overflow-hidden">
                    <span
                      title="Drag to reorder question"
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing shrink-0 flex items-center"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                    <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-white/[0.08] flex items-center justify-center font-mono tabular-nums font-bold text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums font-bold text-xs text-cyan-700 dark:text-cyan-300">
                          Q{q.questionNumber}
                        </span>
                        <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25">
                          {q.marks}m
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {q.unit} • {q.mainSubtopic || q.subtopic || q.topic}
                      </p>
                    </div>
                  </div>

                  {/* Right: Reorder & Remove Controls */}
                  <div
                    className="relative z-10 flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(idx)}
                      title="Move Question Up"
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(idx)}
                      title="Move Question Down"
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCartWithUndo(q.id)}
                      title="Remove from Cart"
                      className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors ml-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Bar: Sit Exam, PDF Export Options & Buttons */}
        <div className="p-3 border-t border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-850 space-y-2 shrink-0">
          {/* Primary Action 1: In-Browser Timed Mock Exam Room */}
          <button
            type="button"
            disabled={cartQuestions.length === 0}
            onClick={() => setIsSittingModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/20 active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <PlayCircle className="w-4 h-4 text-white shrink-0" />
            <span className="truncate">Sit Mock Exam In-Browser ({formatDuration(targetTimeMinutes)})</span>
          </button>

          {/* Compact Export Options Configuration Box */}
          <div
            onPointerMove={handleSpotlightMove}
            onPointerLeave={handleSpotlightLeave}
            style={getSubjectSpotlightStyle(subject, 260)}
            className="spotlight-surface p-2 rounded-xl bg-white dark:bg-[#0B0E16]/90 border border-slate-200 dark:border-white/[0.08] space-y-1.5 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          >
            <div className="relative z-10 flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/[0.06]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Export Options
              </span>
              <span
                className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                  !includeHeaderFooter
                    ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                    : includeFormalHeader
                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                    : 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30'
                }`}
              >
                {!includeHeaderFooter
                  ? 'Pure Questions'
                  : includeFormalHeader
                  ? 'Exam Mode'
                  : 'Worksheet Mode'}
              </span>
            </div>

            {/* Include Header & Page Footer Checkbox */}
            <label
              title="Uncheck for pure questions only (removes title bar, footer text, and page numbering)"
              className="relative z-10 flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={includeHeaderFooter}
                onChange={(e) => setIncludeHeaderFooter(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-white dark:bg-dark-900 border-slate-300 dark:border-dark-600 text-cyan-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-600 shrink-0"
              />
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors select-none truncate">
                Header &amp; Page Footer
              </span>
            </label>

            {/* Formal Exam Header Checkbox */}
            <label
              title="Includes candidate boxes, instructions, and official title banner"
              className={`relative z-10 flex items-center gap-2 cursor-pointer group transition-opacity ${
                !includeHeaderFooter ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <input
                type="checkbox"
                disabled={!includeHeaderFooter}
                checked={includeFormalHeader && includeHeaderFooter}
                onChange={(e) => setIncludeFormalHeader(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-white dark:bg-dark-900 border-slate-300 dark:border-dark-600 text-cyan-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-600 shrink-0"
              />
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors select-none truncate">
                Formal Cover &amp; Candidate Boxes
              </span>
            </label>

            {/* Include Source Citation Tag Checkbox */}
            <label
              title="Prints citation (e.g. Unit 3 • June 2024 Q2(a)) above questions"
              className="relative z-10 flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={includeSourceTags}
                onChange={(e) => setIncludeSourceTags(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-white dark:bg-dark-900 border-slate-300 dark:border-dark-600 text-cyan-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-600 shrink-0"
              />
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors select-none truncate">
                Question Source Tags
              </span>
            </label>
          </div>

          {exportStatus && (
            <div className="text-[11px] text-center text-cyan-600 dark:text-cyan-300 font-medium py-0.5 animate-pulse">
              {exportStatus}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={cartQuestions.length === 0 || isExportingQP || isExportingMS}
              onClick={handleExportQP}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              className="spotlight-surface group/qp flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-b from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs shadow-[0_10px_24px_-6px_rgba(6,182,212,0.45),inset_0_1px_0_0_rgba(255,255,255,0.28)] border border-cyan-400/40 transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
            >
              <Printer className="relative z-10 w-3.5 h-3.5 transition-transform duration-200 group-hover/qp:-translate-y-0.5" />
              <span className="relative z-10 truncate">
                {!includeHeaderFooter
                  ? 'Export QP Only'
                  : includeFormalHeader
                  ? 'Export Exam QP'
                  : 'Export Worksheet'}
              </span>
            </button>

            <button
              type="button"
              disabled={cartQuestions.length === 0 || isExportingQP || isExportingMS}
              onClick={handleExportMS}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              style={
                {
                  '--spotlight-color': 'rgba(16, 185, 129, 0.14)',
                  '--border-glow-color': 'rgba(52, 211, 153, 0.45)',
                } as React.CSSProperties
              }
              className="spotlight-surface group/ms flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-slate-200 dark:border-white/[0.1] hover:border-emerald-500/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
            >
              <Download className="relative z-10 w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 group-hover/ms:translate-y-0.5" />
              <span className="relative z-10 truncate">Export MS (PDF)</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Official Edexcel IAL Full Paper Presets Modal */}
      <FullPaperPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        presets={officialPresets}
        selectedPresetId={selectedPresetId}
        onApplyPreset={handleApplyPreset}
        accentClasses={accentClasses}
      />

      {/* In-Browser Exam Sitting Modal */}
      <MockSittingModal
        isOpen={isSittingModalOpen}
        onClose={() => setIsSittingModalOpen(false)}
        title={testTitle || DEFAULT_EXAM_TITLES[activeSubject]}
        questions={cartQuestions}
        durationMinutes={targetTimeMinutes}
        subject={activeSubject}
      />

      {/* Generator Relaxed Constraint / Closest Marks Warning Toast */}
      {generatorWarning && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed ${
            showUndoToast && cartUndoStack.length > 0 ? 'bottom-16' : 'bottom-5'
          } left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-950/95 dark:bg-amber-900/95 text-amber-100 text-xs font-medium shadow-2xl border border-amber-500/40 max-w-md`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">{generatorWarning}</span>
          <button
            type="button"
            onClick={() => setGeneratorWarning(null)}
            aria-label="Dismiss warning notification"
            className="text-amber-300 hover:text-white transition-colors ml-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5-Second Cart Destruction Protection Undo Toast */}
      {showUndoToast && cartUndoStack.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium shadow-2xl border border-white/15 animate-in fade-in slide-in-from-bottom-3 duration-150"
        >
          <span>Cart updated —</span>
          <button
            type="button"
            onClick={handleUndoCartReplace}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors active:scale-95"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setShowUndoToast(false)}
            aria-label="Dismiss undo notification"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TestMakerPage;
