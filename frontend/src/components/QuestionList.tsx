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

export const getStatusConfig = (status: MasteryStatus = 'unattempted') => {
  switch (status) {
    case 'mastered':
      return {
        label: 'Mastered',
        shortLabel: 'Mastered',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    case 'review':
      return {
        label: 'Review Needed',
        shortLabel: 'Review',
        bg: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    case 'unattempted':
    default:
      return {
        label: 'Unattempted',
        shortLabel: 'Unattempted',
        bg: 'bg-slate-800/80 hover:bg-slate-750 text-slate-400 border-slate-700/60',
        dot: 'bg-slate-500',
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-150"
          onClick={onCloseDrawer}
        />
      )}

      {/* Question List Sidebar / Slide-Over Drawer */}
      <aside 
        className={`
          border-r border-dark-800 bg-dark-900/95 lg:bg-dark-900/50 flex flex-col shrink-0 select-none overflow-hidden transition-transform duration-200
          fixed inset-y-0 left-0 z-40 w-80 sm:w-84 max-w-[85vw] shadow-2xl lg:shadow-none
          lg:static lg:w-80 lg:z-auto lg:translate-x-0
          ${isDrawerOpen ? 'translate-x-0 flex' : '-translate-x-full lg:translate-x-0 hidden lg:flex'}
        `}
      >
        {/* Mobile/Tablet Drawer Header (< 1024px) */}
        <div className="h-12 px-3 border-b border-dark-800 bg-dark-900 flex items-center justify-between lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs text-white">Question Navigator</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-750 text-cyan-300">
              {questions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseDrawer}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Tabs: All Questions vs Bookmarked */}
        <div className="p-2 border-b border-dark-800 bg-dark-900/80 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-dark-800 text-cyan-300 shadow-sm border border-dark-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850'
            }`}
          >
            <span>All Questions</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-750 text-slate-400">
              {activeTab === 'all' ? questions.length : 'All'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('bookmarked')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bookmarked'
                ? 'bg-amber-500/15 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-slate-400 hover:text-amber-300 hover:bg-dark-850'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarks.size > 0 ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Bookmarked</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
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
              <div className="p-8 text-center text-slate-500">
                <Bookmark className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-semibold text-slate-400">No bookmarks yet</p>
                <p className="text-[11px] text-slate-600 mt-1">Press [B] or click the bookmark icon on any question to save it for review.</p>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <FilterX className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-semibold text-slate-400">No questions match your filters</p>
                <p className="text-[11px] text-slate-600 mt-1 mb-3">Try clearing search terms or selecting different topics.</p>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-xs text-cyan-400 border border-dark-700 transition-colors"
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

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    onSelectQuestion(q);
                    if (onCloseDrawer) {
                      onCloseDrawer();
                    }
                  }}
                  className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-150 border ${
                    isSelected
                      ? 'bg-dark-800/90 border-cyan-500/60 shadow-lg shadow-cyan-950/40 text-white ring-1 ring-cyan-500/30'
                      : 'bg-dark-850/40 border-dark-800/60 hover:bg-dark-800/60 hover:border-dark-700 text-slate-300'
                  }`}
                >
                  {/* Top Row: Q Number, Marks, Stem Pill, Bookmark Action */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-cyan-300 group-hover:text-cyan-200">
                        Q{q.questionNumber}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-dark-750 text-slate-300 border border-dark-700">
                        {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                      </span>
                      {q.hasStem && (
                        <span 
                          title="Contains stitched shared question stem"
                          className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          Stem
                        </span>
                      )}
                    </div>

                    {/* Actions: Bookmark */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(q.id);
                        }}
                        title={isBookmarked ? "Remove bookmark [B]" : "Bookmark question [B]"}
                        className={`p-1.5 rounded hover:bg-dark-700/80 transition-colors ${
                          isBookmarked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Topic & Subtopic */}
                  <div className="text-xs text-slate-300 line-clamp-1 font-medium mb-2">
                    {q.subtopic || q.topic}
                  </div>

                  {/* Bottom Row: Status Pill & Paper info */}
                  <div className="flex items-center justify-between pt-2 border-t border-dark-800/60 text-[10px]">
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

                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                      <span className="truncate max-w-[90px]">{q.series || `${q.unit} • ${q.year}`}</span>
                      <span className="font-mono text-[9px] uppercase tracking-wider">{q.paperCode || q.unitCode}</span>
                    </div>
                  </div>

                  {/* Left Active Accent Bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-500 rounded-r"></div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {questions.length > 0 && (
          <div className="p-2 border-t border-dark-800 bg-dark-900/90 flex flex-col items-center gap-1.5 shrink-0">
            <div className="flex items-center justify-between w-full px-1 text-[11px] text-slate-400">
              <span>
                Showing <span className="font-semibold text-slate-200">{startIndex + 1}</span>–<span className="font-semibold text-slate-200">{Math.min(startIndex + PAGE_SIZE, questions.length)}</span> of <span className="font-semibold text-slate-200">{questions.length}</span>
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
                    ? 'text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-300 hover:text-white hover:bg-dark-800 active:scale-95'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPaginationItems(currentPage, totalPages).map((item, idx) => {
                if (item === '...') {
                  return (
                    <span key={`dots-${idx}`} className="w-5 text-center text-slate-500 text-xs select-none">
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
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800 border border-transparent'
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
                    ? 'text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-300 hover:text-white hover:bg-dark-800 active:scale-95'
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
