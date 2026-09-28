import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Paperclip, 
  Eye, 
  EyeOff, 
  Columns, 
  Bookmark, 
  FileText, 
  X, 
  ExternalLink, 
  Calendar,
  List,
  CheckCircle2
} from 'lucide-react';
import { QuestionItem, ViewMode, MasteryStatus } from '../types';
import { ImageCanvas } from './ImageCanvas';
import { getStatusConfig } from './QuestionList';
import { getQuestionType } from '../utils/questionClassification';
import { getFullImageUrl } from '../utils/imageUrl';

interface SplitViewerProps {
  question: QuestionItem | null;
  allQuestions?: QuestionItem[];
  onSelectQuestionById?: (id: string) => void;
  viewMode: ViewMode;
  onToggleMarkScheme: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalQuestions: number;
  questionStatus: MasteryStatus;
  onCycleStatus: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onOpenQuestionList?: () => void;
}

export const SplitViewer: React.FC<SplitViewerProps> = ({
  question,
  allQuestions,
  onSelectQuestionById,
  viewMode,
  onToggleMarkScheme,
  onSetViewMode,
  onPrevQuestion,
  onNextQuestion,
  hasPrev,
  hasNext,
  currentIndex,
  totalQuestions,
  questionStatus,
  onCycleStatus,
  isBookmarked,
  onToggleBookmark,
  onOpenQuestionList,
}) => {
  const [isFullQuestionOpen, setIsFullQuestionOpen] = useState(false);
  // Mobile specific view tab: 'question' | 'ms'
  const [mobileTab, setMobileTab] = useState<'question' | 'ms'>('question');

  // Sibling subparts belonging to this question's parent in the same paper
  const siblingSubparts = useMemo(() => {
    if (!question || !allQuestions) return [];
    const pq = question.parentQuestion;
    const pqId = question.parent_question_id;
    return allQuestions
      .filter((q) => {
        const samePaper = q.paperId
          ? q.paperId === question.paperId
          : q.unitCode === question.unitCode &&
            q.year === question.year &&
            q.session === question.session;
        const sameParent =
          (pq && q.parentQuestion === pq) ||
          (pqId && q.parent_question_id === pqId);
        return samePaper && sameParent;
      })
      .sort((a, b) =>
        a.questionNumber.localeCompare(b.questionNumber, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
  }, [question, allQuestions]);

  if (!question) {
    return (
      <main className="flex-1 flex items-center justify-center bg-dark-950 text-slate-500">
        <div className="text-center p-8">
          <p className="text-sm font-medium">Select a question from the left list to begin</p>
        </div>
      </main>
    );
  }

  const isMarkSchemeVisible = viewMode === 'split' || viewMode === 'ms-only';
  const statusCfg = getStatusConfig(questionStatus);
  const qType = getQuestionType(question);

  return (
    <main className="flex-1 flex flex-col h-full bg-dark-950 overflow-hidden select-none relative">
      {/* ===================================================================== */}
      {/* ACTIVE QUESTION TOP HEADER                                            */}
      {/* ===================================================================== */}
      <div className="h-13 px-3 sm:px-4 border-b border-dark-800 bg-dark-900/90 flex items-center justify-between gap-2 sm:gap-4 shrink-0 select-none">
        {/* Left: Question Navigator Trigger (on mobile/tablet) & Metadata */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {/* Question List Drawer Button on mobile/tablet (< 1024px) */}
          <button
            type="button"
            onClick={onOpenQuestionList}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-cyan-300 text-xs font-semibold shrink-0 active:scale-95 transition-all"
            title="Open Question List"
          >
            <List className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-bold">
              Q{question.questionNumber}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              ({currentIndex + 1}/{totalQuestions})
            </span>
          </button>

          {/* Question ID Badge (shown on desktop >= 1024px) */}
          <span className="hidden lg:inline-flex font-mono font-bold text-xs tracking-tight text-cyan-300 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 shrink-0">
            Q{question.questionNumber}
          </span>

          {/* Marks Badge */}
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
            {question.marks}m
          </span>

          {/* Question Type Badge */}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
              qType === 'mcq'
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
            }`}
          >
            {qType === 'mcq' ? 'MCQ' : 'Theory'}
          </span>

          {/* Paper Series & Year */}
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-dark-850 border border-dark-750 text-xs text-slate-400 shrink-0 font-medium">
            <Calendar className="w-3 h-3 text-slate-500" />
            {question.series || question.session} {question.year}
          </span>

          {/* Cleanly Truncated Topic & Subtopic */}
          <span className="text-xs text-slate-300 font-medium truncate hidden sm:inline max-w-xs md:max-w-sm lg:max-w-md">
            <span className="text-cyan-400 font-semibold">{question.unit}:</span>{' '}
            {question.subtopic || question.topic}
          </span>

          {/* Stitched Stem Indicator */}
          {question.hasStem && (
            <span className="hidden 2xl:inline-flex items-center gap-1 text-[10px] text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 shrink-0">
              <Paperclip className="w-3 h-3 text-indigo-400" />
              Stem
            </span>
          )}

          {/* All Parts Drawer Button (if parent question has multiple subparts) */}
          {siblingSubparts.length > 1 && (
            <button
              type="button"
              onClick={() => setIsFullQuestionOpen(true)}
              title={`View complete Question with all ${siblingSubparts.length} parts`}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 px-2 py-1 rounded-lg shrink-0 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>All Parts ({siblingSubparts.length})</span>
            </button>
          )}
        </div>

        {/* Right: Actions & Navigation Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Status Cycle Button */}
          <button
            type="button"
            onClick={onCycleStatus}
            title={`Status: ${statusCfg.label}. Click to cycle status`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-medium border transition-all ${statusCfg.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            <span className="hidden sm:inline">{statusCfg.label}</span>
          </button>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove bookmark [B]' : 'Bookmark question [B]'}
            className={`p-1.5 sm:p-2 rounded-lg border transition-all ${
              isBookmarked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-dark-850 text-slate-400 border-dark-750 hover:bg-dark-800 hover:text-slate-200'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          <div className="hidden sm:block w-px h-4 bg-dark-800 mx-0.5" />

          {/* Toggle Mark Scheme Visibility (Desktop & Tablet) */}
          <button
            onClick={onToggleMarkScheme}
            title={isMarkSchemeVisible ? 'Hide Mark Scheme [M or Space]' : 'Show Mark Scheme [M or Space]'}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              isMarkSchemeVisible
                ? 'bg-dark-800 text-slate-300 border-dark-700 hover:bg-dark-750'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/40 shadow-sm shadow-cyan-500/20 hover:brightness-110'
            }`}
          >
            {isMarkSchemeVisible ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide Answer</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-white" />
                <span>Show Answer</span>
              </>
            )}
            <span className="hidden md:inline text-[9px] opacity-75 font-mono bg-black/20 px-1 py-0.2 rounded">
              M
            </span>
          </button>

          {/* Desktop Side-by-Side vs Toggle Switcher (hidden on mobile < 768px) */}
          <div className="hidden md:flex items-center bg-dark-850 p-0.5 rounded-lg border border-dark-750 text-xs">
            <button
              onClick={() => onSetViewMode('question-only')}
              title="Question Focus Mode (Answers hidden)"
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                viewMode === 'question-only'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Question
            </button>

            <button
              onClick={() => onSetViewMode('split')}
              title="Side-by-Side Split View"
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3 h-3 inline mr-1" />
              Split
            </button>

            <button
              onClick={() => onSetViewMode('ms-only')}
              title="Mark Scheme Focus Mode"
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                viewMode === 'ms-only'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Answers
            </button>
          </div>

          <div className="hidden sm:block w-px h-4 bg-dark-800 mx-0.5" />

          {/* Desktop/Tablet Question Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-0.5 shrink-0 bg-dark-850 p-0.5 rounded-lg border border-dark-750">
            <button
              onClick={onPrevQuestion}
              disabled={!hasPrev}
              title="Previous Question [← or []"
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-dark-750 text-slate-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="w-16 md:w-20 text-center font-mono text-xs text-slate-300 select-none shrink-0 font-medium">
              {currentIndex + 1} / {totalQuestions}
            </span>

            <button
              onClick={onNextQuestion}
              disabled={!hasNext}
              title="Next Question [→ or ]]"
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-dark-750 text-slate-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MOBILE SEGMENTED CONTROL: [ Question ] | [ Mark Scheme ] (< 768px)    */}
      {/* ===================================================================== */}
      <div className="flex md:hidden items-center justify-center p-2 bg-dark-900/90 border-b border-dark-800 shrink-0">
        <div className="grid grid-cols-2 w-full max-w-sm bg-dark-850 p-1 rounded-xl border border-dark-750">
          <button
            type="button"
            onClick={() => setMobileTab('question')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'question'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Question</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('ms')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'ms'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Scheme</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN CANVAS AREA (Responsive: Split on Desktop/Tablet, Single on Phone)*/}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative pb-16 md:pb-0">
        {/* Desktop & Tablet: Side-by-Side Split or Single mode */}
        {/* Mobile: Controlled by mobileTab */}

        {/* Question Canvas */}
        <div className={`
          flex-1 flex flex-col h-full overflow-hidden
          ${mobileTab === 'question' ? 'flex' : 'hidden md:flex'}
          ${viewMode === 'ms-only' ? 'hidden md:hidden' : ''}
        `}>
          <ImageCanvas
            src={question.questionImagePath}
            title={`Question ${question.questionNumber}`}
            badgeText={`${question.marks} ${question.marks === 1 ? 'Mark' : 'Marks'}`}
            badgeColor="cyan"
            placeholderTitle="Question Image Not Available"
            placeholderMessage="Could not load the question image asset."
          />
        </div>

        {/* Mark Scheme Canvas */}
        <div className={`
          flex-1 flex flex-col h-full overflow-hidden
          ${mobileTab === 'ms' ? 'flex' : 'hidden md:flex'}
          ${viewMode === 'question-only' ? 'hidden md:hidden' : ''}
        `}>
          <ImageCanvas
            src={question.markSchemeImagePath}
            title={`Mark Scheme: Q${question.questionNumber}`}
            badgeText="Official Answers"
            badgeColor="emerald"
            placeholderTitle="Mark Scheme Pending"
            placeholderMessage="This question's mark scheme row is either still processing or was not included in the sample pages."
          />
        </div>

        {/* Floating Quick Action if in Question Only mode on Desktop */}
        {viewMode === 'question-only' && (
          <div className="hidden md:block absolute bottom-6 right-6 z-10">
            <button
              onClick={onToggleMarkScheme}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-xs shadow-xl shadow-cyan-950/80 border border-cyan-400/40 hover:brightness-110 transition-all hover:scale-105 select-none"
            >
              <Eye className="w-3.5 h-3.5 text-white" />
              Show Mark Scheme
              <span className="text-[9px] opacity-80 font-mono bg-cyan-800/80 px-1.5 py-0.5 rounded">
                M / Space
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (< 768px)                          */}
      {/* ===================================================================== */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-dark-900/95 backdrop-blur-md border-t border-dark-800 z-30 px-3 flex items-center justify-between gap-2 shadow-2xl">
        {/* Prev Button - 44px min tap target */}
        <button
          type="button"
          onClick={onPrevQuestion}
          disabled={!hasPrev}
          className="min-w-[52px] min-h-[44px] px-3 flex items-center justify-center gap-1 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-200 font-semibold text-xs disabled:opacity-25 disabled:pointer-events-none active:scale-95 transition-all"
          title="Previous Question"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </button>

        {/* Center: Question List Drawer Opener */}
        <button
          type="button"
          onClick={onOpenQuestionList}
          className="flex-1 min-h-[44px] px-2 flex items-center justify-center gap-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs font-semibold text-cyan-300 active:scale-95 transition-all"
          title="Open Question List"
        >
          <List className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono font-bold">
            Q{question.questionNumber} ({currentIndex + 1}/{totalQuestions})
          </span>
        </button>

        {/* Answer Toggle Quick Action */}
        <button
          type="button"
          onClick={() => {
            setMobileTab((prev) => (prev === 'question' ? 'ms' : 'question'));
          }}
          className={`min-h-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${
            mobileTab === 'ms'
              ? 'bg-dark-800 text-cyan-300 border border-cyan-500/40'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
          }`}
          title={mobileTab === 'ms' ? 'Show Question' : 'Show Answer'}
        >
          {mobileTab === 'ms' ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Question</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answer</span>
            </>
          )}
        </button>

        {/* Next Button - 44px min tap target */}
        <button
          type="button"
          onClick={onNextQuestion}
          disabled={!hasNext}
          className="min-w-[52px] min-h-[44px] px-3 flex items-center justify-center gap-1 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-200 font-semibold text-xs disabled:opacity-25 disabled:pointer-events-none active:scale-95 transition-all"
          title="Next Question"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Full Question Modal / Drawer */}
      {isFullQuestionOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-150 select-text"
          onClick={() => setIsFullQuestionOpen(false)}
        >
          <div 
            className="w-full max-w-3xl bg-dark-900 border-l border-dark-750 h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 sm:px-6 border-b border-dark-800 bg-dark-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                    Question: {question.parent_question_id || `Q${question.parentQuestion}`}
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {siblingSubparts.length} parts
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    {question.unit} • {question.series || question.session} {question.year}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullQuestionOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body: Sequential List of Subparts */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-dark-950/60">
              {siblingSubparts.map((sub) => {
                const isCurrent = sub.id === question.id;
                return (
                  <div 
                    key={sub.id} 
                    className={`rounded-xl border p-3 sm:p-4 transition-all ${
                      isCurrent 
                        ? 'bg-dark-850/90 border-cyan-500/50 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/30' 
                        : 'bg-dark-900/80 border-dark-800'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-dark-800/80">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-cyan-300">
                          Part {sub.subPart || sub.questionNumber}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-dark-750 text-slate-300 border border-dark-700">
                          {sub.marks} {sub.marks === 1 ? 'mark' : 'marks'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectQuestionById) {
                            onSelectQuestionById(sub.id);
                          }
                          setIsFullQuestionOpen(false);
                        }}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                          isCurrent
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-dark-800 text-slate-300 hover:bg-dark-750 hover:text-white border border-dark-700'
                        }`}
                      >
                        <span>{isCurrent ? 'Current' : 'Jump to Part'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Image */}
                    <div className="rounded-lg overflow-hidden border border-dark-750 bg-white shadow">
                      <img 
                        src={getFullImageUrl(sub.questionImagePath)} 
                        alt={`Question ${sub.questionNumber}`} 
                        className="w-full h-auto block select-none"
                        loading="lazy"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default SplitViewer;
