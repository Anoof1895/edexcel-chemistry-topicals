import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  FlaskConical,
  Atom,
  Compass,
  FileText,
  Layers,
  ArrowRight,
  Search,
  Printer,
  BookOpen,
  Sigma,
  PenTool,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { AppView, QuestionItem } from '../types';
import { useProgress } from '../context/ProgressContext';
import {
  registerSpotlightTarget,
  unregisterSpotlightTarget,
} from '../utils/spotlight';

interface HomePageProps {
  onNavigate: (view: AppView) => void;
  questions: QuestionItem[];
  physicsQuestions?: QuestionItem[];
  mathematicsQuestions?: QuestionItem[];
}

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  enableTilt?: boolean;
  spotlightColor?: string;
  borderGlowColor?: string;
  children: React.ReactNode;
}

/**
 * GPU-accelerated cursor-tracking spotlight & 3D micro-tilt container.
 * Mutates CSS variables directly on the DOM node (zero React state re-renders)
 * and stays synchronized during scroll via passive scroll-sync tracking.
 */
const SpotlightCard: React.FC<SpotlightCardProps> = ({
  enableTilt = false,
  spotlightColor = 'rgba(255, 255, 255, 0.06)',
  borderGlowColor = 'rgba(255, 255, 255, 0.35)',
  className = '',
  style,
  children,
  ...rest
}) => {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);
      registerSpotlightTarget(el, e.clientX, e.clientY);

      if (enableTilt && rect.width > 0 && rect.height > 0) {
        const pctX = x / rect.width - 0.5;
        const pctY = y / rect.height - 0.5;
        el.style.setProperty('--tilt-x', `${(pctY * -4).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(pctX * 4).toFixed(2)}deg`);
      }
    },
    [enableTilt]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      unregisterSpotlightTarget(el);
      if (!enableTilt) return;
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    },
    [enableTilt]
  );

  const combinedStyle: React.CSSProperties = {
    '--spotlight-color': spotlightColor,
    '--border-glow-color': borderGlowColor,
    ...(enableTilt
      ? {
          transform:
            'perspective(1000px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms ease',
          willChange: 'transform',
        }
      : undefined),
    ...style,
  } as React.CSSProperties;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={combinedStyle}
      className={`group relative overflow-hidden ${className}`}
      {...rest}
    >
      {/* Surface Radial Spotlight Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background:
            'radial-gradient(550px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), var(--spotlight-color, rgba(255,255,255,0.06)), transparent 40%)',
        }}
      />

      {/* 1px Illuminated Border Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
        style={{
          padding: '1px',
          background:
            'radial-gradient(350px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), var(--border-glow-color, rgba(255,255,255,0.35)), transparent 40%)',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {children}
    </div>
  );
};

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  questions,
  physicsQuestions = [],
  mathematicsQuestions = [],
}) => {
  const { questionStatuses } = useProgress();

  const {
    chemTotal,
    chemPapers,
    chemMarks,
    physTotal,
    physPapers,
    physMarks,
    mathTotal,
    mathPapers,
    mathMarks,
  } = useMemo(() => {
    const chemTot = questions.length || 5712;
    const chemP =
      new Set(
        questions.map((q) => q.paperId || `${q.unitCode}_${q.year}_${q.session}`)
      ).size || 140;
    const chemM = questions.reduce((sum, q) => sum + (q.marks || 0), 0) || 10041;

    const physTot = physicsQuestions.length || 4136;
    const physP =
      new Set(
        physicsQuestions.map(
          (q) => q.paperId || `${q.unitCode}_${q.year}_${q.session}`
        )
      ).size || 140;
    const physM =
      physicsQuestions.reduce((sum, q) => sum + (q.marks || 0), 0) || 10230;

    const mathTot = mathematicsQuestions.length || 1269;
    const mathP =
      new Set(
        mathematicsQuestions.map(
          (q) => q.paperId || `${q.unitCode}_${q.year}_${q.session}`
        )
      ).size || 142;
    const mathM =
      mathematicsQuestions.reduce((sum, q) => sum + (q.marks || 0), 0) || 10650;

    return {
      chemTotal: chemTot,
      chemPapers: chemP,
      chemMarks: chemM,
      physTotal: physTot,
      physPapers: physP,
      physMarks: physM,
      mathTotal: mathTot,
      mathPapers: mathP,
      mathMarks: mathM,
    };
  }, [questions, physicsQuestions, mathematicsQuestions]);

  // Live Mastery Progress calculation per subject prefix
  const { chemCompleted, physCompleted, mathCompleted } = useMemo(() => {
    let chem = 0;
    let phys = 0;
    let math = 0;

    for (const [qId, status] of Object.entries(questionStatuses || {})) {
      const isDone =
        status === 'mastered' ||
        status === 'correct' ||
        (status as string) === 'completed';
      if (!isDone) continue;

      const lower = qId.toLowerCase();
      if (lower.startsWith('wch')) {
        chem++;
      } else if (lower.startsWith('wph')) {
        phys++;
      } else if (
        lower.startsWith('wma') ||
        lower.startsWith('wme') ||
        lower.startsWith('wst')
      ) {
        math++;
      }
    }

    return {
      chemCompleted: chem,
      physCompleted: phys,
      mathCompleted: math,
    };
  }, [questionStatuses]);

  const totalQuestionsCombined = chemTotal + physTotal + mathTotal;
  const totalPapersCombined = chemPapers + physPapers + mathPapers;
  const totalMarksCombined = chemMarks + physMarks + mathMarks;

  const chemProgressPct = Math.min(100, (chemCompleted / chemTotal) * 100);
  const physProgressPct = Math.min(100, (physCompleted / physTotal) * 100);
  const mathProgressPct = Math.min(100, (mathCompleted / mathTotal) * 100);

  // Viewport-locked ref and window pointer tracking for zero-drift drafting-grid flashlight
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = backdropRef.current;
      if (!el) return;
      el.style.setProperty('--hero-x', `${e.clientX}px`);
      el.style.setProperty('--hero-y', `${e.clientY}px`);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
    };
  }, []);

  const handleHeroPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = backdropRef.current;
      if (!el) return;
      el.style.setProperty('--hero-x', `${e.clientX}px`);
      el.style.setProperty('--hero-y', `${e.clientY}px`);
    },
    []
  );

  // Self-contained synthetic shortcut triggers
  const triggerCommandPalette = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    );
  }, []);

  const triggerDataBooklet = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'd', bubbles: true })
    );
  }, []);

  return (
    <div
      onPointerMove={handleHeroPointerMove}
      className="relative flex-1 overflow-y-auto bg-slate-50 dark:bg-[#070A10] text-slate-800 dark:text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-cyan-200 transition-colors"
    >
      {/* Viewport-Locked Background Drafting Grid & Live Cursor Flashlight (Zero Scroll Drift) */}
      <div
        ref={backdropRef}
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)]"
      >
        {/* Base Radial Masked Drafting Grid */}
        <div className="absolute inset-0 bg-drafting-grid [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000_60%,transparent_100%)]" />

        {/* Live Cursor Drafting-Grid Flashlight Illumination */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(650px circle at var(--hero-x, 50%) var(--hero-y, 240px), rgba(56, 189, 248, 0.09), rgba(99, 102, 241, 0.05) 40%, transparent 70%)',
          }}
        />

        {/* Ambient Horizon & Corner Glows */}
        <div className="absolute -top-44 left-1/2 -translate-x-1/2 w-[820px] h-[380px] bg-gradient-to-b from-cyan-500/12 dark:from-cyan-500/14 via-indigo-500/5 dark:via-indigo-500/8 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/4 -left-56 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-600/10 blur-3xl rounded-full" />
        <div className="absolute top-1/3 -right-56 w-96 h-96 bg-amber-500/5 dark:bg-amber-600/10 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-16 flex flex-col items-center">
        {/* Top Obsidian Glass Pill Badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] text-slate-700 dark:text-slate-300 text-xs font-medium mb-6 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span className="tracking-tight">
            Pearson Edexcel International A-Level Revision Hub
          </span>
          <span className="hidden sm:inline-block h-3 w-[1px] bg-slate-300 dark:bg-white/[0.12]" />
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            2019–2026 RECONCILED
          </span>
        </div>

        {/* Hero Editorial Typography */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[1.08] text-center max-w-3xl">
          <span className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-white dark:to-slate-400 bg-clip-text text-transparent">
            Master Edexcel IAL with{' '}
          </span>
          <span className="bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 dark:from-cyan-300 dark:via-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Precision Topicals
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-4 text-sm md:text-base text-slate-600 dark:text-slate-400 text-center max-w-2xl leading-relaxed">
          Access thousands of authentic past paper questions organized strictly by
          Pearson specification subtopics, featuring instant side-by-side mark
          schemes and an automated PDF mock exam builder.
        </p>

        {/* Interactive Raycast Command Search Bar */}
        <SpotlightCard
          role="button"
          tabIndex={0}
          onClick={triggerCommandPalette}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerCommandPalette();
            }
          }}
          spotlightColor="rgba(56, 189, 248, 0.12)"
          borderGlowColor="rgba(56, 189, 248, 0.45)"
          className="w-full max-w-xl mx-auto mt-7 cursor-pointer rounded-xl bg-white/90 dark:bg-[#0C101A]/90 border border-slate-200/90 dark:border-white/[0.09] hover:border-cyan-500/40 dark:hover:border-white/[0.16] shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] px-3.5 py-2.5 transition-all duration-200"
        >
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 text-xs sm:text-sm truncate transition-colors">
                Jump to any unit, subtopic, or paper (e.g. WCH11, SUVAT, WMA14)...
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="kbd-keycap">Ctrl K</kbd>
            </div>
          </div>
        </SpotlightCard>

        {/* Unified Architectural Telemetry Ribbon */}
        <SpotlightCard
          spotlightColor="rgba(56, 189, 248, 0.07)"
          borderGlowColor="rgba(148, 163, 184, 0.35)"
          className="mt-8 w-full max-w-4xl mx-auto rounded-2xl bg-white/95 dark:bg-[#0A0E17]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden"
        >
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200/70 dark:divide-white/[0.06]">
            {/* Cell 1: Total Questions */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Total Questions
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                {totalQuestionsCombined.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400/80 mt-1">
                100% R2 Cloud Hosted
              </div>
            </div>

            {/* Cell 2: Past Papers */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Past Papers
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                {totalPapersCombined.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400/80 mt-1">
                Jan 2019 – Jun 2026
              </div>
            </div>

            {/* Cell 3: Active Units */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Active Units
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                18
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400/80 mt-1">
                6 Chem · 6 Phys · 6 Math
              </div>
            </div>

            {/* Cell 4: Available Marks */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Available Marks
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                {totalMarksCombined.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400/80 mt-1">
                Audit-Reconciled Rubrics
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* Subject Portal Section Header */}
        <div className="w-full max-w-6xl mx-auto mt-14 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>Available Subjects</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select a subject portal to begin practicing or building tests
            </p>
          </div>
        </div>

        {/* Subject Cards Grid: 3 Subjects Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
          {/* Card 1: Chemistry (Cyan / Emerald Signature) */}
          <SpotlightCard
            enableTilt
            spotlightColor="rgba(6, 182, 212, 0.11)"
            borderGlowColor="rgba(34, 211, 238, 0.45)"
            className="rounded-2xl surface-card p-6 flex flex-col justify-between"
          >
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-90 z-10" />

            {/* Architectural Inline SVG Watermark: Benzene Ring / Molecular Lattice */}
            <svg
              aria-hidden="true"
              viewBox="0 0 200 200"
              className="w-44 h-44 absolute -top-6 -right-6 text-cyan-500 dark:text-cyan-300 opacity-[0.04] group-hover:opacity-[0.09] group-hover:scale-105 transition-all duration-500 pointer-events-none z-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polygon points="100,25 165,62 165,138 100,175 35,138 35,62" />
              <circle cx="100" cy="100" r="42" strokeDasharray="8 6" />
              <line x1="100" y1="25" x2="100" y2="5" />
              <line x1="165" y1="62" x2="185" y2="50" />
              <line x1="165" y1="138" x2="185" y2="150" />
              <line x1="100" y1="175" x2="100" y2="195" />
              <line x1="35" y1="138" x2="15" y2="150" />
              <line x1="35" y1="62" x2="15" y2="50" />
              <circle cx="100" cy="25" r="5" fill="currentColor" />
              <circle cx="165" cy="62" r="5" fill="currentColor" />
              <circle cx="165" cy="138" r="5" fill="currentColor" />
              <circle cx="100" cy="175" r="5" fill="currentColor" />
              <circle cx="35" cy="138" r="5" fill="currentColor" />
              <circle cx="35" cy="62" r="5" fill="currentColor" />
            </svg>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/40 text-white">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  Full Suite Active
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors tracking-tight">
                Chemistry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Pearson Edexcel International A-Level (WCH11–WCH16)
              </p>

              {/* Hardware-Style Unit Chips */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['UNIT 1', 'UNIT 2', 'UNIT 3', 'UNIT 4', 'UNIT 5', 'UNIT 6'].map(
                  (u) => (
                    <span
                      key={u}
                      className="font-mono text-[11px] tabular-nums tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] text-slate-700 dark:text-slate-300 group-hover:border-cyan-500/30 dark:group-hover:border-white/[0.14] transition-colors"
                    >
                      {u}
                    </span>
                  )
                )}
              </div>

              {/* Subject Description / Features */}
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-5 tabular-nums">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0" />
                  <span>
                    <strong>
                      {chemPapers} Papers • {chemTotal.toLocaleString()} Questions
                    </strong>{' '}
                    (2019–2026)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0" />
                  <span>
                    Enclosed organic mechanisms, NMR spectra &amp; titration curves
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0" />
                  <span>
                    Full Suite (WCH11–WCH16) with {chemMarks.toLocaleString()} marks
                  </span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 mt-auto pt-2">
              {/* Live Mastery Progress Strip */}
              <div className="mb-4 p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                    <span>Mastery Progress</span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {chemCompleted.toLocaleString()} / {chemTotal.toLocaleString()}{' '}
                    Completed
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-all duration-500"
                    style={{
                      width: `${chemCompleted > 0 ? Math.max(2, chemProgressPct) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Tactile Specular CTA Buttons */}
              <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate('chemistry-topical')}
                  className="group/btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600/90 to-emerald-600/90 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_14px_rgba(6,182,212,0.25)] border border-cyan-400/35 transition-all active:scale-[0.99]"
                >
                  <Compass className="w-4 h-4" />
                  <span>Launch Topical Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover/btn:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('chemistry-test-maker')}
                  className="group/btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.06] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold text-xs border border-slate-200/90 dark:border-white/[0.07] hover:border-cyan-500/40 dark:hover:border-white/[0.15] transition-all active:scale-[0.99]"
                >
                  <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Custom Test Maker</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 2: Physics (Indigo / Sky Signature) */}
          <SpotlightCard
            enableTilt
            spotlightColor="rgba(99, 102, 241, 0.12)"
            borderGlowColor="rgba(129, 140, 248, 0.45)"
            className="rounded-2xl surface-card p-6 flex flex-col justify-between"
          >
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-90 z-10" />

            {/* Architectural Inline SVG Watermark: Atomic Orbital / Wave Vector */}
            <svg
              aria-hidden="true"
              viewBox="0 0 200 200"
              className="w-44 h-44 absolute -top-6 -right-6 text-indigo-500 dark:text-indigo-300 opacity-[0.04] group-hover:opacity-[0.09] group-hover:scale-105 transition-all duration-500 pointer-events-none z-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <ellipse
                cx="100"
                cy="100"
                rx="82"
                ry="32"
                transform="rotate(30 100 100)"
              />
              <ellipse
                cx="100"
                cy="100"
                rx="82"
                ry="32"
                transform="rotate(-30 100 100)"
              />
              <ellipse
                cx="100"
                cy="100"
                rx="82"
                ry="32"
                transform="rotate(90 100 100)"
              />
              <circle cx="100" cy="100" r="10" fill="currentColor" />
              <circle cx="155" cy="68" r="4.5" fill="currentColor" />
              <circle cx="45" cy="132" r="4.5" fill="currentColor" />
              <circle cx="100" cy="18" r="4.5" fill="currentColor" />
            </svg>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/40 text-white">
                  <Atom className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  Full Suite Active
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors tracking-tight">
                Physics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Pearson Edexcel International A-Level (WPH11–WPH16)
              </p>

              {/* Hardware-Style Unit Chips */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['UNIT 1', 'UNIT 2', 'UNIT 3', 'UNIT 4', 'UNIT 5', 'UNIT 6'].map(
                  (u) => (
                    <span
                      key={u}
                      className="font-mono text-[11px] tabular-nums tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] text-slate-700 dark:text-slate-300 group-hover:border-indigo-500/30 dark:group-hover:border-white/[0.14] transition-colors"
                    >
                      {u}
                    </span>
                  )
                )}
              </div>

              {/* Subject Description / Features */}
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-5 tabular-nums">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                  <span>
                    <strong>
                      {physPapers} Papers • {physTotal.toLocaleString()} Questions
                    </strong>{' '}
                    (2019–2026)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                  <span>
                    Isolated apparatus diagrams, electric circuits &amp; decay curves
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                  <span>
                    Full Suite (WPH11–WPH16) with {physMarks.toLocaleString()} marks
                  </span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 mt-auto pt-2">
              {/* Live Mastery Progress Strip */}
              <div className="mb-4 p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>Mastery Progress</span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {physCompleted.toLocaleString()} / {physTotal.toLocaleString()}{' '}
                    Completed
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 shadow-[0_0_10px_rgba(129,140,248,0.6)] transition-all duration-500"
                    style={{
                      width: `${physCompleted > 0 ? Math.max(2, physProgressPct) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Tactile Specular CTA Buttons */}
              <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate('physics-topical')}
                  className="group/btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/90 to-sky-600/90 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_14px_rgba(99,102,241,0.25)] border border-indigo-400/35 transition-all active:scale-[0.99]"
                >
                  <Compass className="w-4 h-4" />
                  <span>Launch Topical Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover/btn:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('physics-test-maker')}
                  className="group/btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.06] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold text-xs border border-slate-200/90 dark:border-white/[0.07] hover:border-indigo-500/40 dark:hover:border-white/[0.15] transition-all active:scale-[0.99]"
                >
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Custom Test Maker</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 3: Mathematics (Amber / Orange Signature) */}
          <SpotlightCard
            enableTilt
            spotlightColor="rgba(245, 158, 11, 0.11)"
            borderGlowColor="rgba(251, 191, 36, 0.45)"
            className="rounded-2xl surface-card p-6 flex flex-col justify-between"
          >
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-90 z-10" />

            {/* Architectural Inline SVG Watermark: Coordinate Grid & Gaussian Integral Curve */}
            <svg
              aria-hidden="true"
              viewBox="0 0 200 200"
              className="w-44 h-44 absolute -top-6 -right-6 text-amber-500 dark:text-amber-300 opacity-[0.04] group-hover:opacity-[0.09] group-hover:scale-105 transition-all duration-500 pointer-events-none z-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <line x1="20" y1="150" x2="185" y2="150" strokeOpacity="0.6" />
              <line x1="100" y1="20" x2="100" y2="180" strokeOpacity="0.6" />
              <line
                x1="20"
                y1="95"
                x2="185"
                y2="95"
                strokeDasharray="4 6"
                strokeOpacity="0.4"
              />
              <path
                d="M 20 148 C 55 148, 72 38, 100 38 C 128 38, 145 148, 180 148"
                strokeWidth="3"
              />
              <path
                d="M 65 150 L 65 88 M 82 150 L 82 52 M 118 150 L 118 52 M 135 150 L 135 88"
                strokeOpacity="0.45"
                strokeWidth="1.5"
              />
              <circle cx="100" cy="38" r="4.5" fill="currentColor" />
            </svg>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-400/40 text-white">
                  <Sigma className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Full Suite Active
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors tracking-tight">
                Mathematics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Pearson Edexcel International A-Level (WMA11–WMA14, WME01, WST01)
              </p>

              {/* Hardware-Style Unit Chips */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['P1', 'P2', 'P3', 'P4', 'M1', 'S1'].map((u) => (
                  <span
                    key={u}
                    className="font-mono text-[11px] tabular-nums tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] text-slate-700 dark:text-slate-300 group-hover:border-amber-500/30 dark:group-hover:border-white/[0.14] transition-colors"
                  >
                    {u}
                  </span>
                ))}
              </div>

              {/* Subject Description / Features */}
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-5 tabular-nums">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                  <span>
                    <strong>
                      {mathPapers} Papers • {mathTotal.toLocaleString()} Questions
                    </strong>{' '}
                    (2019–2026)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                  <span>
                    Pure Mathematics, Mechanics &amp; Statistics with worked solutions
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                  <span>
                    Full Suite (P1–P4, M1, S1) with {mathMarks.toLocaleString()} marks
                    (75m/paper)
                  </span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 mt-auto pt-2">
              {/* Live Mastery Progress Strip */}
              <div className="mb-4 p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Mastery Progress</span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {mathCompleted.toLocaleString()} / {mathTotal.toLocaleString()}{' '}
                    Completed
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-all duration-500"
                    style={{
                      width: `${mathCompleted > 0 ? Math.max(2, mathProgressPct) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Tactile Specular CTA Buttons */}
              <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate('mathematics-topical')}
                  className="group/btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/95 to-orange-600/95 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_14px_rgba(245,158,11,0.25)] border border-amber-400/35 transition-all active:scale-[0.99]"
                >
                  <Compass className="w-4 h-4" />
                  <span>Launch Topical Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover/btn:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('mathematics-test-maker')}
                  className="group/btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.06] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold text-xs border border-slate-200/90 dark:border-white/[0.07] hover:border-amber-500/40 dark:hover:border-white/[0.15] transition-all active:scale-[0.99]"
                >
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Custom Test Maker</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* 3-Column "Engineered for Precision" Bento Showcase */}
        <div className="w-full max-w-6xl mx-auto mt-16 pt-12 border-t border-slate-200 dark:border-white/[0.07]">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">
                SYSTEM ARCHITECTURE
              </span>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                Engineered for Precision
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hardware-grade tooling built specifically for Edexcel International A-Level workflows
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Smart Mock Exam Solver & A4 PDF Slicer */}
            <SpotlightCard
              spotlightColor="rgba(99, 102, 241, 0.1)"
              borderGlowColor="rgba(129, 140, 248, 0.4)"
              className="rounded-2xl surface-card p-5 flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400">
                    <Printer className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                    3-Stage Solver
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">
                  Smart Mock Exam Solver &amp; A4 PDF Slicer
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Deterministic 3-stage exact mark-sum algorithm assembles official-length
                  papers with vertical multi-page A4 slicing for tall question crops.
                </p>
              </div>

              <div className="relative z-10 flex flex-wrap gap-1.5 pt-3 border-t border-slate-200/70 dark:border-white/[0.06]">
                {[
                  { label: '80m AS', accent: 'text-cyan-600 dark:text-cyan-300' },
                  { label: '90m IA2', accent: 'text-indigo-600 dark:text-indigo-300' },
                  { label: '50m Practical', accent: 'text-emerald-600 dark:text-emerald-300' },
                  { label: '75m Math', accent: 'text-amber-600 dark:text-amber-300' },
                ].map((preset) => (
                  <span
                    key={preset.label}
                    className={`font-mono text-[10px] tabular-nums px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] ${preset.accent}`}
                  >
                    {preset.label}
                  </span>
                ))}
              </div>
            </SpotlightCard>

            {/* Bento Card 2: 5MP <canvas> Annotation Workspace */}
            <SpotlightCard
              spotlightColor="rgba(6, 182, 212, 0.1)"
              borderGlowColor="rgba(34, 211, 238, 0.4)"
              className="rounded-2xl surface-card p-5 flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">
                    5MP Canvas
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">
                  5MP <code className="font-mono text-xs">&lt;canvas&gt;</code> Annotation Workspace
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  In-browser pen, highlighter, and text working out with instant split-pane
                  mark scheme comparison and a non-spoiling interactive MCQ bar.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Shortcuts</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <kbd className="kbd-keycap">Space</kbd>
                  <kbd className="kbd-keycap">M</kbd>
                  <kbd className="kbd-keycap">1–4</kbd>
                </div>
              </div>
            </SpotlightCard>

            {/* Bento Card 3: Interactive Data Booklet & Reference Suite */}
            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.1)"
              borderGlowColor="rgba(52, 211, 153, 0.4)"
              className="rounded-2xl surface-card p-5 flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                    Reference Suite
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">
                  Interactive Data Booklet &amp; Reference Suite
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  18-column Periodic Table, ¹H/¹³C NMR shift bars, Physics Appendix 7/8,
                  and Math Yellow Booklet + S1 Normal distribution tables.
                </p>
              </div>

              <div className="relative z-10 pt-3 border-t border-slate-200/70 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={triggerDataBooklet}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-slate-200/90 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Open Data Booklet</span>
                  </span>
                  <kbd className="kbd-keycap">D</kbd>
                </button>
              </div>
            </SpotlightCard>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-200 dark:border-white/[0.07] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            © {new Date().getFullYear()} Edexcel IAL Revision Platform. All question
            papers and mark schemes are copyright Pearson Edexcel.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('chemistry-topical')}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-medium"
            >
              Chemistry (Units 1–6)
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('physics-topical')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
            >
              Physics (Units 1–6)
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('mathematics-topical')}
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium"
            >
              Mathematics (P1–P4, M1, S1)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
