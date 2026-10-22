import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Paperclip, 
  Eye, 
  EyeOff, 
  Bookmark, 
  FileText, 
  X, 
  ExternalLink, 
  Calendar, 
  List, 
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { QuestionItem, ViewMode, MasteryStatus } from '../types';
import { ImageCanvas } from './ImageCanvas';
import { getStatusConfig } from './QuestionList';
import { getQuestionType, getQuestionSubject } from '../utils/questionClassification';
import { getFullImageUrl } from '../utils/imageUrl';
import { useProgress } from '../context/ProgressContext';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../utils/spotlight';

interface SplitViewerProps {
  question: QuestionItem | null;
  prevQuestion?: QuestionItem | null;
  nextQuestion?: QuestionItem | null;
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
  prevQuestion,
  nextQuestion,
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
  const { userAnswers, setMcqAnswer } = useProgress();
  const [isFullQuestionOpen, setIsFullQuestionOpen] = useState(false);
  // Mobile specific view tab: 'question' | 'ms'
  const [mobileTab, setMobileTab] = useState<'question' | 'ms'>('question');
  // Student's interactive selection for MCQ items
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);

  // Background idle prefetcher for adjacent questions (prev & next)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefetchUrls: string[] = [];
    if (prevQuestion) {
      if (prevQuestion.questionImagePath) prefetchUrls.push(getFullImageUrl(prevQuestion.questionImagePath));
      if (prevQuestion.markSchemeImagePath) prefetchUrls.push(getFullImageUrl(prevQuestion.markSchemeImagePath));
    }
    if (nextQuestion) {
      if (nextQuestion.questionImagePath) prefetchUrls.push(getFullImageUrl(nextQuestion.questionImagePath));
      if (nextQuestion.markSchemeImagePath) prefetchUrls.push(getFullImageUrl(nextQuestion.markSchemeImagePath));
    }

    if (prefetchUrls.length === 0) return;

    const schedulePrefetch = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 100));
    const handle = schedulePrefetch(() => {
      prefetchUrls.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    });

    return () => {
      if ((window as any).cancelIdleCallback) {
        (window as any).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle);
      }
    };
  }, [prevQuestion?.id, nextQuestion?.id]);

  // Reset mobile view tab to 'question' ONLY when navigating to a new question
  useEffect(() => {
    setMobileTab('question');
  }, [question?.id]);

  // Sync MCQ selection when question or userAnswers update
  useEffect(() => {
    setSelectedMcqOption(question?.id ? userAnswers[question.id] || null : null);
  }, [question?.id, userAnswers]);

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
        (a.questionNumber || '').localeCompare(b.questionNumber || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
  }, [question, allQuestions]);

  const activeSubject = getQuestionSubject(question);
  const isMath = activeSubject === 'mathematics';
  const isPhysics = activeSubject === 'physics';
  const qType = question ? getQuestionType(question) : 'theory';

  const mcqAnswer = question
    ? (question as any).answer ||
      (question as any).correct_answer ||
      (question as any).correctAnswer ||
      (question as any).key
    : null;

  const isMcq = Boolean(question && !isMath && (qType === 'mcq' || !!mcqAnswer));
  const normalizedKey = mcqAnswer ? String(mcqAnswer).trim().toUpperCase() : '';

  const handleMcqSelect = useCallback(
    (opt: string) => {
      if (!question) return;
      setSelectedMcqOption(opt);
      const isCorrect = normalizedKey ? opt.toUpperCase() === normalizedKey.toUpperCase() : undefined;
      setMcqAnswer(question.id, opt, isCorrect);
    },
    [question, normalizedKey, setMcqAnswer]
  );

  const handleResetMcq = useCallback(() => {
    setSelectedMcqOption(null);
    if (question) {
      setMcqAnswer(question.id, '', undefined);
    }
  }, [question, setMcqAnswer]);

  // Desktop keyboard shortcuts A-D (and 1-4) for Chemistry & Physics MCQs
  useEffect(() => {
    if (!question || !isMcq || isMath || isFullQuestionOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Do not fire when an overlay/modal/drawer is open
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;

      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl) {
        const tag = activeEl.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          tag === 'BUTTON' ||
          tag === 'A' ||
          activeEl.isContentEditable ||
          activeEl.closest('[role="button"]')
        ) {
          return;
        }
      }

      const key = e.key.toUpperCase();
      const keyMap: Record<string, string> = {
        A: 'A',
        B: 'B',
        C: 'C',
        D: 'D',
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
      };
      const chosen = keyMap[key];
      if (chosen) {
        e.preventDefault();
        handleMcqSelect(chosen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, isMcq, isMath, isFullQuestionOpen, handleMcqSelect]);

  if (!question) {
    return (
      <main className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-950 text-slate-400 dark:text-slate-500">
        <div className="text-center p-8">
          <p className="text-sm font-medium">Select a question from the left list to begin</p>
        </div>
      </main>
    );
  }

  const isMarkSchemeVisible = viewMode === 'split' || viewMode === 'ms-only';
  const statusCfg = getStatusConfig(questionStatus);

  const questionImagePath = question.questionImagePath 
    || (question as any).crop_path 
    || (question as any).image_path 
    || '';

  const markSchemePath = question.markSchemeImagePath 
    || (question as any).ms_crop_path 
    || (question as any).ms_image_path 
    || (question as any).mark_scheme_image_path 
    || null;

  const isMcqAnsweredCorrectly = Boolean(
    selectedMcqOption !== null && normalizedKey && selectedMcqOption === normalizedKey
  );
  const isMcqAnswerRevealed = isMarkSchemeVisible || mobileTab === 'ms' || isMcqAnsweredCorrectly;

  const subjectQBadgeClass = isMath
    ? 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30'
    : isPhysics
    ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 border-indigo-500/30'
    : 'text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 border-cyan-500/30';

  const subjectUnitTextClass = isMath
    ? 'text-amber-600 dark:text-amber-400'
    : isPhysics
    ? 'text-indigo-600 dark:text-indigo-400'
    : 'text-cyan-600 dark:text-cyan-400';

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-100/50 dark:bg-dark-950 overflow-hidden select-none relative transition-colors">
      {/* ===================================================================== */}
      {/* ACTIVE QUESTION TOP HEADER (Clean sub-bar: metadata, bookmarks & counter)*/}
      <div
        onPointerMove={handleSpotlightMove}
        onPointerLeave={handleSpotlightLeave}
        style={getSubjectSpotlightStyle(activeSubject, 360)}
        className="spotlight-surface h-10 sm:h-11 px-2.5 sm:px-4 border-b border-slate-200 dark:border-white/[0.07] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] surface-glass flex items-center justify-between gap-1.5 sm:gap-3 shrink-0 select-none"
      >
        {/* Left: Question Navigator Trigger (on mobile/tablet) & Metadata */}
        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
          {/* Question List Drawer Button on mobile/tablet (< 1024px) */}
          <button
            type="button"
            onClick={onOpenQuestionList}
            className="lg:hidden flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-slate-200 dark:border-white/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold shrink-0 active:scale-95 transition-all"
            title="Open Question List"
          >
            <List className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-mono tabular-nums font-bold">
              Q{question.questionNumber || (question as any).question_number || question.id?.split('_').pop()?.replace(/^q/i, '') || ''}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 hidden sm:inline">
              ({currentIndex + 1}/{totalQuestions})
            </span>
          </button>

          {/* Question ID Badge (shown on desktop >= 1024px) */}
          <span className={`hidden lg:inline-flex font-mono tabular-nums font-bold text-xs tracking-tight px-2 py-0.5 rounded-lg border shrink-0 ${subjectQBadgeClass}`}>
            Q{question.questionNumber || (question as any).question_number || question.id?.split('_').pop()?.replace(/^q/i, '') || ''}
          </span>

          {/* Marks Badge */}
          <span className="font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0">
            {question.marks}m
          </span>

          {/* Question Type Badge (Omitted for Mathematics) */}
          {!isMath && (
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                qType === 'mcq'
                  ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                  : 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
              }`}
            >
              {qType === 'mcq' ? 'MCQ' : 'Theory'}
            </span>
          )}

          {/* MCQ Answer Key Badge in Header - only shown once revealed (anti-spoiler) */}
          {isMcq && mcqAnswer && isMcqAnswerRevealed && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 shadow-sm animate-in fade-in duration-200">
              <span className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Key:</span>
              <span className="font-mono text-white bg-emerald-600 px-1 py-0.2 rounded text-[10px] font-extrabold">
                [{normalizedKey}]
              </span>
            </span>
          )}

          {/* Paper Series & Year */}
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-400 shrink-0 font-medium tabular-nums">
            <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            {question.series && question.year && question.series.includes(String(question.year))
              ? question.series
              : `${question.series || question.session} ${question.year}`}
          </span>

          {/* Cleanly Truncated Topic & Subtopic */}
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate hidden sm:inline max-w-xs xl:max-w-sm">
            <span className={`${subjectUnitTextClass} font-semibold`}>{question.unit}:</span>{' '}
            {question.subtopic || question.topic}
          </span>

          {/* Stitched Stem Indicator */}
          {question.hasStem && (
            <span className="hidden 2xl:inline-flex items-center gap-1 text-[9px] text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 shrink-0">
              <Paperclip className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
              Stem
            </span>
          )}

          {/* All Parts Drawer Button (if parent question has multiple subparts) */}
          {siblingSubparts.length > 1 && (
            <button
              type="button"
              onClick={() => setIsFullQuestionOpen(true)}
              title={`View complete Question with all ${siblingSubparts.length} parts`}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 px-2 py-0.5 rounded-md shrink-0 transition-colors"
            >
              <FileText className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span>All Parts ({siblingSubparts.length})</span>
            </button>
          )}
        </div>

        {/* Right: Actions & Navigation Controls (Clean: Status, Bookmark & Counter) */}
        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Status Cycle Button */}
          <button
            type="button"
            onClick={onCycleStatus}
            title={`Status: ${statusCfg.label}. Click to cycle status`}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-all active:scale-95 ${statusCfg.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            <span className="hidden sm:inline">{statusCfg.label}</span>
          </button>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove bookmark [B]' : 'Bookmark question [B]'}
            className={`p-1.5 rounded-md border transition-all active:scale-95 ${
              isBookmarked
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>

          <div className="hidden sm:block w-px h-3.5 bg-slate-200 dark:bg-white/10 mx-0.5" />

          {/* Desktop/Tablet Question Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-0.5 shrink-0 bg-slate-100 dark:bg-white/[0.04] p-0.5 rounded-md border border-slate-200 dark:border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <button
              onClick={onPrevQuestion}
              disabled={!hasPrev}
              title="Previous Question [← or []"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="w-14 sm:w-16 text-center font-mono tabular-nums text-[11px] text-slate-700 dark:text-slate-300 select-none shrink-0 font-medium">
              {currentIndex + 1} / {totalQuestions}
            </span>

            <button
              onClick={onNextQuestion}
              disabled={!hasNext}
              title="Next Question [→ or ]]"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN CANVAS AREA (Responsive: Split on Desktop/Tablet, Single on Phone)*/}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative pb-16 md:pb-0">
        {/* Question Canvas */}
        <div
          className={`flex-1 flex-col h-full w-full overflow-hidden ${
            mobileTab === 'question' ? 'flex' : 'hidden'
          } ${viewMode === 'ms-only' ? 'md:hidden' : 'md:flex'}`}
        >
          <ImageCanvas
            src={questionImagePath}
            title={`Question ${question.questionNumber}`}
            badgeText={`${question.marks} ${question.marks === 1 ? 'Mark' : 'Marks'}`}
            badgeColor={isMath ? 'amber' : isPhysics ? 'indigo' : 'cyan'}
            placeholderTitle="Question Image Not Available"
            placeholderMessage="Could not load the question image asset."
            enableAnnotation={true}
            questionId={question.id}
          >
            {/* Interactive MCQ A/B/C/D Floating Dock (Visible on both Desktop & Mobile whenever isMcq && !isMath) */}
            {isMcq && !isMath && (
              <div
                onPointerMove={handleSpotlightMove}
                onPointerLeave={handleSpotlightLeave}
                style={getSubjectSpotlightStyle(activeSubject, 340)}
                className="spotlight-surface w-full max-w-xl mt-4 px-4 py-3 rounded-2xl surface-card shadow-2xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col items-center gap-2.5 animate-in fade-in duration-150 select-none"
              >
                <div className="relative z-10 flex items-center justify-between w-full px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Select Option
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      Press
                      <kbd className="kbd-keycap">
                        A
                      </kbd>
                      –
                      <kbd className="kbd-keycap">
                        D
                      </kbd>
                    </span>
                  </div>
                  {selectedMcqOption && (
                    <button
                      type="button"
                      onClick={handleResetMcq}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors"
                      title="Clear selected answer and reset status to Unattempted"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* 4 Interactive Option Buttons */}
                <div className="relative z-10 grid grid-cols-4 gap-2 sm:gap-2.5 w-full">
                  {['A', 'B', 'C', 'D'].map((opt, optIdx) => {
                    const isSelected = selectedMcqOption === opt;
                    const isCorrect = Boolean(normalizedKey && opt === normalizedKey);
                    let btnStyle =
                      'bg-slate-100 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-white/[0.1] hover:border-cyan-500/60 dark:hover:border-cyan-400/50 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]';

                    if (selectedMcqOption !== null) {
                      if (isSelected) {
                        if (isCorrect) {
                          btnStyle =
                            'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/60';
                        } else {
                          btnStyle =
                            'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/60';
                        }
                      } else if (isCorrect && isMcqAnswerRevealed) {
                        btnStyle =
                          'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500 ring-2 ring-emerald-400/50 animate-pulse-subtle';
                      } else if (isMcqAnswerRevealed) {
                        btnStyle =
                          'bg-slate-100/50 dark:bg-white/[0.02] text-slate-400 dark:text-slate-600 border-transparent opacity-40';
                      }
                    } else if (isCorrect && isMcqAnswerRevealed) {
                      btnStyle =
                        'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500 ring-2 ring-emerald-400/50';
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleMcqSelect(opt)}
                        onPointerMove={handleSpotlightMove}
                        onPointerLeave={handleSpotlightLeave}
                        style={getSubjectSpotlightStyle(activeSubject, 180)}
                        className={`spotlight-surface h-11 sm:h-12 rounded-xl font-bold font-mono text-sm sm:text-base border flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-sm ${btnStyle}`}
                      >
                        <span className="relative z-10">{opt}</span>
                        <span className="relative z-10 hidden sm:inline-block text-[10px] font-mono opacity-30 font-normal">
                          {optIdx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Instant visual feedback message banner */}
                {selectedMcqOption !== null && normalizedKey && (
                  <div
                    className={`relative z-10 w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
                      selectedMcqOption === normalizedKey
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedMcqOption === normalizedKey ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Correct! Option [{normalizedKey}] is the right answer.</span>
                        </>
                      ) : isMcqAnswerRevealed ? (
                        <>
                          <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Incorrect. Option [{normalizedKey}] is the correct answer.</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Incorrect — try again or view mark scheme</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setMobileTab((prev) => (prev === 'ms' ? 'question' : 'ms'));
                        } else {
                          onSetViewMode(isMarkSchemeVisible ? 'question-only' : 'split');
                        }
                      }}
                      className="text-[11px] font-bold underline shrink-0 hover:opacity-80"
                    >
                      {isMarkSchemeVisible || mobileTab === 'ms' ? 'Hide Mark Scheme' : 'View Mark Scheme'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </ImageCanvas>
        </div>

        {/* Smooth Vertical Split Divider (visible in side-by-side split mode) */}
        {viewMode === 'split' && (
          <div
            className="hidden md:flex w-px bg-slate-200 dark:bg-white/[0.07] relative items-center justify-center group hover:bg-cyan-500/40 dark:hover:bg-cyan-400/40 transition-colors shrink-0 select-none"
            aria-hidden="true"
          >
            <div className={`w-1 h-8 rounded-full bg-slate-300 dark:bg-white/15 transition-all ${
              isMath
                ? 'group-hover:bg-amber-400 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                : isPhysics
                ? 'group-hover:bg-indigo-400 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.6)]'
                : 'group-hover:bg-cyan-400 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.6)]'
            }`} />
          </div>
        )}

        {/* Mark Scheme Canvas */}
        <div
          className={`flex-1 flex-col h-full w-full min-h-[300px] overflow-hidden ${
            mobileTab === 'ms' ? 'flex' : 'hidden'
          } ${viewMode === 'question-only' ? 'md:hidden' : 'md:flex'}`}
        >
          <ImageCanvas
            src={markSchemePath}
            title={`Mark Scheme: Q${question.questionNumber}`}
            badgeText={
              mcqAnswer
                ? `Correct Option: [${mcqAnswer.toUpperCase()}]`
                : qType === 'mcq'
                ? 'MCQ Answer Key'
                : 'Official Answers'
            }
            badgeColor={qType === 'mcq' ? 'purple' : 'emerald'}
            extraBadge={
              mcqAnswer ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                  Option [{mcqAnswer.toUpperCase()}]
                </span>
              ) : undefined
            }
            placeholderTitle="Mark Scheme Pending"
            placeholderMessage="This question's mark scheme row is either still processing or was not included in the sample pages."
            enableAnnotation={true}
            questionId={`${question.id}-ms`}
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ANCHORED BOTTOM ACTION BAR (Desktop & Tablet >= 768px)               */}
      {/* ===================================================================== */}
      <div
        onPointerMove={handleSpotlightMove}
        onPointerLeave={handleSpotlightLeave}
        style={getSubjectSpotlightStyle(activeSubject, 420)}
        className="spotlight-surface hidden md:flex sticky bottom-0 w-full py-2.5 px-6 surface-glass border-t border-slate-200 dark:border-white/[0.08] shadow-2xl dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_-10px_30px_rgba(0,0,0,0.45)] items-center justify-center gap-3 z-10 shrink-0 select-none"
      >
        {/* Left: Previous Question */}
        <button
          type="button"
          onClick={onPrevQuestion}
          onPointerMove={handleSpotlightMove}
          onPointerLeave={handleSpotlightLeave}
          disabled={!hasPrev}
          className="spotlight-surface relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-slate-200 dark:border-white/10 border text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] transition-all shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          title="Previous Question [← or []"
        >
          <ChevronLeft className="relative z-10 w-3.5 h-3.5" />
          <span className="relative z-10">Prev</span>
          <kbd className="relative z-10 hidden lg:inline-block kbd-keycap">
            ←
          </kbd>
        </button>

        {/* Center: Prominent primary toggle button with tactile gradient-glass + top specular edge */}
        <button
          type="button"
          onClick={onToggleMarkScheme}
          onPointerMove={handleSpotlightMove}
          onPointerLeave={handleSpotlightLeave}
          title={isMarkSchemeVisible ? 'Hide Mark Scheme [Space or M]' : 'Show Mark Scheme [Space or M]'}
          className={`spotlight-surface relative z-10 flex items-center gap-2 px-5 py-1.5 rounded-xl font-semibold text-xs active:scale-[0.98] transition-all ${
            isMarkSchemeVisible
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] dark:text-slate-100 dark:border-white/15 border shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
              : isMath
              ? 'bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold border border-amber-400/50 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.45),inset_0_1px_0_0_rgba(255,255,255,0.35)]'
              : isPhysics
              ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white border border-indigo-400/50 shadow-[0_8px_20px_-4px_rgba(99,102,241,0.45),inset_0_1px_0_0_rgba(255,255,255,0.28)]'
              : 'bg-gradient-to-b from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white border border-cyan-400/50 shadow-[0_8px_20px_-4px_rgba(6,182,212,0.45),inset_0_1px_0_0_rgba(255,255,255,0.28)]'
          }`}
        >
          {isMarkSchemeVisible ? (
            <>
              <EyeOff className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Hide Mark Scheme</span>
            </>
          ) : (
            <>
              <Eye className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Show Mark Scheme</span>
            </>
          )}
          <kbd
            className={`relative z-10 kbd-keycap ${
              !isMarkSchemeVisible
                ? isMath
                  ? 'bg-amber-950/30 border-amber-900/30 text-amber-950'
                  : isPhysics
                  ? 'bg-indigo-800/70 border-indigo-300/40 text-indigo-100'
                  : 'bg-cyan-800/70 border-cyan-300/40 text-cyan-100'
                : ''
            }`}
          >
            Space
          </kbd>
        </button>

        {/* Right: Next Question */}
        <button
          type="button"
          onClick={onNextQuestion}
          onPointerMove={handleSpotlightMove}
          onPointerLeave={handleSpotlightLeave}
          disabled={!hasNext}
          className="spotlight-surface relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-slate-200 dark:border-white/10 border text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] transition-all shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          title="Next Question [→ or ]]"
        >
          <span className="relative z-10">Next</span>
          <kbd className="relative z-10 hidden lg:inline-block kbd-keycap">
            →
          </kbd>
          <ChevronRight className="relative z-10 w-3.5 h-3.5" />
        </button>
      </div>

      {/* ===================================================================== */}
      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (< 768px)                          */}
      {/* ===================================================================== */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-14 surface-glass border-t border-slate-200 dark:border-white/10 z-30 px-3 flex items-center justify-between gap-2 shadow-2xl">
        {/* Prev Button - 44px min tap target */}
        <button
          type="button"
          onClick={onPrevQuestion}
          disabled={!hasPrev}
          className="min-w-[52px] min-h-[44px] px-3 flex items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs disabled:opacity-25 disabled:pointer-events-none active:scale-[0.98] transition-all"
          title="Previous Question"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </button>

        {/* Center: Question List Drawer Opener */}
        <button
          type="button"
          onClick={onOpenQuestionList}
          className="flex-1 min-h-[44px] px-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 text-xs font-semibold text-cyan-700 dark:text-cyan-300 active:scale-[0.98] transition-all"
          title="Open Question List"
        >
          <List className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="font-mono tabular-nums font-bold">
            Q{question.questionNumber} ({currentIndex + 1}/{totalQuestions})
          </span>
        </button>

        {/* Answer Toggle Quick Action */}
        <button
          type="button"
          onClick={() => {
            setMobileTab((prev) => (prev === 'question' ? 'ms' : 'question'));
          }}
          className={`min-h-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold active:scale-[0.98] transition-all ${
            mobileTab === 'ms'
              ? 'bg-slate-100 dark:bg-white/[0.08] text-cyan-700 dark:text-cyan-300 border border-cyan-400 dark:border-cyan-500/40'
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
          className="min-w-[52px] min-h-[44px] px-3 flex items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs disabled:opacity-25 disabled:pointer-events-none active:scale-[0.98] transition-all"
          title="Next Question"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Full Question Modal / Drawer */}
      {isFullQuestionOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 dark:bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-150 select-text"
          onClick={() => setIsFullQuestionOpen(false)}
        >
          <div 
            className="w-full max-w-3xl bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-dark-750 h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    Question: {question.parent_question_id || `Q${question.parentQuestion}`}
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      {siblingSubparts.length} parts
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {question.unit} • {question.series && question.year && question.series.includes(String(question.year))
                      ? question.series
                      : `${question.series || question.session} ${question.year}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullQuestionOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body: Sequential List of Subparts */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-dark-950/60">
              {siblingSubparts.map((sub) => {
                const isCurrent = sub.id === question.id;
                return (
                  <div 
                    key={sub.id} 
                    className={`rounded-xl border p-3 sm:p-4 transition-all ${
                      isCurrent 
                        ? 'bg-cyan-50/70 dark:bg-dark-850/90 border-cyan-400 dark:border-cyan-500/50 shadow-md shadow-cyan-900/5 dark:shadow-cyan-950/20 ring-1 ring-cyan-500/20 dark:ring-cyan-500/30' 
                        : 'bg-white dark:bg-dark-900/80 border-slate-200 dark:border-dark-800'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-dark-800/80">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-cyan-700 dark:text-cyan-300">
                          Part {sub.subPart || sub.questionNumber}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700">
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
                            ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-750 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-dark-700'
                        }`}
                      >
                        <span>{isCurrent ? 'Current' : 'Jump to Part'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Image */}
                    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-dark-750 bg-white shadow-sm">
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
