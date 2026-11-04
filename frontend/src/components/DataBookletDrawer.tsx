import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  BookOpen,
  FlaskConical,
  Zap,
  Sigma,
} from 'lucide-react';
import { Subject } from '../types';
import { PURE_MATH_FORMULAE } from '../constants/referenceData';
import {
  PhysicsReference,
  PhysicsTab,
  ChemistryReference,
  ChemistryTab,
  MathReference,
  MathTab,
  MathFilter,
  PeriodicTableView,
} from './reference';

interface DataBookletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: Subject;
  onExpandedChange?: (isExpanded: boolean) => void;
}

const stripLatex = (str: string) =>
  str
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}\^_$]/g, ' ')
    .toLowerCase();

export const DataBookletDrawer: React.FC<DataBookletDrawerProps> = ({
  isOpen,
  onClose,
  activeSubject = 'physics',
  onExpandedChange,
}) => {
  const [subject, setSubject] = useState<Subject>(activeSubject);
  const [physicsTab, setPhysicsTab] = useState<PhysicsTab>('constants');
  const [chemistryTab, setChemistryTab] = useState<ChemistryTab>('periodic_table');
  const [mathTab, setMathTab] = useState<MathTab>('pure');
  const [mathFilter, setMathFilter] = useState<MathFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [periodicView, setPeriodicView] = useState<PeriodicTableView>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'grid';
  });

  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Sync subject when drawer opens or activeSubject changes
  useEffect(() => {
    if (isOpen) {
      setSubject(activeSubject);
    }
  }, [isOpen, activeSubject]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        ) {
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedId(id);
          if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
          copyTimeoutRef.current = window.setTimeout(() => setCopiedId(null), 1500);
        })
        .catch(() => {
          // Ignore clipboard permission errors
        });
    }
  };

  const query = searchQuery.trim().toLowerCase();

  // Auto-switch to statistics tab if searching for statistical terms and pure math has 0 matches
  useEffect(() => {
    if (subject === 'mathematics' && query && mathTab === 'pure') {
      const isStatQuery = /(normal|phi|table|percentage|z-score|distribution|critical)/i.test(query);
      if (isStatQuery) {
        const hasPureMatch = PURE_MATH_FORMULAE.some((item) => {
          if (mathFilter === 'in_booklet' && !item.inBooklet) return false;
          if (mathFilter === 'must_memorise' && item.inBooklet) return false;
          const cleanLatex = stripLatex(item.latex);
          return (
            item.title.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            item.unit.toLowerCase().includes(query) ||
            cleanLatex.includes(query) ||
            item.latex.toLowerCase().includes(query)
          );
        });
        if (!hasPureMatch) {
          setMathTab('statistics');
        }
      }
    }
  }, [query, subject, mathTab, mathFilter]);

  const isGridActive =
    subject === 'chemistry' &&
    chemistryTab === 'periodic_table' &&
    !query &&
    periodicView === 'grid';

  useEffect(() => {
    onExpandedChange?.(isOpen && isGridActive);
  }, [isOpen, isGridActive, onExpandedChange]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-transparent md:pointer-events-none select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Drawer Container */}
      <div
        className={`w-full ${
          isGridActive ? 'md:w-[92vw] lg:w-[960px] max-w-5xl' : 'sm:w-[500px] md:w-[560px]'
        } h-full bg-white dark:bg-[#0B0F17] border-l border-slate-200 dark:border-white/[0.08] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 z-10 select-text transition-[width] pointer-events-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] surface-glass shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Data Booklet &amp; Formulae
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    Pearson IAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Exact specification constants, equations &amp; tables
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center kbd-keycap">Press D</span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
                title="Close Drawer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subject Switcher Segmented Control */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center bg-slate-200/70 dark:bg-[#07090D] p-0.5 rounded-lg text-xs w-full gap-0.5 border border-slate-300/40 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setSubject('physics')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md font-bold transition-all truncate ${
                  subject === 'physics'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Physics</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubject('chemistry');
                  setChemistryTab('periodic_table');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md font-bold transition-all truncate ${
                  subject === 'chemistry'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Chemistry</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubject('mathematics');
                  setMathTab('pure');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md font-bold transition-all truncate ${
                  subject === 'mathematics'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sigma className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Mathematics</span>
              </button>
            </div>
          </div>

          {/* Real-Time Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={
                subject === 'physics'
                  ? 'Search constants, equations (e.g. g, Stokes, de Broglie, SHM)...'
                  : subject === 'mathematics'
                  ? 'Search formulae (e.g. binomial, quotient, suvat, normal, correlation)...'
                  : 'Search constants, indicators, NMR shifts, electrode potentials...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#07090D] border border-slate-200 dark:border-white/[0.08] rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subtopic Tabs */}
          <div>
            {subject === 'physics' ? (
              <div className="grid grid-cols-3 gap-1 w-full text-xs">
                <button
                  type="button"
                  onClick={() => setPhysicsTab('constants')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    physicsTab === 'constants'
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Data Sheet (14)
                </button>
                <button
                  type="button"
                  onClick={() => setPhysicsTab('ias')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    physicsTab === 'ias'
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  IAS Equations
                </button>
                <button
                  type="button"
                  onClick={() => setPhysicsTab('ia2')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    physicsTab === 'ia2'
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  IA2 Equations
                </button>
              </div>
            ) : subject === 'mathematics' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1 w-full text-xs">
                  <button
                    type="button"
                    onClick={() => setMathTab('pure')}
                    className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                      mathTab === 'pure'
                        ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    Pure (P1–P4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMathTab('mechanics')}
                    className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                      mathTab === 'mechanics'
                        ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    Mechanics (M1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMathTab('statistics')}
                    className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                      mathTab === 'statistics'
                        ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    Statistics (S1)
                  </button>
                </div>

                {/* 3-Way Formula Filter Segmented Control */}
                <div className="flex items-center bg-slate-200/70 dark:bg-[#07090D] p-0.5 rounded-lg text-xs gap-0.5 border border-slate-300/40 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setMathFilter('all')}
                    className={`flex-1 py-1 px-1.5 rounded-md font-bold text-center transition-all truncate text-[11px] ${
                      mathFilter === 'all'
                        ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-white/10'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All Formulae
                  </button>
                  <button
                    type="button"
                    onClick={() => setMathFilter('in_booklet')}
                    className={`flex-1 py-1 px-1.5 rounded-md font-bold text-center transition-all truncate text-[11px] flex items-center justify-center gap-1 ${
                      mathFilter === 'in_booklet'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="truncate">In Yellow Booklet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMathFilter('must_memorise')}
                    className={`flex-1 py-1 px-1.5 rounded-md font-bold text-center transition-all truncate text-[11px] flex items-center justify-center gap-1 ${
                      mathFilter === 'must_memorise'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                    <span className="truncate">Must Memorise</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 w-full text-xs">
                <button
                  type="button"
                  onClick={() => setChemistryTab('periodic_table')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    chemistryTab === 'periodic_table'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Periodic Table
                </button>
                <button
                  type="button"
                  onClick={() => setChemistryTab('constants_indicators')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    chemistryTab === 'constants_indicators'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Constants
                </button>
                <button
                  type="button"
                  onClick={() => setChemistryTab('spectroscopy')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    chemistryTab === 'spectroscopy'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  IR &amp; NMR
                </button>
                <button
                  type="button"
                  onClick={() => setChemistryTab('redox')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    chemistryTab === 'redox'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  Redox (E°)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {subject === 'physics' && (
            <PhysicsReference
              physicsTab={physicsTab}
              searchQuery={searchQuery}
              copiedId={copiedId}
              onCopy={copyToClipboard}
            />
          )}

          {subject === 'chemistry' && (
            <ChemistryReference
              chemistryTab={chemistryTab}
              searchQuery={searchQuery}
              periodicView={periodicView}
              onChangePeriodicView={setPeriodicView}
              copiedId={copiedId}
              onCopy={copyToClipboard}
            />
          )}

          {subject === 'mathematics' && (
            <MathReference
              mathTab={mathTab}
              mathFilter={mathFilter}
              onChangeMathFilter={setMathFilter}
              searchQuery={searchQuery}
              copiedId={copiedId}
              onCopy={copyToClipboard}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DataBookletDrawer;
