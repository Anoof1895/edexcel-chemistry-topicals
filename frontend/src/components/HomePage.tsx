import React from 'react';
import { 
  FlaskConical, 
  Atom, 
  Compass, 
  FileText, 
  Layers, 
  FileCheck2, 
  Clock, 
  ArrowRight,
  Sparkles,
  Printer,
  BookOpen
} from 'lucide-react';
import { AppView, QuestionItem } from '../types';

interface HomePageProps {
  onNavigate: (view: AppView) => void;
  questions: QuestionItem[];
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, questions }) => {
  const totalQuestions = questions.length || 5732;
  const uniquePapers = new Set(questions.map((q) => q.paperId || `${q.unitCode}_${q.year}_${q.session}`)).size || 142;
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-dark-950 text-slate-800 dark:text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-cyan-200 transition-colors">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-cyan-500/10 dark:from-cyan-600/15 via-blue-500/5 dark:via-blue-600/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-600/10 blur-3xl rounded-full" />
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-600/10 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-16 flex flex-col items-center">
        {/* Hero Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-300 text-xs font-semibold mb-6 shadow-sm shadow-cyan-950/20">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Pearson Edexcel International A-Level Revision Hub</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-center text-slate-900 dark:text-white max-w-3xl leading-[1.15]">
          Master Edexcel IAL with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 dark:from-cyan-400 dark:via-sky-300 dark:to-blue-400">
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
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-dark-900/80 border border-slate-200 dark:border-dark-800 shadow-sm backdrop-blur-sm text-center">
            <div className="text-xl md:text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
              {totalQuestions.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Total Questions</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-dark-900/80 border border-slate-200 dark:border-dark-800 shadow-sm backdrop-blur-sm text-center">
            <div className="text-xl md:text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {uniquePapers}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Past Papers (2019–2026)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-dark-900/80 border border-slate-200 dark:border-dark-800 shadow-sm backdrop-blur-sm text-center">
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              6 / 6
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Active Chemistry Units</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-dark-900/80 border border-slate-200 dark:border-dark-800 shadow-sm backdrop-blur-sm text-center">
            <div className="text-xl md:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {totalMarks.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Available Marks</div>
          </div>
        </div>

        {/* Subject Portal Section Header */}
        <div className="w-full max-w-4xl mx-auto mt-16 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Available Subjects
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select a subject portal to begin practicing or building tests</p>
          </div>
        </div>

        {/* Subject Cards Grid: 2 Subjects Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
          {/* Card 1: Chemistry (Active) */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-white to-slate-50/80 dark:from-dark-850 dark:to-dark-900 border border-cyan-400/40 dark:border-cyan-500/40 p-6 flex flex-col justify-between shadow-xl shadow-cyan-900/5 dark:shadow-cyan-950/20 hover:border-cyan-500 dark:hover:border-cyan-400 transition-all duration-200 hover:-translate-y-1">
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40 text-white">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
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
                {['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'].map((u) => (
                  <span key={u} className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-750">
                    {u}
                  </span>
                ))}
              </div>

              {/* Subject Description / Features */}
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                  <span><strong>{totalQuestions.toLocaleString()}</strong> questions with stitched procedural stems</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                  <span>Enclosed mechanism drawings, NMR spectra & titration curves</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                  <span>Includes Unit 3 & 6 Alternative to Practical skills</span>
                </li>
              </ul>
            </div>

            {/* Direct Action Buttons */}
            <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-dark-800">
              <button
                type="button"
                onClick={() => onNavigate('chemistry-topical')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-900/10 dark:shadow-cyan-950/40 border border-cyan-400/30 transition-all hover:brightness-105"
              >
                <Compass className="w-4 h-4" />
                <span>Launch Topical Explorer</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('chemistry-test-maker')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-cyan-700 dark:text-cyan-300 font-semibold text-xs border border-slate-200 dark:border-dark-700 hover:border-cyan-500/40 transition-all"
              >
                <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Custom Test Maker</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
              </button>
            </div>
          </div>

          {/* Card 2: Physics (Coming Soon) */}
          <div className="rounded-2xl bg-white/60 dark:bg-dark-900/60 border border-slate-200 dark:border-dark-800 p-6 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 flex items-center justify-center text-slate-400">
                  <Atom className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  Under Construction
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Physics
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Pearson Edexcel International A-Level (WPH11–WPH16)
              </p>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'].map((u) => (
                  <span key={u} className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-dark-850 text-slate-500 border border-slate-200 dark:border-dark-800">
                    {u}
                  </span>
                ))}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Mechanics, Waves, Materials, Electricity, Fields, Further Mechanics & Practical Skills — Pipeline extraction and layout indexing pending.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-dark-800/80">
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-dark-850 text-slate-400 dark:text-slate-500 font-semibold text-xs border border-slate-200 dark:border-dark-800 cursor-not-allowed"
              >
                <Clock className="w-4 h-4" />
                <span>Coming Soon</span>
              </button>
            </div>
          </div>
        </div>

        {/* Platform Feature Highlights */}
        <div className="w-full mt-16 pt-12 border-t border-slate-200 dark:border-dark-800 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-white/70 dark:bg-dark-900/50 border border-slate-200 dark:border-dark-800 shadow-sm flex items-start gap-4">
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

          <div className="p-5 rounded-xl bg-white/70 dark:bg-dark-900/50 border border-slate-200 dark:border-dark-800 shadow-sm flex items-start gap-4">
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

          <div className="p-5 rounded-xl bg-white/70 dark:bg-dark-900/50 border border-slate-200 dark:border-dark-800 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
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
        <div className="w-full mt-16 pt-8 border-t border-slate-200 dark:border-dark-850 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Edexcel IAL Revision Platform. All question papers and mark schemes are copyright Pearson Edexcel.</p>
          <div className="flex items-center gap-4">
            <span>IAL Chemistry Units 1–6</span>
            <span>•</span>
            <button 
              onClick={() => onNavigate('chemistry-topical')} 
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              Topicals
            </button>
            <span>•</span>
            <button 
              onClick={() => onNavigate('chemistry-test-maker')} 
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              Test Maker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
