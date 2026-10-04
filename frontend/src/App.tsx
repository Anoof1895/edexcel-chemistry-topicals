import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { QuestionItem, FilterState, ViewMode, AppView, Subject } from './types';
import { AppNavbar } from './components/AppNavbar';
import { HomePage } from './components/HomePage';
import { TestMakerPage } from './components/TestMakerPage';
import { TopBar } from './components/TopBar';
import { buildStaticSubtopicHierarchy } from './constants/taxonomy';
import { getQuestionType } from './utils/questionClassification';
import { QuestionList } from './components/QuestionList';
import { SplitViewer } from './components/SplitViewer';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { useProgress } from './context/ProgressContext';
import { Loader2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

export const App: React.FC = () => {
  const [chemQuestions, setChemQuestions] = useState<QuestionItem[] | null>(null);
  const [physQuestions, setPhysQuestions] = useState<QuestionItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View routing: 'home' | 'chemistry-topical' | 'chemistry-test-maker' | 'physics-topical' | 'physics-test-maker'
  const getInitialView = (): AppView => {
    try {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('physics-test-maker') || hash.includes('physics/test-maker')) return 'physics-test-maker';
      if (hash.includes('physics-topical') || hash.includes('physics/topical') || hash.includes('physics')) return 'physics-topical';
      if (hash.includes('test-maker')) return 'chemistry-test-maker';
      if (hash.includes('topical')) return 'chemistry-topical';
    } catch {
      // fallback
    }
    return 'home';
  };

  const [currentView, setCurrentView] = useState<AppView>(getInitialView);

  const activeSubject: Subject = currentView.startsWith('physics') ? 'physics' : 'chemistry';

  const handleNavigate = useCallback((view: AppView) => {
    setCurrentView(view);
    if (view === 'physics-topical') {
      window.location.hash = '#/physics/topical';
    } else if (view === 'physics-test-maker') {
      window.location.hash = '#/physics/test-maker';
    } else if (view === 'chemistry-topical') {
      window.location.hash = '#/topical';
    } else if (view === 'chemistry-test-maker') {
      window.location.hash = '#/test-maker';
    } else {
      window.location.hash = '#/';
    }
  }, []);

  // Listen to popstate / hashchange for browser back and forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('physics-test-maker') || hash.includes('physics/test-maker')) {
        setCurrentView('physics-test-maker');
      } else if (hash.includes('physics-topical') || hash.includes('physics/topical') || hash.includes('physics')) {
        setCurrentView('physics-topical');
      } else if (hash.includes('test-maker')) {
        setCurrentView('chemistry-test-maker');
      } else if (hash.includes('topical')) {
        setCurrentView('chemistry-topical');
      } else {
        setCurrentView('home');
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

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  
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

  // Load dataset.json and dataset_physics.json in parallel
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadChem = fetch('/dataset.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load Chemistry dataset: ${res.statusText}`);
        return res.json();
      })
      .then((data: QuestionItem[]) => {
        if (isMounted) setChemQuestions(data);
        return data;
      });

    const loadPhys = fetch('/dataset_physics.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load Physics dataset: ${res.statusText}`);
        return res.json();
      })
      .then((data: QuestionItem[]) => {
        if (isMounted) setPhysQuestions(data);
        return data;
      });

    Promise.allSettled([loadChem, loadPhys])
      .then(([chemRes, physRes]) => {
        if (!isMounted) return;
        if (chemRes.status === 'rejected' && physRes.status === 'rejected') {
          setError('Failed to load datasets.');
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-950 text-slate-600 dark:text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-sm font-medium">Loading Edexcel IAL Topicals Hub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-950 text-rose-500 dark:text-rose-400 gap-3">
        <p className="text-sm font-medium">Error: {error}</p>
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
        chemCount={chemQuestions?.length ?? 0}
        physCount={physQuestions?.length ?? 0}
      />

      {/* Main View Router */}
      {currentView === 'home' && (
        <HomePage
          onNavigate={handleNavigate}
          questions={chemQuestions || []}
          physicsQuestions={physQuestions || []}
        />
      )}

      {(currentView === 'chemistry-test-maker' || currentView === 'physics-test-maker') && (
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

            <SplitViewer
              question={activeQuestion}
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
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <Analytics />
    </div>
  );
};

export default App;
