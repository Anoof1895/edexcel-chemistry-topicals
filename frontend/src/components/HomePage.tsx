import React, { useMemo } from 'react';
import { 
  FlaskConical, 
  Atom, 
  Compass, 
  FileText, 
  Layers, 
  FileCheck2, 
  ArrowRight,
  Sparkles,
  Printer,
  BookOpen,
  Sigma
} from 'lucide-react';
import { AppView, QuestionItem } from '../types';

interface HomePageProps {
  onNavigate: (view: AppView) => void;
  questions: QuestionItem[];
  physicsQuestions?: QuestionItem[];
  mathematicsQuestions?: QuestionItem[];
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, questions, physicsQuestions = [], mathematicsQuestions = [] }) => {
  const { chemTotal, chemPapers, chemMarks, physTotal, physPapers, physMarks, mathTotal, mathPapers, mathMarks } = useMemo(() => {
    const chemTot = questions.length || 5712;
    const chemP = new Set(questions.map((q) => q.paperId || `${q.unitCode}_${q.year}_${q.session}`)).size || 140;
    const chemM = questions.reduce((sum, q) => sum + (q.marks || 0), 0) || 10041;

    const physTot = physicsQuestions.length || 4136;
    const physP = new Set(physicsQuestions.map((q) => q.paperId || `${q.unitCode}_${q.year}_${q.session}`)).size || 140;
    const physM = physicsQuestions.reduce((sum, q) => sum + (q.marks || 0), 0) || 10230;

    const mathTot = mathematicsQuestions.length || 1269;
    const mathP = new Set(mathematicsQuestions.map((q) => q.paperId || `${q.unitCode}_${q.year}_${q.session}`)).size || 142;
    const mathM = mathematicsQuestions.reduce((sum, q) => sum + (q.marks || 0), 0) || 10650;

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

  const totalQuestionsCombined = chemTotal + physTotal + mathTotal;
  const totalPapersCombined = chemPapers + physPapers + mathPapers;
  const totalMarksCombined = chemMarks + physMarks + mathMarks;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-dark-950 text-slate-800 dark:text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-cyan-200 transition-colors">
      {/* Background Glow & Radial Mesh Grid Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_65%_50%_at_50%_0%,#000_65%,transparent_100%)]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-cyan-500/10 dark:from-cyan-500/15 via-indigo-500/5 dark:via-indigo-500/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-600/10 blur-3xl rounded-full" />
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-amber-500/5 dark:bg-amber-600/10 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-16 flex flex-col items-center">
        {/* Hero Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 dark:border-cyan-400/25 text-cyan-700 dark:text-cyan-300 text-xs font-semibold mb-6 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Pearson Edexcel International A-Level Revision Hub</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-center text-slate-900 dark:text-white max-w-3xl leading-[1.12]">
          Master Edexcel IAL with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 dark:from-cyan-400 dark:via-sky-300 dark:to-indigo-400">
            Precision Topicals
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-4 text-sm md:text-base text-slate-600 dark:text-slate-400 text-center max-w-2xl leading-relaxed">
          Access thousands of authentic past paper questions organized strictly by Pearson specification subtopics, 
          featuring instant side-by-side mark schemes and an automated PDF mock exam builder.
        </p>

        {/* Live Quick Stats Strip */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
          <div className="p-3.5 rounded-xl bg-white/85 dark:bg-slate-900/75 border border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/30 dark:hover:border-cyan-400/30">
            <div className="text-xl md:text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 font-mono tabular-nums">
              {totalQuestionsCombined.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Total Questions</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/85 dark:bg-slate-900/75 border border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30 dark:hover:border-indigo-400/30">
            <div className="text-xl md:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
              {totalPapersCombined}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Past Papers (2019–2026)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/85 dark:bg-slate-900/75 border border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 dark:hover:border-emerald-400/30">
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              18 Active Units
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">6 Chem + 6 Phys + 6 Math</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/85 dark:bg-slate-900/75 border border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/30 dark:hover:border-amber-400/30">
            <div className="text-xl md:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {totalMarksCombined.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Available Marks</div>
          </div>
        </div>

        {/* Subject Portal Section Header */}
        <div className="w-full max-w-6xl mx-auto mt-16 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Available Subjects
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select a subject portal to begin practicing or building tests</p>
          </div>
        </div>

        {/* Subject Cards Grid: 3 Subjects Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
          {/* Card 1: Chemistry (Cyan / Emerald Signature) */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-900/90 dark:to-dark-950 border border-cyan-400/40 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] p-6 flex flex-col justify-between shadow-xl shadow-cyan-900/5 dark:shadow-black/50 hover:border-cyan-500 dark:hover:border-cyan-400/50 transition-all duration-200 hover:-translate-y-1">
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-90" />

            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/40 text-white">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  Full Suite Active
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                Chemistry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Pearson Edexcel International A-Level (WCH11–WCH16)
              </p>

              {/* Units Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['UNIT 1', 'UNIT 2', 'UNIT 3', 'UNIT 4', 'UNIT 5', 'UNIT 6'].map((u) => (
                  <span key={u} className="px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold tracking-wider bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                    {u}
                  </span>
                ))}
              </div>

              {/* Subject Description / Features */}
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-6 tabular-nums">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0" />
                  <span><strong>140 Papers • 5,712 Questions</strong> (2019–2026)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0" />
                  <span>Enclosed organic mechanisms, NMR spectra &amp; titration curves</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0" />
                  <span>Full Suite (WCH11–WCH16) with isolated rubrics &amp; practical skills</span>
                </li>
              </ul>
            </div>

            {/* Direct Action Buttons */}
            <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => onNavigate('chemistry-topical')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-md shadow-cyan-900/10 dark:shadow-cyan-950/40 border border-cyan-400/30 transition-all hover:brightness-105 active:scale-[0.99]"
              >
                <Compass className="w-4 h-4" />
                <span>Launch Topical Explorer</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('chemistry-test-maker')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-cyan-700 dark:text-cyan-300 font-semibold text-xs border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 transition-all active:scale-[0.99]"
              >
                <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Custom Test Maker</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
              </button>
            </div>
          </div>

          {/* Card 2: Physics (Indigo / Sky Signature) */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-900/90 dark:to-dark-950 border border-indigo-400/40 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] p-6 flex flex-col justify-between shadow-xl shadow-indigo-900/5 dark:shadow-black/50 hover:border-indigo-500 dark:hover:border-indigo-400/50 transition-all duration-200 hover:-translate-y-1">
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-90" />

            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/40 text-white">
                  <Atom className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  Full Suite Active
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                Physics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Pearson Edexcel International A-Level (WPH11–WPH16)
              </p>

              {/* Units Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['UNIT 1', 'UNIT 2', 'UNIT 3', 'UNIT 4', 'UNIT 5', 'UNIT 6'].map((u) => (
                  <span
                    key={u}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold tracking-wider border bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25"
                  >
                    {u}
                  </span>
                ))}
              </div>

              {/* Subject Description / Features */}
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-6 tabular-nums">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                  <span><strong>140 Papers • 4,136 Questions</strong> (2019–2026)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                  <span>Isolated apparatus diagrams, electric circuits &amp; decay curves</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                  <span>Full Suite (WPH11–WPH16) with 10,230 marks &amp; practical skills</span>
                </li>
              </ul>
            </div>

            {/* Direct Action Buttons */}
            <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => onNavigate('physics-topical')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs shadow-md shadow-indigo-900/10 dark:shadow-indigo-950/40 border border-indigo-400/30 transition-all hover:brightness-105 active:scale-[0.99]"
              >
                <Compass className="w-4 h-4" />
                <span>Launch Topical Explorer</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('physics-test-maker')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 transition-all active:scale-[0.99]"
              >
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Custom Test Maker</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
              </button>
            </div>
          </div>

          {/* Card 3: Mathematics (Amber / Orange Signature) */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-900/90 dark:to-dark-950 border border-amber-400/40 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] p-6 flex flex-col justify-between shadow-xl shadow-amber-900/5 dark:shadow-black/50 hover:border-amber-500 dark:hover:border-amber-400/50 transition-all duration-200 hover:-translate-y-1">
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-90" />

            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-400/40 text-white">
                  <Sigma className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Full Suite Active
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                Mathematics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Pearson Edexcel International A-Level (WMA11–WMA14, WME01, WST01)
              </p>

              {/* Units Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['P1', 'P2', 'P3', 'P4', 'M1', 'S1'].map((u) => (
                  <span
                    key={u}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold tracking-wider border bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25"
                  >
                    {u}
                  </span>
                ))}
              </div>

              {/* Subject Description / Features */}
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-6 tabular-nums">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                  <span><strong>142 Papers • 1,269 Questions</strong> (2019–2026)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                  <span>Pure Mathematics, Mechanics &amp; Statistics with worked solutions</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                  <span>Full Suite (P1–P4, M1, S1) with 10,650 marks (75m per paper)</span>
                </li>
              </ul>
            </div>

            {/* Direct Action Buttons */}
            <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => onNavigate('mathematics-topical')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-md shadow-amber-900/10 dark:shadow-amber-950/40 border border-amber-400/30 transition-all hover:brightness-105 active:scale-[0.99]"
              >
                <Compass className="w-4 h-4" />
                <span>Launch Topical Explorer</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('mathematics-test-maker')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-amber-700 dark:text-amber-300 font-semibold text-xs border border-slate-200 dark:border-white/10 hover:border-amber-500/40 transition-all active:scale-[0.99]"
              >
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Custom Test Maker</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Platform Feature Highlights */}
        <div className="w-full mt-16 pt-12 border-t border-slate-200 dark:border-white/[0.07] grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-white/75 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.07] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Official Pearson Taxonomy</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Questions are tagged with official Pearson specification subtopics and hierarchically locked to parent topics.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/75 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.07] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Side-by-Side Mark Schemes</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Compare your working directly against examiners' guidelines with complete reaction mechanisms, curly arrows, and observation tables.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/75 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.07] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Print-Ready PDF Mock Tests</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Assemble custom tests with target marks and estimated duration. Export clean Question Papers and separate Mark Schemes with smart pagination.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full mt-16 pt-8 border-t border-slate-200 dark:border-white/[0.07] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Edexcel IAL Revision Platform. All question papers and mark schemes are copyright Pearson Edexcel.</p>
          <div className="flex flex-wrap items-center gap-3">
            <span>Chemistry (Units 1–6)</span>
            <span>•</span>
            <span>Physics (Units 1–6)</span>
            <span>•</span>
            <span>Mathematics (P1–P4, M1, S1)</span>
            <span>•</span>
            <button 
              onClick={() => onNavigate('chemistry-topical')} 
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-medium"
            >
              Chemistry
            </button>
            <span>•</span>
            <button 
              onClick={() => onNavigate('physics-topical')} 
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
            >
              Physics
            </button>
            <span>•</span>
            <button 
              onClick={() => onNavigate('mathematics-topical')} 
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium"
            >
              Mathematics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
