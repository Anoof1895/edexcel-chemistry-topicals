import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { QuestionItem, FilterState, ViewMode, MasteryStatus, AppView } from './types';
import { AppNavbar } from './components/AppNavbar';
import { HomePage } from './components/HomePage';
import { TestMakerPage } from './components/TestMakerPage';
import { TopBar } from './components/TopBar';
import { buildStaticSubtopicHierarchy } from './constants/taxonomy';
import { getQuestionType } from './utils/questionClassification';
import { QuestionList } from './components/QuestionList';
import { SplitViewer } from './components/SplitViewer';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View routing: 'home' | 'chemistry-topical' | 'chemistry-test-maker'
  const getInitialView = (): AppView => {
    try {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('test-maker')) return 'chemistry-test-maker';
      if (hash.includes('topical')) return 'chemistry-topical';
    } catch {
      // fallback
    }
    return 'home';
  };

  const [currentView, setCurrentView] = useState<AppView>(getInitialView);

  const handleNavigate = useCallback((view: AppView) => {
    setCurrentView(view);
    if (view === 'chemistry-topical') {
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
      if (hash.includes('test-maker')) {
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

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  
  // Default view: Question Only mode so answers aren't spoiled
  const [viewMode, setViewMode] = useState<ViewMode>('question-only');

  // Persisted bookmarks
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chem_bookmarks');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persisted question statuses: 'unattempted' | 'review' | 'mastered'
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, MasteryStatus>>(() => {
    try {
      const saved = localStorage.getItem('chem_question_status');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persisted custom test maker cart
  const [testCart, setTestCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chem_test_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [testTitle, setTestTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('chem_test_title') || 'Custom Chemistry Mock Exam';
    } catch {
      return 'Custom Chemistry Mock Exam';
    }
  });

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

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('chem_bookmarks', JSON.stringify(Array.from(bookmarks)));
  }, [bookmarks]);

  // Save question statuses to localStorage
  useEffect(() => {
    localStorage.setItem('chem_question_status', JSON.stringify(questionStatuses));
  }, [questionStatuses]);

  // Save test cart to localStorage
  useEffect(() => {
    localStorage.setItem('chem_test_cart', JSON.stringify(testCart));
  }, [testCart]);

  useEffect(() => {
    localStorage.setItem('chem_test_title', testTitle);
  }, [testTitle]);

  const handleAddToCart = useCallback((id: string) => {
    setTestCart((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleRemoveFromCart = useCallback((id: string) => {
    setTestCart((prev) => prev.filter((item) => item !== id));
  }, []);

  const handleClearCart = useCallback(() => {
    setTestCart([]);
  }, []);

  const handleReorderCart = useCallback((newIds: string[]) => {
    setTestCart(newIds);
  }, []);

  // Load dataset.json
  useEffect(() => {
    fetch('/dataset.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load dataset: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: QuestionItem[]) => {
        setQuestions(data);
        if (data.length > 0) {
          setSelectedQuestionId(data[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
    return buildStaticSubtopicHierarchy(filters.selectedUnits, questions);
  }, [questions, filters.selectedUnits]);

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

  // Cycle status: unattempted -> review -> mastered -> unattempted
  const cycleStatus = (status: MasteryStatus = 'unattempted'): MasteryStatus => {
    if (status === 'unattempted') return 'review';
    if (status === 'review') return 'mastered';
    return 'unattempted';
  };

  const handleCycleStatus = useCallback((id: string) => {
    setQuestionStatuses((prev) => {
      const current = prev[id] || 'unattempted';
      const next = cycleStatus(current);
      return { ...prev, [id]: next };
    });
  }, []);

  const handleToggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleActiveBookmark = useCallback(() => {
    if (!activeQuestion) return;
    handleToggleBookmark(activeQuestion.id);
  }, [activeQuestion, handleToggleBookmark]);

  // Keyboard navigation shortcuts (active in Topical Explorer mode):
  // - ArrowLeft / [: Previous question
  // - ArrowRight / ]: Next question
  // - M or Space: Toggle mark scheme visibility
  // - B: Toggle Bookmark
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentView !== 'chemistry-topical') return;

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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-950 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-sm font-medium">Loading Edexcel IAL Chemistry Hub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-950 text-rose-400 gap-3">
        <p className="text-sm font-medium">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Application Navbar */}
      <AppNavbar
        currentView={currentView}
        onNavigate={handleNavigate}
        cartCount={testCart.length}
        totalQuestions={questions.length}
      />

      {/* Main View Router */}
      {currentView === 'home' && (
        <HomePage
          onNavigate={handleNavigate}
          questions={questions}
        />
      )}

      {currentView === 'chemistry-test-maker' && (
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

      {currentView === 'chemistry-topical' && (
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
    </div>
  );
};

export default App;
