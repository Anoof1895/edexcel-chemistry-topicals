import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bookmark, 
  Paperclip, 
  FilterX,
  ChevronLeft, 
  ChevronRight,
  List,
  X
} from 'lucide-react';
import { QuestionItem, MasteryStatus } from '../types';
import { getQuestionType } from '../utils/questionClassification';

interface QuestionListProps {
  questions: QuestionItem[];
  selectedQuestionId: string | null;
  onSelectQuestion: (question: QuestionItem) => void;
  bookmarks: Set<string>;
  onToggleBookmark: (id: string) => void;
  questionStatuses: Record<string, MasteryStatus>;
  onCycleStatus: (id: string) => void;
  activeTab: 'all' | 'bookmarked';
  onTabChange: (tab: 'all' | 'bookmarked') => void;
  onClearFilters: () => void;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

export const cleanSubtopic = (title: string = ''): string => {
  return title.replace(/^(\d+(\.\d+)*(-\d+(\.\d+)*)?:\s*|topic\s+\d+:\s*)/i, '').trim();
};

export const formatPaperSeriesYear = (q: QuestionItem): string => {
  const session = q.session || '';
  let shortSession = session;
  const lower = session.toLowerCase();
  if (lower.includes('jan')) shortSession = 'Jan';
  else if (lower.includes('june') || lower.includes('may')) shortSession = 'June';
  else if (lower.includes('oct') || lower.includes('nov')) shortSession = 'Oct';

  const seriesPart = shortSession && q.year ? `${shortSession} ${q.year}` : (q.series || `${q.unit} • ${q.year}`);
  const codePart = q.paperCode || q.paper_code || q.unitCode || '';
  return codePart ? `${seriesPart} · ${codePart}` : seriesPart;
};

export const getStatusConfig = (status: MasteryStatus = 'unattempted') => {
  switch (status) {
    case 'mastered':
      return {
        label: 'Mastered',
        shortLabel: 'Mastered',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
      };
    case 'review':
      return {
        label: 'Review Needed',
        shortLabel: 'Review',
        bg: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/30',
        dot: 'bg-amber-500 dark:bg-amber-400',
      };
    case 'unattempted':
    default:
      return {
        label: 'Unattempted',
        shortLabel: 'Unattempted',
        bg: 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-400 dark:border-slate-700/60',
        dot: 'bg-slate-400 dark:bg-slate-500',
      };
  }
};

const PAGE_SIZE = 20;

function getPaginationItems(current: number, total: number): (number | '...')[] {
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  bookmarks,
  onToggleBookmark,
  questionStatuses,
  onCycleStatus,
  activeTab,
  onTabChange,
  onClearFilters,
  isDrawerOpen = false,
  onCloseDrawer
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const listRef = useRef<HTMLDivElement>(null);
  const prevSelectedIdRef = useRef<string | null>(selectedQuestionId);
  const firstQuestionId = questions[0]?.id;
  const prevFirstIdRef = useRef<string | undefined>(firstQuestionId);

  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));

  // Sync currentPage when active question changes (e.g. via Next/Prev navigation or direct selection)
  useEffect(() => {
    if (selectedQuestionId !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedQuestionId;
      if (selectedQuestionId) {
        const idx = questions.findIndex((q) => q.id === selectedQuestionId);
        if (idx !== -1) {
          const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
          setCurrentPage(targetPage);
        }
      }
    }
  }, [selectedQuestionId, questions]);

  // Handle filter changes (e.g. topic filter or search change changes the question list)
  useEffect(() => {
    if (firstQuestionId !== prevFirstIdRef.current) {
      prevFirstIdRef.current = firstQuestionId;
      if (selectedQuestionId) {
        const idx = questions.findIndex((q) => q.id === selectedQuestionId);
        if (idx !== -1) {
          setCurrentPage(Math.floor(idx / PAGE_SIZE) + 1);
          return;
        }
      }
      setCurrentPage(1);
    }
  }, [firstQuestionId, selectedQuestionId, questions]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Reset to page 1 when switching between All and Bookmarked tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedQuestions = useMemo(() => {
    return questions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [questions, startIndex]);

  return (
    <>
      {/* Mobile/Tablet Backdrop (< 1024px) */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 dark:bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-150"
          onClick={onCloseDrawer}
        />
      )}

      {/* Question List Sidebar / Slide-Over Drawer */}
      <aside 
        className={`
          border-r border-slate-200 dark:border-dark-800 bg-white/95 lg:bg-slate-50/70 dark:bg-dark-900/95 lg:dark:bg-dark-900/50 flex flex-col shrink-0 select-none overflow-hidden transition-transform duration-200
          fixed inset-y-0 left-0 z-40 w-80 sm:w-84 max-w-[85vw] shadow-2xl lg:shadow-none
          lg:static lg:w-80 lg:z-auto lg:translate-x-0
          ${isDrawerOpen ? 'translate-x-0 flex' : '-translate-x-full lg:translate-x-0 hidden lg:flex'}
        `}
      >
        {/* Mobile/Tablet Drawer Header (< 1024px) */}
        <div className="h-12 px-3 border-b border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex items-center justify-between lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span className="font-bold text-xs text-slate-800 dark:text-white">Question Navigator</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-750 text-cyan-700 dark:text-cyan-300">
              {questions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseDrawer}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Tabs: All Questions vs Bookmarked */}
        <div className="p-2 border-b border-slate-200 dark:border-dark-800 bg-white/80 dark:bg-dark-900/80 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-slate-100 dark:bg-dark-800 text-cyan-700 dark:text-cyan-300 shadow-sm border border-slate-200 dark:border-dark-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-dark-850'
            }`}
          >
            <span>All Questions</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-dark-750 text-slate-700 dark:text-slate-400">
              {activeTab === 'all' ? questions.length : 'All'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('bookmarked')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bookmarked'
                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-sm border border-amber-300 dark:border-amber-500/30'
                : 'text-slate-600 hover:text-amber-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-dark-850'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarks.size > 0 ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>Bookmarked</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
              {bookmarks.size}
            </span>
          </button>
        </div>

        {/* Scrollable Questions List Container */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-transparent"
        >
          {paginatedQuestions.length === 0 ? (
            activeTab === 'bookmarked' ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <Bookmark className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No bookmarks yet</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-600 mt-1">Press [B] or click the bookmark icon on any question to save it for review.</p>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <FilterX className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No questions match your filters</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-600 mt-1 mb-3">Try clearing search terms or selecting different topics.</p>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-750 text-xs text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-dark-700 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            )
          ) : (
            paginatedQuestions.map((q) => {
              const isSelected = q.id === selectedQuestionId;
              const isBookmarked = bookmarks.has(q.id);
              const status = questionStatuses[q.id] || 'unattempted';
              const statusCfg = getStatusConfig(status);
              const qType = getQuestionType(q);
              const paperInfo = formatPaperSeriesYear(q);
              const rawSubtopic = q.subtopic || q.topic || '';
              const cleanedSubtopic = cleanSubtopic(rawSubtopic);

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    onSelectQuestion(q);
                    if (onCloseDrawer) {
                      onCloseDrawer();
                    }
                  }}
                  className={`group relative rounded-xl py-2.5 px-3.5 cursor-pointer transition-all duration-150 border-y border-r border-l-4 ${
                    isSelected
                      ? 'bg-cyan-50/70 dark:bg-dark-800/95 border-y-cyan-300 dark:border-y-cyan-500/40 border-r-cyan-300 dark:border-r-cyan-500/40 border-l-cyan-500 dark:border-l-cyan-400 shadow-sm dark:shadow-md dark:shadow-cyan-950/50 text-slate-900 dark:text-white ring-1 ring-cyan-500/20 dark:ring-cyan-500/25'
                      : 'bg-white dark:bg-dark-850/40 border-slate-200/80 dark:border-dark-800/70 border-l-transparent hover:bg-slate-50 dark:hover:bg-dark-800/70 hover:border-slate-300 dark:hover:border-dark-700/80 hover:border-l-slate-400 dark:hover:border-l-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {/* Top Row: Q Number, Mark Badge, Type Pill, Stem Pill, Bookmark Action */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Prominent Question Number */}
                      <span className={`font-bold text-sm tracking-tight ${isSelected ? 'text-cyan-950 dark:text-white' : 'text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-white'}`}>
                        Q{q.questionNumber}
                      </span>

                      {/* Marks Badge */}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-dark-750 text-slate-900 dark:text-slate-100 border border-amber-200 dark:border-amber-500/20">
                        {q.marks}m
                      </span>

                      {/* Question Type Pill */}
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          qType === 'mcq'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {qType === 'mcq' ? 'MCQ' : 'Theory'}
                      </span>

                      {/* Stitched Shared Stem Indicator */}
                      {q.hasStem && (
                        <span 
                          title="Contains stitched shared question stem"
                          className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25"
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          Stem
                        </span>
                      )}
                    </div>

                    {/* Bookmark Action */}
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(q.id);
                        }}
                        title={isBookmarked ? "Remove bookmark [B]" : "Bookmark question [B]"}
                        className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-dark-700/80 transition-colors ${
                          isBookmarked ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-row: Paper series and year clearly with improved contrast */}
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 flex items-center gap-1.5">
                    <span>{paperInfo}</span>
                  </div>

                  {/* Subtopic Title: Cleanly truncated / uncluttered on unselected, expanded on selected */}
                  <div 
                    className={`mt-1 transition-colors ${
                      isSelected 
                        ? 'text-xs text-cyan-800 dark:text-cyan-300 font-medium line-clamp-2' 
                        : 'text-[11px] text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 truncate'
                    }`}
                    title={rawSubtopic}
                  >
                    {isSelected ? rawSubtopic : (cleanedSubtopic || rawSubtopic)}
                  </div>

                  {/* Bottom Row: Status Pill & MCQ Answer Key (if available) */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-dark-800/60 text-[10px]">
                    {/* Status Pill Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCycleStatus(q.id);
                      }}
                      title={`Status: ${statusCfg.label}. Click to cycle: Unattempted → Review Needed → Mastered`}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium border transition-all ${statusCfg.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span>{statusCfg.label}</span>
                    </button>

                    {/* MCQ Answer Key if present */}
                    {qType === 'mcq' && q.answer && (
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        Key: [{q.answer}]
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {questions.length > 0 && (
          <div className="p-2 border-t border-slate-200 dark:border-dark-800 bg-white/90 dark:bg-dark-900/90 flex flex-col items-center gap-1.5 shrink-0">
            <div className="flex items-center justify-between w-full px-1 text-[11px] text-slate-600 dark:text-slate-400">
              <span>
                Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</span>–<span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(startIndex + PAGE_SIZE, questions.length)}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{questions.length}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1 w-full">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  currentPage <= 1
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 active:scale-95'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPaginationItems(currentPage, totalPages).map((item, idx) => {
                if (item === '...') {
                  return (
                    <span key={`dots-${idx}`} className="w-5 text-center text-slate-400 dark:text-slate-500 text-xs select-none">
                      ...
                    </span>
                  );
                }

                const isCurrent = item === currentPage;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePageChange(item)}
                    className={`min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 dark:border-cyan-500/40 shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 border border-transparent'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  currentPage >= totalPages
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 active:scale-95'
                }`}
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default QuestionList;
