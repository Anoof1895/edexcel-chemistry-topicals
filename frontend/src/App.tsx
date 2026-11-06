import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { QuestionItem, FilterState, ViewMode, AppView, Subject } from './types';
import { AppNavbar } from './components/AppNavbar';
import { TopBar } from './components/TopBar';
import { buildStaticSubtopicHierarchy } from './constants/taxonomy';
import { getQuestionType } from './utils/questionClassification';
import { QuestionList, sortQuestionsLatestFirst } from './components/QuestionList';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';
import { AmbientBackground } from './components/AmbientBackground';
import { DataBookletDrawer } from './components/DataBookletDrawer';
import { AuthModal } from './components/AuthModal';
import { CommandPalette } from './components/CommandPalette';
import { useAuth } from './context/AuthContext';
import { useProgress } from './context/ProgressContext';
import { useTheme } from './context/ThemeContext';
import { Loader2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

// Route-level code-splitting for large views
const HomePage = React.lazy(() => import('./components/HomePage').then((m) => ({ default: m.HomePage })));
const TestMakerPage = React.lazy(() => import('./components/TestMakerPage').then((m) => ({ default: m.TestMakerPage })));
const SplitViewer = React.lazy(() => import('./components/SplitViewer').then((m) => ({ default: m.SplitViewer })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 gap-3">
    <Loader2 className="w-7 h-7 text-cyan-500 animate-spin" />
    <span className="text-xs font-medium">Loading view...</span>
  </div>
);

// URL hash router helper: parses view, optional ?q=question_id, and active filter search params
const parseHashRoute = (): {
  view: AppView;
  questionId: string | null;
  urlFilters: Partial<FilterState>;
} => {
  try {
    const fullHash = window.location.hash || '';
    const [hashPath, hashQuery] = fullHash.split('?');
    const lowerPath = (hashPath || '').toLowerCase();

    let view: AppView = 'home';
    if (lowerPath.includes('math') && (lowerPath.includes('test-maker') || lowerPath.includes('testmaker'))) {
      view = 'mathematics-test-maker';
    } else if (lowerPath.includes('math')) {
      view = 'mathematics-topical';
    } else if (lowerPath.includes('physics-test-maker') || lowerPath.includes('physics/test-maker')) {
      view = 'physics-test-maker';
    } else if (lowerPath.includes('physics-topical') || lowerPath.includes('physics/topical') || lowerPath.includes('physics')) {
      view = 'physics-topical';
    } else if (lowerPath.includes('test-maker')) {
      view = 'chemistry-test-maker';
    } else if (lowerPath.includes('topical')) {
      view = 'chemistry-topical';
    }

    let questionId: string | null = null;
    const urlFilters: Partial<FilterState> = {};

    if (hashQuery) {
      const params = new URLSearchParams(hashQuery);
      questionId = params.get('q');

      const unitParams = params.getAll('unit');
      if (unitParams.length > 0) {
        const units = unitParams
          .flatMap((u) => u.split('|'))
          .map((u) => u.trim())
          .filter(Boolean);
        if (units.length > 0) {
          urlFilters.selectedUnits = units;
        }
      }

      const subtopicParams = params.getAll('subtopic');
      if (subtopicParams.length > 0) {
        const subs = subtopicParams
          .flatMap((s) => s.split('|'))
          .map((s) => s.trim())
          .filter(Boolean);
        if (subs.length > 0) {
          urlFilters.selectedSubtopics = subs;
        }
      }

      const typeParam = params.get('type');
      if (typeParam === 'mcq' || typeParam === 'theory' || typeParam === 'all') {
        urlFilters.questionType = typeParam;
      }

      const yearParam = params.get('year');
      if (yearParam) {
        const yrs = yearParam.split(',').map((y) => y.trim()).filter(Boolean);
        if (yrs.length > 0) urlFilters.selectedYears = yrs;
      }

      const seriesParam = params.get('series');
      if (seriesParam) {
        const srs = seriesParam.split(',').map((s) => s.trim()).filter(Boolean);
        if (srs.length > 0) urlFilters.selectedSeries = srs;
      }

      const statusParam = params.get('status');
      if (statusParam === 'unattempted' || statusParam === 'review' || statusParam === 'mastered') {
        urlFilters.statusFilter = statusParam;
      }

      const bookmarkedParam = params.get('bookmarked');
      if (bookmarkedParam === '1' || bookmarkedParam === 'true') {
        urlFilters.bookmarkedOnly = true;
      }

      const searchParam = params.get('search');
      if (searchParam) {
        urlFilters.searchQuery = searchParam;
      }
    }

    return { view, questionId, urlFilters };
  } catch {
    return { view: 'home', questionId: null, urlFilters: {} };
  }
};

// Helper to normalize raw JSON questions to unified QuestionItem format with strict null safety
const normalizeQuestions = (data: unknown[]): QuestionItem[] => {
  if (!Array.isArray(data)) return [];
  return data.map((raw) => {
    const q = (raw || {}) as Partial<QuestionItem> & Record<string, any>;
    const qNum =
      q.questionNumber ??
      (q.question_number !== undefined
        ? String(q.question_number)
        : q.id
        ? q.id.split('_').pop()?.replace(/^q/i, '') || '1'
        : '1');
    const qImg =
      q.questionImagePath ||
      q.question_image_url ||
      q.question_image ||
      q.image ||
      q.image_url ||
      q.crop_path ||
      '';
    const msImg =
      q.markSchemeImagePath ||
      q.mark_scheme_image_url ||
      q.mark_scheme_image ||
      q.ms_image ||
      q.ms_image_url ||
      q.ms_crop_path ||
      null;
    const totalMarks = Number(q.marks ?? q.total_marks ?? 1) || 1;
    const rawSubs = Array.isArray(q.subtopics) && q.subtopics.length > 0
      ? q.subtopics
      : q.subtopic
      ? [q.subtopic]
      : [];
    const mainSubtopic = q.mainSubtopic || q.subtopic || rawSubs[0] || 'General';
    const mainTopic = q.mainTopic || q.topic || 'General';
    const relatedSubtopics = Array.isArray(q.relatedSubtopics)
      ? q.relatedSubtopics
      : rawSubs.slice(1);
    const subtopics = Array.from(new Set([mainSubtopic, ...relatedSubtopics])).filter(Boolean);
    const topics = Array.isArray(q.topics) && q.topics.length > 0
      ? q.topics
      : [mainTopic];

    return {
      ...q,
      id: q.id || '',
      paperId: q.paperId || q.paper_id || '',
      unit: q.unit || q.topic || '',
      unitCode: q.unitCode || q.paperCode || q.paper_code || '',
      year: Number(q.year) || 2024,
      series: q.series || q.session || '',
      questionNumber: String(qNum),
      parentQuestion: q.parentQuestion || String(qNum).replace(/\([a-z0-9]+\).*$/i, '') || String(qNum),
      subPart: q.subPart || q.subpart || '',
      marks: totalMarks,
      topic: mainTopic,
      subtopic: mainSubtopic,
      subtopics,
      topics,
      mainTopic,
      mainSubtopic,
      relatedSubtopics,
      hasStem: Boolean(q.hasStem),
      stemSummary: q.stemSummary ?? null,
      questionImagePath: qImg,
      markSchemeImagePath: msImg,
    };
  });
};

export const App: React.FC = () => {
  const [chemQuestions, setChemQuestions] = useState<QuestionItem[] | null>(null);
  const [physQuestions, setPhysQuestions] = useState<QuestionItem[] | null>(null);
  const [mathQuestions, setMathQuestions] = useState<QuestionItem[] | null>(null);
  const [loadingSubject, setLoadingSubject] = useState<Subject | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [isDataBookletOpen, setIsDataBookletOpen] = useState<boolean>(false);
  const [isDataBookletExpanded, setIsDataBookletExpanded] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Global keyboard shortcut: 'D' to toggle Official Data Booklet Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isCommandPaletteOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsDataBookletOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  const initialRoute = useRef(parseHashRoute());
  const [currentView, setCurrentView] = useState<AppView>(initialRoute.current.view);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(initialRoute.current.questionId);

  const activeSubject: Subject = useMemo(() => {
    if (currentView.startsWith('physics')) return 'physics';
    if (currentView.startsWith('mathematics')) return 'mathematics';
    if (currentView.startsWith('chemistry')) return 'chemistry';
    try {
      const saved = localStorage.getItem('edexcel_active_subject') as Subject;
      if (saved && ['chemistry', 'physics', 'mathematics'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'chemistry';
  }, [currentView]);

  const { setSubjectTheme } = useTheme();
  useEffect(() => {
    setSubjectTheme(activeSubject);
    try {
      localStorage.setItem('edexcel_active_subject', activeSubject);
    } catch {}
  }, [activeSubject, setSubjectTheme]);

  const handleNavigate = useCallback((view: AppView) => {
    const nextSubject: Subject = view.startsWith('physics')
      ? 'physics'
      : view.startsWith('mathematics')
      ? 'mathematics'
      : 'chemistry';
    const isSameSubject = nextSubject === activeSubject;
    const targetQ = isSameSubject ? selectedQuestionId : null;

    setCurrentView(view);
    if (!isSameSubject) {
      setSelectedQuestionId(null);
    }

    if (view === 'physics-topical') {
      window.location.hash = targetQ ? `#/physics/topical?q=${encodeURIComponent(targetQ)}` : '#/physics/topical';
    } else if (view === 'physics-test-maker') {
      window.location.hash = '#/physics/test-maker';
    } else if (view === 'mathematics-topical') {
      window.location.hash = targetQ ? `#/mathematics/topical?q=${encodeURIComponent(targetQ)}` : '#/mathematics/topical';
    } else if (view === 'mathematics-test-maker') {
      window.location.hash = '#/mathematics/test-maker';
    } else if (view === 'chemistry-topical') {
      window.location.hash = targetQ ? `#/topical?q=${encodeURIComponent(targetQ)}` : '#/topical';
    } else if (view === 'chemistry-test-maker') {
      window.location.hash = '#/test-maker';
    } else {
      window.location.hash = '#/';
    }
  }, [activeSubject, selectedQuestionId]);

  // Listen to popstate / hashchange for browser back and forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const { view, questionId, urlFilters } = parseHashRoute();
      setCurrentView((prev) => (prev !== view ? view : prev));
      if (questionId) {
        setSelectedQuestionId(questionId);
      }
      if (Object.keys(urlFilters).length > 0) {
        setFilters((prev) => ({ ...prev, ...urlFilters }));
        if (urlFilters.bookmarkedOnly !== undefined) {
          setActiveTab(urlFilters.bookmarkedOnly ? 'bookmarked' : 'all');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Dynamic Browser Tab Title
  useEffect(() => {
    if (currentView === 'physics-topical') {
      document.title = 'Physics Topicals | Edexcel IAL Topicals';
    } else if (currentView === 'physics-test-maker') {
      document.title = 'Physics Test Maker | Edexcel IAL Topicals';
    } else if (currentView === 'mathematics-topical') {
      document.title = 'Mathematics Topicals | Edexcel IAL Topicals';
    } else if (currentView === 'mathematics-test-maker') {
      document.title = 'Mathematics Test Maker | Edexcel IAL Topicals';
    } else if (currentView === 'chemistry-topical') {
      document.title = 'Chemistry Topicals | Edexcel IAL Topicals';
    } else if (currentView === 'chemistry-test-maker') {
      document.title = 'Chemistry Test Maker | Edexcel IAL Topicals';
    } else {
      document.title = 'Edexcel IAL Topicals';
    }
  }, [currentView]);

  const questions = useMemo(() => {
    if (activeSubject === 'physics') {
      return physQuestions || [];
    }
    if (activeSubject === 'mathematics') {
      return mathQuestions || [];
    }
    return chemQuestions || [];
  }, [activeSubject, physQuestions, mathQuestions, chemQuestions]);

  // Persist viewMode across page reloads (defaults to 'question-only' so answers aren't spoiled)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('edexcel_view_mode');
      if (saved === 'split') return 'split';
      if (saved === 'question-only' || saved === 'question') return 'question-only';
      if (saved === 'ms-only' || saved === 'mark_scheme') return 'ms-only';
    } catch {}
    return 'question-only';
  });

  useEffect(() => {
    try {
      localStorage.setItem('edexcel_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  // Cloud-synced bookmarks and question statuses from ProgressContext
  const { 
    bookmarks, 
    questionStatuses, 
    toggleBookmark, 
    cycleQuestionStatus 
  } = useProgress();
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  // Persisted custom test maker carts separated by subject
  const [chemTestCart, setChemTestCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chem_test_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [physTestCart, setPhysTestCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('phys_test_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [mathTestCart, setMathTestCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('math_test_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const testCart = activeSubject === 'physics'
    ? physTestCart
    : activeSubject === 'mathematics'
    ? mathTestCart
    : chemTestCart;

  const [chemTestTitle, setChemTestTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('chem_test_title') || 'Custom Chemistry Mock Exam';
    } catch {
      return 'Custom Chemistry Mock Exam';
    }
  });

  const [physTestTitle, setPhysTestTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('phys_test_title') || 'Custom Physics Mock Exam';
    } catch {
      return 'Custom Physics Mock Exam';
    }
  });

  const [mathTestTitle, setMathTestTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('math_test_title') || 'Custom Mathematics Mock Exam';
    } catch {
      return 'Custom Mathematics Mock Exam';
    }
  });

  const testTitle = activeSubject === 'physics'
    ? physTestTitle
    : activeSubject === 'mathematics'
    ? mathTestTitle
    : chemTestTitle;

  const setTestTitle = useCallback((title: string) => {
    if (activeSubject === 'physics') {
      setPhysTestTitle(title);
    } else if (activeSubject === 'mathematics') {
      setMathTestTitle(title);
    } else {
      setChemTestTitle(title);
    }
  }, [activeSubject]);

  useEffect(() => {
    localStorage.setItem('chem_test_cart', JSON.stringify(chemTestCart));
  }, [chemTestCart]);

  useEffect(() => {
    localStorage.setItem('phys_test_cart', JSON.stringify(physTestCart));
  }, [physTestCart]);

  useEffect(() => {
    localStorage.setItem('math_test_cart', JSON.stringify(mathTestCart));
  }, [mathTestCart]);

  useEffect(() => {
    localStorage.setItem('chem_test_title', chemTestTitle);
  }, [chemTestTitle]);

  useEffect(() => {
    localStorage.setItem('phys_test_title', physTestTitle);
  }, [physTestTitle]);

  useEffect(() => {
    localStorage.setItem('math_test_title', mathTestTitle);
  }, [mathTestTitle]);

  const handleAddToCart = useCallback((id: string) => {
    if (activeSubject === 'physics') {
      setPhysTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else if (activeSubject === 'mathematics') {
      setMathTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setChemTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  }, [activeSubject]);

  const handleRemoveFromCart = useCallback((id: string) => {
    if (activeSubject === 'physics') {
      setPhysTestCart((prev) => prev.filter((item) => item !== id));
    } else if (activeSubject === 'mathematics') {
      setMathTestCart((prev) => prev.filter((item) => item !== id));
    } else {
      setChemTestCart((prev) => prev.filter((item) => item !== id));
    }
  }, [activeSubject]);

  const handleClearCart = useCallback(() => {
    if (activeSubject === 'physics') {
      setPhysTestCart([]);
    } else if (activeSubject === 'mathematics') {
      setMathTestCart([]);
    } else {
      setChemTestCart([]);
    }
  }, [activeSubject]);

  const handleReorderCart = useCallback((newIds: string[]) => {
    if (activeSubject === 'physics') {
      setPhysTestCart(newIds);
    } else if (activeSubject === 'mathematics') {
      setMathTestCart(newIds);
    } else {
      setChemTestCart(newIds);
    }
  }, [activeSubject]);

  // On-demand dataset loading per active subject (avoids fetching all concurrently on cold start)
  useEffect(() => {
    if (currentView === 'home') {
      return;
    }

    let isMounted = true;

    if (activeSubject === 'chemistry' && !chemQuestions) {
      setLoadingSubject('chemistry');
      setDatasetError(null);
      fetch('/dataset.json')
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load Chemistry dataset: ${res.statusText}`);
          return res.json();
        })
        .then((data: unknown[]) => {
          if (isMounted) {
            const normalized = normalizeQuestions(data);
            setChemQuestions([...normalized].sort(sortQuestionsLatestFirst));
            setLoadingSubject(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setDatasetError(err.message || 'Failed to load Chemistry dataset');
            setLoadingSubject(null);
          }
        });
    } else if (activeSubject === 'physics' && !physQuestions) {
      setLoadingSubject('physics');
      setDatasetError(null);
      fetch('/dataset_physics.json')
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load Physics dataset: ${res.statusText}`);
          return res.json();
        })
        .then((data: unknown[]) => {
          if (isMounted) {
            const normalized = normalizeQuestions(data);
            setPhysQuestions([...normalized].sort(sortQuestionsLatestFirst));
            setLoadingSubject(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setDatasetError(err.message || 'Failed to load Physics dataset');
            setLoadingSubject(null);
          }
        });
    } else if (activeSubject === 'mathematics' && !mathQuestions) {
      setLoadingSubject('mathematics');
      setDatasetError(null);
      fetch('/dataset_math.json')
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load Mathematics dataset: ${res.statusText}`);
          return res.json();
        })
        .then((data: unknown[]) => {
          if (isMounted) {
            const normalized = normalizeQuestions(data);
            setMathQuestions([...normalized].sort(sortQuestionsLatestFirst));
            setLoadingSubject(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setDatasetError(err.message || 'Failed to load Mathematics dataset');
            setLoadingSubject(null);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeSubject, currentView, chemQuestions, physQuestions, mathQuestions]);

  // Active drawer tab: 'all' | 'bookmarked'
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarked'>(
    initialRoute.current.urlFilters.bookmarkedOnly ? 'bookmarked' : 'all'
  );

  // Responsive question list drawer state (< 1024px)
  const [isQuestionDrawerOpen, setIsQuestionDrawerOpen] = useState<boolean>(false);

  // Filter state for topical explorer (hydrated from URL search params on initial load)
  const [filters, setFilters] = useState<FilterState>(() => {
    const uf = initialRoute.current.urlFilters;
    return {
      selectedUnits: uf.selectedUnits ?? [],
      selectedSubtopics: uf.selectedSubtopics ?? [],
      selectedYears: uf.selectedYears ?? [],
      selectedSeries: uf.selectedSeries ?? [],
      searchQuery: uf.searchQuery ?? '',
      statusFilter: uf.statusFilter ?? 'all',
      questionType: uf.questionType ?? 'all',
      bookmarkedOnly: uf.bookmarkedOnly ?? false,
    };
  });

  // Sync active filters and selected question ID to URL hash search params in topical view
  useEffect(() => {
    if (currentView !== 'chemistry-topical' && currentView !== 'physics-topical' && currentView !== 'mathematics-topical') return;

    const basePath = currentView === 'physics-topical'
      ? '#/physics/topical'
      : currentView === 'mathematics-topical'
      ? '#/mathematics/topical'
      : '#/topical';

    const params = new URLSearchParams();
    if (filters.selectedUnits.length > 0) {
      filters.selectedUnits.forEach((u) => params.append('unit', u));
    }
    if (filters.selectedSubtopics.length > 0) {
      filters.selectedSubtopics.forEach((s) => params.append('subtopic', s));
    }
    if (filters.questionType && filters.questionType !== 'all') {
      params.set('type', filters.questionType);
    }
    if (filters.selectedYears.length > 0) {
      params.set('year', filters.selectedYears.join(','));
    }
    if (filters.selectedSeries.length > 0) {
      params.set('series', filters.selectedSeries.join(','));
    }
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      params.set('status', filters.statusFilter);
    }
    if (filters.bookmarkedOnly) {
      params.set('bookmarked', '1');
    }
    if (filters.searchQuery.trim()) {
      params.set('search', filters.searchQuery.trim());
    }
    if (selectedQuestionId) {
      params.set('q', selectedQuestionId);
    }

    const queryStr = params.toString();
    const newHash = queryStr ? `${basePath}?${queryStr}` : basePath;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [currentView, selectedQuestionId, filters]);

  const prevSubjectRef = useRef<Subject>(activeSubject);
  useEffect(() => {
    if (prevSubjectRef.current !== activeSubject) {
      prevSubjectRef.current = activeSubject;
      setActiveTab('all');
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
      if (questions.length > 0) {
        setSelectedQuestionId(questions[0].id);
      } else {
        setSelectedQuestionId(null);
      }
    } else if (questions.length > 0) {
      if (!selectedQuestionId || !questions.some((q) => q.id === selectedQuestionId)) {
        setSelectedQuestionId(questions[0].id);
      }
    }
  }, [activeSubject, questions, selectedQuestionId]);

  // Filter options extraction
  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    questions.forEach((q) => {
      if (q.unit) units.add(q.unit);
    });
    return Array.from(units).sort();
  }, [questions]);

  // Canonical Specification Hierarchy: subtopics are permanently locked to their official parent topic and unit
  const subtopicHierarchy = useMemo(() => {
    return buildStaticSubtopicHierarchy(filters.selectedUnits, questions, activeSubject);
  }, [questions, filters.selectedUnits, activeSubject]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    questions.forEach((q) => {
      if (q.year) years.add(q.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [questions]);

  // Filtered questions list
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Unit multi-select filter: empty means all units match
      if (filters.selectedUnits.length > 0) {
        const matchesUnit = filters.selectedUnits.some((fu) => {
          if (fu === q.unit || fu === q.unitCode) return true;
          const fuPrefix = fu.split(':')[0].trim().toLowerCase();
          const qPrefix = (q.unit || '').split(':')[0].trim().toLowerCase();
          return fuPrefix && qPrefix && fuPrefix === qPrefix;
        });
        if (!matchesUnit) return false;
      }

      // Multi-select subtopic filter: match ANY selected subtopic
      if (filters.selectedSubtopics.length > 0) {
        const qSubs = q.subtopics && q.subtopics.length > 0 ? q.subtopics : [q.subtopic];
        const hasAnyMatch = qSubs.some((s) => s && filters.selectedSubtopics.includes(s));
        if (!hasAnyMatch) return false;
      }

      // Year multi-select filter: empty means all years match
      if (filters.selectedYears.length > 0 && !filters.selectedYears.includes(String(q.year))) {
        return false;
      }

      // Series / Season multi-select filter: empty means all series match
      if (filters.selectedSeries.length > 0) {
        const qSession = (q.session || '').toLowerCase();
        const qSeries = (q.series || '').toLowerCase();
        const matchesSeries = filters.selectedSeries.some((s) => {
          const target = s.toLowerCase();
          if (target === 'january') {
            return qSession.includes('jan') || qSeries.includes('jan');
          }
          if (target === 'may/june' || target === 'may' || target === 'june') {
            return (
              qSession.includes('june') ||
              qSession.includes('may') ||
              qSeries.includes('june') ||
              qSeries.includes('may')
            );
          }
          if (target === 'october' || target === 'oct' || target === 'nov') {
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

      // Bookmarked filter
      if (filters.bookmarkedOnly && !bookmarks.has(q.id)) return false;

      // Status filter: 'all' | 'unattempted' | 'review' | 'mastered'
      const qStatus = questionStatuses[q.id] || 'unattempted';
      if (filters.statusFilter !== 'all' && qStatus !== filters.statusFilter) return false;

      // Question type filter: 'all' | 'mcq' | 'theory'
      if (filters.questionType !== 'all') {
        const qType = getQuestionType(q);
        if (qType !== filters.questionType) return false;
      }

      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchQNum = q.questionNumber.toLowerCase().includes(query);
        const matchTopic = (q.topic || '').toLowerCase().includes(query) || (q.mainTopic || '').toLowerCase().includes(query);
        const matchSubtopic = (q.subtopic || '').toLowerCase().includes(query) || (q.mainSubtopic || '').toLowerCase().includes(query);
        const matchSubs = (q.subtopics || []).some((s) => s.toLowerCase().includes(query)) || (q.relatedSubtopics || []).some((s) => s.toLowerCase().includes(query));
        const matchStem = (q.stemSummary || '').toLowerCase().includes(query);
        const matchSeries = (q.series || '').toLowerCase().includes(query);
        const matchSession = (q.session || '').toLowerCase().includes(query);
        const matchPaper = (q.paperCode || q.paper_code || q.unitCode || '').toLowerCase().includes(query);
        if (!matchQNum && !matchTopic && !matchSubtopic && !matchSubs && !matchStem && !matchSeries && !matchSession && !matchPaper) return false;
      }

      return true;
    }).sort(sortQuestionsLatestFirst);
  }, [questions, filters, bookmarks, questionStatuses]);

  // Active question item
  const activeQuestion = useMemo(() => {
    if (filteredQuestions.length === 0) return null;
    const match = filteredQuestions.find((q) => q.id === selectedQuestionId);
    return match || filteredQuestions[0];
  }, [filteredQuestions, selectedQuestionId]);

  useEffect(() => {
    if (activeQuestion && activeQuestion.id !== selectedQuestionId) {
      setSelectedQuestionId(activeQuestion.id);
    }
  }, [activeQuestion, selectedQuestionId]);

  const currentIndex = useMemo(() => {
    if (!activeQuestion) return -1;
    return filteredQuestions.findIndex((q) => q.id === activeQuestion.id);
  }, [filteredQuestions, activeQuestion]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredQuestions.length - 1;

  const handlePrevQuestion = useCallback(() => {
    if (hasPrev) {
      setSelectedQuestionId(filteredQuestions[currentIndex - 1].id);
    }
  }, [hasPrev, currentIndex, filteredQuestions]);

  const handleNextQuestion = useCallback(() => {
    if (hasNext) {
      setSelectedQuestionId(filteredQuestions[currentIndex + 1].id);
    }
  }, [hasNext, currentIndex, filteredQuestions]);

  // Toggle between Question Only and Showing Answers (Split view)
  const handleToggleMarkScheme = useCallback(() => {
    setViewMode((prev) => (prev === 'question-only' ? 'split' : 'question-only'));
  }, []);

  const handleCycleStatus = useCallback((id: string) => {
    cycleQuestionStatus(id);
  }, [cycleQuestionStatus]);

  const handleToggleBookmark = useCallback((id: string) => {
    toggleBookmark(id);
  }, [toggleBookmark]);

  const handleToggleActiveBookmark = useCallback(() => {
    if (!activeQuestion) return;
    toggleBookmark(activeQuestion.id);
  }, [activeQuestion, toggleBookmark]);

  // Keyboard navigation shortcuts (active in Topical Explorer mode):
  // - ArrowLeft / [ / K: Previous question
  // - ArrowRight / ] / J: Next question
  // - Space: Toggle mark scheme visibility
  // - M: 3-way view mode cycle (split -> question-only -> ms-only)
  // - B: Toggle Bookmark
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentView.endsWith('-topical')) return;
      if (isDataBookletOpen || isAuthModalOpen || isCommandPaletteOpen) return;

      // Don't trigger shortcuts if typing inside an input, textarea, select, or focused button/link
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('button, a, [role="button"]'))
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === '[' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handlePrevQuestion();
      } else if (e.key === 'ArrowRight' || e.key === ']' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleNextQuestion();
      } else if (e.key === ' ' || e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        handleToggleMarkScheme();
      } else if (e.key === 'm' || e.key === 'M') {
        if (e.repeat) return;
        e.preventDefault();
        setViewMode((prev) => (prev === 'split' ? 'question-only' : prev === 'question-only' ? 'ms-only' : 'split'));
      } else if (e.key === 'b' || e.key === 'B') {
        if (e.repeat) return;
        e.preventDefault();
        handleToggleActiveBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isDataBookletOpen, isAuthModalOpen, isCommandPaletteOpen, handlePrevQuestion, handleNextQuestion, handleToggleMarkScheme, handleToggleActiveBookmark]);

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updates };
      if (updates.bookmarkedOnly !== undefined) {
        setActiveTab(updates.bookmarkedOnly ? 'bookmarked' : 'all');
      }
      return next;
    });
  };

  const handleTabChange = (tab: 'all' | 'bookmarked') => {
    setActiveTab(tab);
    setFilters((prev) => ({ ...prev, bookmarkedOnly: tab === 'bookmarked' }));
  };

  const handleResetFilters = () => {
    setActiveTab('all');
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
  };

  const handleSelectUnitFromPalette = useCallback((subject: Subject, unitLabel: string) => {
    prevSubjectRef.current = subject;
    setActiveTab('all');
    setFilters({
      selectedUnits: [unitLabel],
      selectedSubtopics: [],
      selectedYears: [],
      selectedSeries: [],
      searchQuery: '',
      statusFilter: 'all',
      questionType: 'all',
      bookmarkedOnly: false,
    });
    setSelectedQuestionId(null);
    const targetView: AppView = subject === 'physics'
      ? 'physics-topical'
      : subject === 'mathematics'
      ? 'mathematics-topical'
      : 'chemistry-topical';
    setCurrentView(targetView);
    window.location.hash = subject === 'physics'
      ? '#/physics/topical'
      : subject === 'mathematics'
      ? '#/mathematics/topical'
      : '#/topical';
  }, []);

  const handleSelectQuestionFromPalette = useCallback((subject: Subject, questionId: string) => {
    prevSubjectRef.current = subject;
    setActiveTab('all');
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
    setSelectedQuestionId(questionId);
    const targetView: AppView = subject === 'physics'
      ? 'physics-topical'
      : subject === 'mathematics'
      ? 'mathematics-topical'
      : 'chemistry-topical';
    setCurrentView(targetView);
    const basePath = subject === 'physics'
      ? '#/physics/topical'
      : subject === 'mathematics'
      ? '#/mathematics/topical'
      : '#/topical';
    window.location.hash = `${basePath}?q=${encodeURIComponent(questionId)}`;
  }, []);

  const totalMarks = useMemo(() => {
    return filteredQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }, [filteredQuestions]);

  const accentSpotlight = useMemo(() => {
    switch (activeSubject) {
      case 'mathematics':
        return 'rgba(249, 115, 22, 0.06)'; // Orange
      case 'physics':
        return 'rgba(59, 130, 246, 0.06)'; // Blue
      case 'chemistry':
      default:
        return 'rgba(6, 182, 212, 0.06)';  // Cyan
    }
  }, [activeSubject]);

  const isSubjectLoading = currentView !== 'home' && (
    loadingSubject === activeSubject ||
    (activeSubject === 'chemistry' && !chemQuestions) ||
    (activeSubject === 'physics' && !physQuestions) ||
    (activeSubject === 'mathematics' && !mathQuestions)
  );

  return (
    <div
      className="h-screen w-screen min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-dark-950 dark:text-slate-100 font-sans flex flex-col relative transition-colors"
      style={{
        '--accent-spotlight': accentSpotlight,
      } as React.CSSProperties}
    >
      <AmbientBackground />

      {/* Top Application Navbar */}
      <AppNavbar
        currentView={currentView}
        onNavigate={handleNavigate}
        cartCount={testCart.length}
        totalQuestions={questions.length}
        activeSubject={activeSubject}
        chemCount={chemQuestions?.length ?? 5712}
        physCount={physQuestions?.length ?? 4136}
        mathCount={mathQuestions?.length ?? 1269}
        onOpenDataBooklet={() => setIsDataBookletOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {isSubjectLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-slate-600 dark:text-slate-400 gap-3 relative z-10">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <p className="text-sm font-medium">
            Loading {activeSubject === 'physics' ? 'Physics' : activeSubject === 'mathematics' ? 'Mathematics' : 'Chemistry'} past papers & topical taxonomy...
          </p>
        </div>
      ) : datasetError && currentView !== 'home' && questions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-rose-500 dark:text-rose-400 gap-3 relative z-10">
          <p className="text-sm font-medium">Error: {datasetError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-200 dark:bg-dark-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-dark-750 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Main View Router */}
          {currentView === 'home' && (
            <React.Suspense fallback={<ViewLoadingFallback />}>
              <HomePage
                onNavigate={handleNavigate}
                questions={chemQuestions || []}
                physicsQuestions={physQuestions || []}
                mathematicsQuestions={mathQuestions || []}
              />
            </React.Suspense>
          )}

          {(currentView === 'chemistry-test-maker' || currentView === 'physics-test-maker' || currentView === 'mathematics-test-maker') && (
            <div className={`flex-1 min-h-0 min-w-0 w-auto flex flex-col overflow-hidden relative z-10 transition-[margin] duration-200 ${
              isDataBookletOpen ? (isDataBookletExpanded ? '2xl:mr-[960px]' : '2xl:mr-[560px]') : ''
            }`}>
              <CanvasErrorBoundary onResetFilters={handleResetFilters}>
                <React.Suspense fallback={<ViewLoadingFallback />}>
                  <TestMakerPage
                    key={activeSubject}
                    subject={activeSubject}
                    questions={questions}
                    cartQuestionIds={testCart}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                    onClearCart={handleClearCart}
                    onReorderCart={handleReorderCart}
                    testTitle={testTitle}
                    onSetTestTitle={setTestTitle}
                  />
                </React.Suspense>
              </CanvasErrorBoundary>
            </div>
          )}

          {(currentView === 'chemistry-topical' || currentView === 'physics-topical' || currentView === 'mathematics-topical') && (
            <div className={`flex-1 min-h-0 min-w-0 w-auto flex flex-col overflow-visible relative z-20 transition-[margin] duration-200 ${
              isDataBookletOpen ? (isDataBookletExpanded ? '2xl:mr-[960px]' : '2xl:mr-[560px]') : ''
            }`}>
              {/* Top Filter & Search Bar */}
              <TopBar
                key={activeSubject}
                filters={filters}
                onFilterChange={handleFilterChange}
                availableUnits={availableUnits}
                subtopicHierarchy={subtopicHierarchy}
                availableYears={availableYears}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalFiltered={filteredQuestions.length}
                totalMarks={totalMarks}
                onResetFilters={handleResetFilters}
                allQuestions={questions}
              />

              {/* Main Workspace: Left Drawer + Split Canvas */}
              <div className="flex-1 min-h-0 w-full flex overflow-hidden relative">
                <QuestionList
                  questions={filteredQuestions}
                  selectedQuestionId={activeQuestion?.id || null}
                  onSelectQuestion={(q) => setSelectedQuestionId(q.id)}
                  bookmarks={bookmarks}
                  onToggleBookmark={handleToggleBookmark}
                  questionStatuses={questionStatuses}
                  onCycleStatus={handleCycleStatus}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  onClearFilters={handleResetFilters}
                  isDrawerOpen={isQuestionDrawerOpen}
                  onCloseDrawer={() => setIsQuestionDrawerOpen(false)}
                />

                <CanvasErrorBoundary onResetFilters={handleResetFilters}>
                  <React.Suspense fallback={<ViewLoadingFallback />}>
                    <SplitViewer
                      question={activeQuestion}
                      prevQuestion={hasPrev ? filteredQuestions[currentIndex - 1] : null}
                      nextQuestion={hasNext ? filteredQuestions[currentIndex + 1] : null}
                      allQuestions={questions}
                      questions={filteredQuestions}
                      onSelectQuestionById={(id: string) => setSelectedQuestionId(id)}
                      viewMode={viewMode}
                      onToggleMarkScheme={handleToggleMarkScheme}
                      onSetViewMode={setViewMode}
                      onPrevQuestion={handlePrevQuestion}
                      onNextQuestion={handleNextQuestion}
                      hasPrev={hasPrev}
                      hasNext={hasNext}
                      currentIndex={currentIndex}
                      totalQuestions={filteredQuestions.length}
                      questionStatus={activeQuestion ? (questionStatuses[activeQuestion.id] || 'unattempted') : 'unattempted'}
                      onCycleStatus={() => activeQuestion && handleCycleStatus(activeQuestion.id)}
                      isBookmarked={activeQuestion ? bookmarks.has(activeQuestion.id) : false}
                      onToggleBookmark={handleToggleActiveBookmark}
                      onOpenQuestionList={() => setIsQuestionDrawerOpen(true)}
                    />
                  </React.Suspense>
                </CanvasErrorBoundary>
              </div>
            </div>
          )}
        </>
      )}

      <DataBookletDrawer
        isOpen={isDataBookletOpen}
        onClose={() => setIsDataBookletOpen(false)}
        activeSubject={activeSubject}
        onExpandedChange={setIsDataBookletExpanded}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpen={() => setIsCommandPaletteOpen(true)}
        currentView={currentView}
        activeSubject={activeSubject}
        onNavigate={handleNavigate}
        onToggleDataBooklet={() => setIsDataBookletOpen((prev) => !prev)}
        onResetFilters={handleResetFilters}
        onToggleMarkScheme={handleToggleMarkScheme}
        onToggleBookmarkedOnly={() => handleTabChange(activeTab === 'bookmarked' ? 'all' : 'bookmarked')}
        onSelectUnitFilter={handleSelectUnitFromPalette}
        onSelectQuestion={handleSelectQuestionFromPalette}
        chemQuestions={chemQuestions}
        physQuestions={physQuestions}
        mathQuestions={mathQuestions}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <Analytics />
    </div>
  );
};

export default App;
