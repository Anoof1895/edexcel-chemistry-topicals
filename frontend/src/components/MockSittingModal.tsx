import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  HelpCircle,
  Award
} from 'lucide-react';
import { QuestionItem, Subject } from '../types';
import { ImageCanvas } from './ImageCanvas';
import { resolveQuestionImageUrl, resolveMarkSchemeImageUrl } from '../utils/imageUrl';
import { getQuestionType } from '../utils/questionClassification';
import { useProgress } from '../context/ProgressContext';

interface MockSittingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  questions: QuestionItem[];
  durationMinutes: number;
  subject: Subject;
}

export const MockSittingModal: React.FC<MockSittingModalProps> = ({
  isOpen,
  onClose,
  title,
  questions,
  durationMinutes,
  subject,
}) => {
  const { setQuestionStatus, questionStatuses, userAnswers, setMcqAnswer } = useProgress();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sittingMode, setSittingMode] = useState<'test' | 'practice'>('test');
  const [showMarkSchemeInPractice, setShowMarkSchemeInPractice] = useState<boolean>(false);
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);

  // Live Countdown Timer State
  const initialSeconds = Math.max(60, durationMinutes * 60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Local student scores and answers for this sitting
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [studentScores, setStudentScores] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset exam session when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setSecondsRemaining(Math.max(60, durationMinutes * 60));
      setIsTimerRunning(true);
      setIsExamSubmitted(false);
      setShowMarkSchemeInPractice(false);
      setShowSubmitConfirm(false);
      setLocalAnswers({ ...userAnswers });
    }
  }, [isOpen, durationMinutes]);

  // Timer Tick Effect
  useEffect(() => {
    if (!isOpen || !isTimerRunning || isExamSubmitted) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExamSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isTimerRunning, isExamSubmitted]);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Escape Key Confirmation Protection
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          // Handled by browser fullscreen exit
          return;
        }
        e.preventDefault();
        if (showSubmitConfirm) {
          setShowSubmitConfirm(false);
          return;
        }
        if (
          window.confirm(
            'Are you sure you want to exit your mock exam? Your progress will be lost.'
          )
        ) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showSubmitConfirm, onClose]);

  if (!isOpen || questions.length === 0) return null;

  const activeQuestion = questions[currentIndex];
  const qNumDisplay =
    activeQuestion.questionNumber ??
    (activeQuestion as any)?.question_number ??
    (activeQuestion.id ? activeQuestion.id.split('_').pop()?.replace(/^q/i, '') : '') ??
    String(currentIndex + 1);
  const isActiveMcq = Boolean(activeQuestion.is_mcq || getQuestionType(activeQuestion) === 'mcq');
  const officialAnswer = activeQuestion.correctAnswer || activeQuestion.correct_answer || (activeQuestion as any).answer || null;

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const earnedMarks = Object.values(studentScores).reduce((sum, val) => sum + val, 0);

  // Format Timer mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isTimeCritical = secondsRemaining < 300 && secondsRemaining > 0; // < 5 mins

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const toggleFlag = (id: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectMcq = (choice: 'A' | 'B' | 'C' | 'D') => {
    setLocalAnswers((prev) => ({ ...prev, [activeQuestion.id]: choice }));
    setMcqAnswer(activeQuestion.id, choice);

    if (officialAnswer) {
      const isCorrect = officialAnswer === choice;
      if (sittingMode === 'practice') {
        setQuestionStatus(activeQuestion.id, isCorrect ? 'mastered' : 'review');
        setStudentScores((prev) => ({ ...prev, [activeQuestion.id]: isCorrect ? (activeQuestion.marks || 1) : 0 }));
      } else {
        // In test mode: record score for submission, defer status updates until submit
        setStudentScores((prev) => ({ ...prev, [activeQuestion.id]: isCorrect ? (activeQuestion.marks || 1) : 0 }));
      }
    }
  };

  const handleFinalSubmit = () => {
    setIsExamSubmitted(true);
    setIsTimerRunning(false);
    setShowSubmitConfirm(false);
    // Grade MCQs automatically
    const newScores: Record<string, number> = { ...studentScores };
    questions.forEach((q) => {
      const isMcq = Boolean(q.is_mcq || getQuestionType(q) === 'mcq');
      const ans = q.correctAnswer || q.correct_answer || (q as any).answer;
      if (isMcq && ans) {
        const studentAns = localAnswers[q.id];
        if (studentAns === ans) {
          newScores[q.id] = q.marks || 1;
          setQuestionStatus(q.id, 'mastered');
        } else if (studentAns) {
          newScores[q.id] = 0;
          setQuestionStatus(q.id, 'review');
        }
      }
    });
    setStudentScores(newScores);
  };

  const calcGrade = (score: number, max: number) => {
    if (max <= 0) return 'Ungraded';
    const pct = (score / max) * 100;
    if (pct >= 85) return 'A* (Outstanding)';
    if (pct >= 75) return 'A (Excellent)';
    if (pct >= 65) return 'B (Good)';
    if (pct >= 55) return 'C (Pass)';
    if (pct >= 45) return 'D';
    if (pct >= 35) return 'E';
    return 'U (Ungraded)';
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Mock Exam Room"
      className="fixed inset-0 z-50 flex flex-col bg-[#07090D] text-slate-100 select-none overflow-hidden"
    >
      {/* Top Examination HUD Header */}
      <header className="h-14 px-4 bg-[#0B0F19] border-b border-white/10 flex items-center justify-between shrink-0 gap-3 z-20">
        {/* Left: Title & Edexcel IAL Badge */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              Mock Exam Room
            </span>
          </div>

          <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs md:max-w-md">
            {title}
          </h2>

          {activeQuestion.unit && (
            <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {activeQuestion.unitCode || activeQuestion.unit}
            </span>
          )}
        </div>

        {/* Center: Live Timer & Mode Segmented Control */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isExamSubmitted && (
            <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSittingMode('test');
                  setShowMarkSchemeInPractice(false);
                }}
                className={`px-2 sm:px-2.5 py-1 rounded transition-all font-semibold ${
                  sittingMode === 'test'
                    ? 'bg-amber-500 text-dark-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Test</span>
                <span className="hidden sm:inline"> Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setSittingMode('practice')}
                className={`px-2 sm:px-2.5 py-1 rounded transition-all font-semibold ${
                  sittingMode === 'practice'
                    ? 'bg-cyan-500 text-dark-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Practice</span>
                <span className="hidden sm:inline"> Mode</span>
              </button>
            </div>
          )}

          {/* Countdown Clock Display */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono tabular-nums text-sm font-extrabold ${
              isTimeCritical
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                : 'bg-white/[0.05] border-white/10 text-white'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-400' : 'text-cyan-400'}`} />
            <span>{formatTime(secondsRemaining)}</span>
            {!isExamSubmitted && (
              <button
                type="button"
                onClick={() => setIsTimerRunning((r) => !r)}
                title={isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
                className="ml-1 p-0.5 hover:text-cyan-300 text-slate-400 transition-colors"
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Right Actions: Fullscreen, Submit, Close */}
        <div className="flex items-center gap-2 shrink-0">
          {!isExamSubmitted ? (
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs border border-emerald-400/40 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              Finish Exam
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Exam Complete</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition-colors"
            title="Exit Exam Room"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Question Navigation Strip (Q1, Q2, Q3...) */}
      <nav className="h-11 px-4 bg-[#080B12] border-b border-white/[0.07] flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-thin">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isFlagged = flaggedQuestions.has(q.id);
          const hasAnswer = Boolean(localAnswers[q.id]);
          const status = questionStatuses[q.id];
          const showGrading = isExamSubmitted || sittingMode === 'practice';
          const isGradedMaster = showGrading && status === 'mastered';
          const isGradedReview = showGrading && status === 'review';

          let indicatorColor = 'bg-white/20';
          if (isGradedMaster) indicatorColor = 'bg-emerald-400';
          else if (isGradedReview) indicatorColor = 'bg-rose-400';
          else if (hasAnswer) indicatorColor = 'bg-cyan-400';
          else if (isFlagged) indicatorColor = 'bg-amber-400';

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setShowMarkSchemeInPractice(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 border ${
                isCurrent
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
              <span>Q{idx + 1}</span>
              {isFlagged && <Bookmark className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
            </button>
          );
        })}
      </nav>

      {/* Main Examination Question Viewing Workspace */}
      <main className="flex-1 min-h-0 min-w-0 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden relative">
        {/* Left / Center: Question Canvas */}
        <div className="flex-1 min-w-0 min-h-[420px] xl:min-h-0 flex flex-col xl:h-full overflow-hidden border-b xl:border-b-0 xl:border-r border-white/10">
          {/* Question Meta Bar */}
          <div className="h-11 px-4 bg-[#0C101B] border-b border-white/10 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-mono">
                Question {currentIndex + 1} of {questions.length} (Q{qNumDisplay})
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {activeQuestion.marks} marks
              </span>
              <span className="text-slate-400 truncate hidden sm:inline">
                {activeQuestion.topic} / {activeQuestion.subtopic}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleFlag(activeQuestion.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                  flaggedQuestions.has(activeQuestion.id)
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{flaggedQuestions.has(activeQuestion.id) ? 'Flagged' : 'Flag'}</span>
              </button>

              {/* Reveal Mark Scheme button (Practice Mode or Exam Submitted) */}
              {(sittingMode === 'practice' || isExamSubmitted) && (
                <button
                  type="button"
                  onClick={() => setShowMarkSchemeInPractice((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                    showMarkSchemeInPractice
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {showMarkSchemeInPractice ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showMarkSchemeInPractice ? 'Hide Mark Scheme' : 'Reveal Mark Scheme'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Question Image Canvas */}
          <div className="flex-1 overflow-hidden relative">
            <ImageCanvas
              src={resolveQuestionImageUrl(activeQuestion)}
              title={`Question ${qNumDisplay}`}
              badgeText={`${activeQuestion.marks}m`}
              badgeColor="cyan"
              activeSubject={subject}
              enableAnnotation={true}
              questionId={activeQuestion.id}
            />
          </div>

          {/* Interactive MCQ Answer Bar */}
          {isActiveMcq && (
            <div className="p-3 bg-[#0A0D16] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select Answer:
                </span>
                <div className="flex items-center gap-1.5">
                  {(['A', 'B', 'C', 'D'] as const).map((choice) => {
                    const isSelected = localAnswers[activeQuestion.id] === choice;
                    const isCorrect = isExamSubmitted && officialAnswer === choice;
                    const isWrong = isExamSubmitted && isSelected && !isCorrect;

                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => handleSelectMcq(choice)}
                        className={`w-9 h-9 rounded-xl font-bold font-mono text-sm border transition-all active:scale-95 ${
                          isCorrect
                            ? 'bg-emerald-500 text-dark-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                            : isWrong
                            ? 'bg-rose-500 text-white border-rose-400'
                            : isSelected
                            ? 'bg-cyan-500 text-dark-950 border-cyan-400 shadow-md shadow-cyan-500/30'
                            : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border-white/10'
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              </div>

              {officialAnswer && (sittingMode === 'practice' || isExamSubmitted) && (
                <div className="text-xs font-mono font-bold text-emerald-400">
                  Official Answer: [ {officialAnswer} ]
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Companion Mark Scheme */}
        {(showMarkSchemeInPractice || isExamSubmitted) && (
          <div className="flex-1 min-w-0 min-h-[420px] xl:min-h-0 flex flex-col xl:h-full overflow-hidden bg-[#0A0D16] xl:border-l border-white/10">
            <div className="h-11 px-4 bg-[#0F1424] border-b border-white/10 flex items-center justify-between shrink-0 text-xs">
              <span className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Official Mark Scheme: Q{qNumDisplay}
              </span>

              {/* Self-Scoring / Grading Buttons */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px] mr-1">Grade:</span>
                {Array.from(
                  new Set([0, Math.ceil((activeQuestion.marks || 1) / 2), activeQuestion.marks || 1])
                ).map((pts) => {
                  const isAwarded = studentScores[activeQuestion.id] === pts;
                  return (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => {
                        setStudentScores((prev) => ({ ...prev, [activeQuestion.id]: pts }));
                        if (pts === activeQuestion.marks) setQuestionStatus(activeQuestion.id, 'mastered');
                        else if (pts === 0) setQuestionStatus(activeQuestion.id, 'review');
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-all ${
                        isAwarded
                          ? 'bg-emerald-500 text-dark-950 border-emerald-400'
                          : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border-white/10'
                      }`}
                    >
                      {pts}m
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <ImageCanvas
                src={resolveMarkSchemeImageUrl(activeQuestion)}
                title={`Mark Scheme: Q${qNumDisplay}`}
                badgeText="Answers"
                badgeColor="emerald"
                activeSubject={subject}
                placeholderTitle="Mark Scheme Image"
                placeholderMessage="Official mark scheme slice not indexed for this question."
              />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Paging Toolbar */}
      <footer className="h-12 px-4 bg-[#0B0F19] border-t border-white/10 flex items-center justify-between shrink-0 text-xs z-20">
        <button
          type="button"
          disabled={currentIndex <= 0}
          onClick={() => {
            setCurrentIndex((i) => Math.max(0, i - 1));
            setShowMarkSchemeInPractice(false);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-400 text-xs">
            {currentIndex + 1} / {questions.length} Questions
          </span>
          {isExamSubmitted && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
              Score: {earnedMarks} / {totalMarks} ({Math.round((earnedMarks / (totalMarks || 1)) * 100)}%)
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={currentIndex >= questions.length - 1}
          onClick={() => {
            setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
            setShowMarkSchemeInPractice(false);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* Submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0F1424] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Submit Examination?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Are you ready to finish? Time remaining: {formatTime(secondsRemaining)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-mono font-bold text-white">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Questions Attempted:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {Object.keys(localAnswers).length} of {questions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Flagged for Review:</span>
                <span className="font-mono font-bold text-amber-400">{flaggedQuestions.size}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold text-xs transition-colors"
              >
                Keep Working
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                Yes, Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Exam Final Grade Report Overlay */}
      {isExamSubmitted && !showMarkSchemeInPractice && currentIndex === 0 && (
        <div className="absolute top-16 right-6 z-30 w-72 rounded-2xl bg-[#0F1424]/95 border border-emerald-500/30 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Official Mock Result
            </span>
            <span className="text-[10px] font-mono text-slate-400">Graded</span>
          </div>
          <div className="py-3 text-center">
            <div className="text-2xl font-extrabold text-white font-mono">
              {earnedMarks} / {totalMarks}
            </div>
            <div className="text-xs font-semibold text-emerald-300 mt-0.5">
              {calcGrade(earnedMarks, totalMarks)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center leading-snug">
            Review your answers using the companion Mark Schemes.
          </p>
        </div>
      )}
    </div>
  );
};
