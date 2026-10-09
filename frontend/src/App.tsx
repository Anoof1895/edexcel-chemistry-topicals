import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { QuestionItem, FilterState, ViewMode, AppView, Subject } from './types';
import { AppNavbar } from './components/AppNavbar';
import { TopBar } from './components/TopBar';
import { buildStaticSubtopicHierarchy } from './constants/taxonomy';
import { getQuestionType } from './utils/questionClassification';
import { QuestionList } from './components/QuestionList';
import { SplitViewer } from './components/SplitViewer';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { useProgress } from './context/ProgressContext';
import { Loader2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

// Route-level code-splitting for large views
const HomePage = React.lazy(() => import('./components/HomePage').then((m) => ({ default: m.HomePage })));
const TestMakerPage = React.lazy(() => import('./components/TestMakerPage').then((m) => ({ default: m.TestMakerPage })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 gap-3">
    <Loader2 className="w-7 h-7 text-cyan-500 animate-spin" />
    <span className="text-xs font-medium">Loading view...</span>
  </div>
);

// URL hash router helper: parses view and optional ?q=question_id
const parseHashRoute = (): { view: AppView; questionId: string | null } => {
  try {
    const fullHash = window.location.hash || '';
    const [hashPath, hashQuery] = fullHash.split('?');
    const lowerPath = (hashPath || '').toLowerCase();

    let view: AppView = 'home';
    if (lowerPath.includes('physics-test-maker') || lowerPath.includes('physics/test-maker')) {
      view = 'physics-test-maker';
    } else if (lowerPath.includes('physics-topical') || lowerPath.includes('physics/topical') || lowerPath.includes('physics')) {
      view = 'physics-topical';
    } else if (lowerPath.includes('test-maker')) {
      view = 'chemistry-test-maker';
    } else if (lowerPath.includes('topical')) {
      view = 'chemistry-topical';
    }

    let questionId: string | null = null;
    if (hashQuery) {
      const params = new URLSearchParams(hashQuery);
      questionId = params.get('q');
    }

    return { view, questionId };
  } catch {
    return { view: 'home', questionId: null };
  }
};

export const App: React.FC = () => {
  const [chemQuestions, setChemQuestions] = useState<QuestionItem[] | null>(null);
  const [physQuestions, setPhysQuestions] = useState<QuestionItem[] | null>(null);
  const [loadingSubject, setLoadingSubject] = useState<Subject | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);

  const initialRoute = useRef(parseHashRoute());
  const [currentView, setCurrentView] = useState<AppView>(initialRoute.current.view);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(initialRoute.current.questionId);

  const activeSubject: Subject = currentView.startsWith('physics') ? 'physics' : 'chemistry';

  const handleNavigate = useCallback((view: AppView) => {
    setCurrentView(view);
    if (view === 'physics-topical') {
      window.location.hash = selectedQuestionId ? `#/physics/topical?q=${encodeURIComponent(selectedQuestionId)}` : '#/physics/topical';
    } else if (view === 'physics-test-maker') {
      window.location.hash = '#/physics/test-maker';
    } else if (view === 'chemistry-topical') {
      window.location.hash = selectedQuestionId ? `#/topical?q=${encodeURIComponent(selectedQuestionId)}` : '#/topical';
    } else if (view === 'chemistry-test-maker') {
      window.location.hash = '#/test-maker';
    } else {
      window.location.hash = '#/';
    }
  }, [selectedQuestionId]);

  // Listen to popstate / hashchange for browser back and forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const { view, questionId } = parseHashRoute();
      setCurrentView((prev) => (prev !== view ? view : prev));
      if (questionId) {
        setSelectedQuestionId(questionId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync selected question ID to URL hash in topical view
  useEffect(() => {
    if (currentView !== 'chemistry-topical' && currentView !== 'physics-topical') return;
    if (!selectedQuestionId) return;

    const basePath = currentView === 'physics-topical' ? '#/physics/topical' : '#/topical';
    const newHash = `${basePath}?q=${encodeURIComponent(selectedQuestionId)}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [currentView, selectedQuestionId]);

  // Dynamic Browser Tab Title
  useEffect(() => {
    if (currentView === 'physics-topical') {
      document.title = 'Physics Topicals | Edexcel IAL Topicals';
    } else if (currentView === 'physics-test-maker') {
      document.title = 'Physics Test Maker | Edexcel IAL Topicals';
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
    return chemQuestions || [];
  }, [activeSubject, physQuestions, chemQuestions]);

  // Default view: Question Only mode so answers aren't spoiled
  const [viewMode, setViewMode] = useState<ViewMode>('question-only');

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

  const testCart = activeSubject === 'physics' ? physTestCart : chemTestCart;

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

  const testTitle = activeSubject === 'physics' ? physTestTitle : chemTestTitle;

  const setTestTitle = useCallback((title: string) => {
    if (activeSubject === 'physics') {
      setPhysTestTitle(title);
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
    localStorage.setItem('chem_test_title', chemTestTitle);
  }, [chemTestTitle]);

  useEffect(() => {
    localStorage.setItem('phys_test_title', physTestTitle);
  }, [physTestTitle]);

  const handleAddToCart = useCallback((id: string) => {
    if (activeSubject === 'physics') {
      setPhysTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setChemTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  }, [activeSubject]);

  const handleRemoveFromCart = useCallback((id: string) => {
    if (activeSubject === 'physics') {
      setPhysTestCart((prev) => prev.filter((item) => item !== id));
    } else {
      setChemTestCart((prev) => prev.filter((item) => item !== id));
    }
  }, [activeSubject]);

  const handleClearCart = useCallback(() => {
    if (activeSubject === 'physics') {
      setPhysTestCart([]);
    } else {
      setChemTestCart([]);
    }
  }, [activeSubject]);

  const handleReorderCart = useCallback((newIds: string[]) => {
    if (activeSubject === 'physics') {
      setPhysTestCart(newIds);
    } else {
      setChemTestCart(newIds);
    }
  }, [activeSubject]);

  // On-demand dataset loading per active subject (avoids fetching both concurrently on cold start)
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
        .then((data: QuestionItem[]) => {
          if (isMounted) {
            setChemQuestions(data);
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
        .then((data: QuestionItem[]) => {
          if (isMounted) {
            setPhysQuestions(data);
            setLoadingSubject(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setDatasetError(err.message || 'Failed to load Physics dataset');
            setLoadingSubject(null);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeSubject, currentView, chemQuestions, physQuestions]);

  // Active drawer tab: 'all' | 'bookmarked'
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarked'>('all');

  // Responsive question list drawer state (< 1024px)
  const [isQuestionDrawerOpen, setIsQuestionDrawerOpen] = useState<boolean>(false);

  // Filter state for topical explorer
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
      }
    } else if (!selectedQuestionId && questions.length > 0) {
      setSelectedQuestionId(questions[0].id);
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
      if (filters.selectedUnits.length > 0 && !filters.selectedUnits.includes(q.unit)) {
        return false;
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
        const matchTopic = (q.topic || '').toLowerCase().includes(query);
        const matchSubtopic = (q.subtopic || '').toLowerCase().includes(query);
        const matchSubs = (q.subtopics || []).some((s) => s.toLowerCase().includes(query));
        const matchStem = (q.stemSummary || '').toLowerCase().includes(query);
        const matchSeries = (q.series || '').toLowerCase().includes(query);
        const matchSession = (q.session || '').toLowerCase().includes(query);
        const matchPaper = (q.paperCode || q.paper_code || q.unitCode || '').toLowerCase().includes(query);
        if (!matchQNum && !matchTopic && !matchSubtopic && !matchSubs && !matchStem && !matchSeries && !matchSession && !matchPaper) return false;
      }

      return true;
    });
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
  // - ArrowLeft / [: Previous question
  // - ArrowRight / ]: Next question
  // - M or Space: Toggle mark scheme visibility
  // - B: Toggle Bookmark
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentView !== 'chemistry-topical' && currentView !== 'physics-topical') return;

      // Don't trigger shortcuts if typing inside an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === '[') {
        e.preventDefault();
        handlePrevQuestion();
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        e.preventDefault();
        handleNextQuestion();
      } else if (e.key === ' ' || e.code === 'Space' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMarkScheme();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleToggleActiveBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, handlePrevQuestion, handleNextQuestion, handleToggleMarkScheme, handleToggleActiveBookmark]);

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

  const totalMarks = useMemo(() => {
    return filteredQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }, [filteredQuestions]);

  const isSubjectLoading = currentView !== 'home' && (
    loadingSubject === activeSubject ||
    (activeSubject === 'chemistry' && !chemQuestions) ||
    (activeSubject === 'physics' && !physQuestions)
  );

  if (isSubjectLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-950 text-slate-600 dark:text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-sm font-medium">Loading {activeSubject === 'physics' ? 'Physics' : 'Chemistry'} past papers & topical taxonomy...</p>
      </div>
    );
  }

  if (datasetError && currentView !== 'home' && questions.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-950 text-rose-500 dark:text-rose-400 gap-3">
        <p className="text-sm font-medium">Error: {datasetError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-200 dark:bg-dark-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-dark-750 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* Top Application Navbar */}
      <AppNavbar
        currentView={currentView}
        onNavigate={handleNavigate}
        cartCount={testCart.length}
        totalQuestions={questions.length}
        activeSubject={activeSubject}
        chemCount={chemQuestions?.length ?? 5712}
        physCount={physQuestions?.length ?? 4136}
      />

      {/* Main View Router */}
      {currentView === 'home' && (
        <React.Suspense fallback={<ViewLoadingFallback />}>
          <HomePage
            onNavigate={handleNavigate}
            questions={chemQuestions || []}
            physicsQuestions={physQuestions || []}
          />
        </React.Suspense>
      )}

      {(currentView === 'chemistry-test-maker' || currentView === 'physics-test-maker') && (
        <React.Suspense fallback={<ViewLoadingFallback />}>
          <TestMakerPage
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
      )}

      {(currentView === 'chemistry-topical' || currentView === 'physics-topical') && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Filter & Search Bar */}
          <TopBar
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
          <div className="flex-1 flex overflow-hidden relative">
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

            <CanvasErrorBoundary>
              <SplitViewer
                question={activeQuestion}
                prevQuestion={hasPrev ? filteredQuestions[currentIndex - 1] : null}
                nextQuestion={hasNext ? filteredQuestions[currentIndex + 1] : null}
                allQuestions={questions}
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
            </CanvasErrorBoundary>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <Analytics />
    </div>
  );
};

export default App;
