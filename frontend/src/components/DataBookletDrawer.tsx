import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  Copy, 
  Check, 
  BookOpen, 
  FlaskConical, 
  Zap
} from 'lucide-react';
import { Subject } from '../types';
import {
  PHYSICS_CONSTANTS,
  IAS_PHYSICS_EQUATIONS,
  IA2_PHYSICS_EQUATIONS,
  CHEMISTRY_CONSTANTS,
  CHEMISTRY_KEY_EQUATIONS,
  CHEMISTRY_INDICATORS,
  IR_SPECTROSCOPY_DATA,
  PROTON_NMR_SHIFTS,
  CARBON_NMR_SHIFTS,
  ELECTRODE_POTENTIALS,
  PERIODIC_ELEMENTS,
} from '../constants/referenceData';
import { MathFormula } from './MathFormula';

interface DataBookletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: Subject;
  onExpandedChange?: (isExpanded: boolean) => void;
}

type PhysicsTab = 'constants' | 'ias' | 'ia2';
type ChemistryTab = 'periodic_table' | 'constants_indicators' | 'spectroscopy' | 'redox';
type PeriodicTableView = 'grid' | 'cards';

function getElementCategoryStyle(category?: string) {
  switch (category) {
    case 'alkali':
      return 'bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-amber-300/60 dark:border-amber-600/40 text-amber-900 dark:text-amber-200';
    case 'alkaline-earth':
      return 'bg-orange-50/70 hover:bg-orange-100/80 dark:bg-orange-950/20 dark:hover:bg-orange-950/40 border-orange-300/60 dark:border-orange-600/40 text-orange-900 dark:text-orange-200';
    case 'transition':
      return 'bg-slate-50 hover:bg-slate-100 dark:bg-dark-850 dark:hover:bg-dark-800 border-slate-200 dark:border-dark-750 text-slate-800 dark:text-slate-200';
    case 'post-transition':
      return 'bg-sky-50/70 hover:bg-sky-100/80 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 border-sky-300/60 dark:border-sky-600/40 text-sky-900 dark:text-sky-200';
    case 'metalloid':
      return 'bg-teal-50/70 hover:bg-teal-100/80 dark:bg-teal-950/20 dark:hover:bg-teal-950/40 border-teal-300/60 dark:border-teal-600/40 text-teal-900 dark:text-teal-200';
    case 'nonmetal':
      return 'bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-300/60 dark:border-blue-600/40 text-blue-900 dark:text-blue-200';
    case 'halogen':
      return 'bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border-emerald-300/60 dark:border-emerald-600/40 text-emerald-900 dark:text-emerald-200';
    case 'noble-gas':
      return 'bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 border-purple-300/60 dark:border-purple-600/40 text-purple-900 dark:text-purple-200';
    case 'lanthanide':
      return 'bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border-rose-300/60 dark:border-rose-600/40 text-rose-900 dark:text-rose-200';
    default:
      return 'bg-slate-50 hover:bg-slate-100 dark:bg-dark-850 dark:hover:bg-dark-800 border-slate-200 dark:border-dark-750 text-slate-800 dark:text-slate-200';
  }
}

export const DataBookletDrawer: React.FC<DataBookletDrawerProps> = ({
  isOpen,
  onClose,
  activeSubject = 'physics',
  onExpandedChange,
}) => {
  const [subject, setSubject] = useState<Subject>(activeSubject);
  const [physicsTab, setPhysicsTab] = useState<PhysicsTab>('constants');
  const [chemistryTab, setChemistryTab] = useState<ChemistryTab>('periodic_table');
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
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedId(id);
          if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
          copyTimeoutRef.current = window.setTimeout(() => setCopiedId(null), 1500);
        })
        .catch(() => {
          // Fallback or ignore clipboard permission errors
        });
    }
  };

  const query = searchQuery.trim().toLowerCase();

  // Filtered Physics Constants
  const filteredPhysicsConstants = useMemo(() => {
    if (!query) return PHYSICS_CONSTANTS;
    return PHYSICS_CONSTANTS.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.symbol.toLowerCase().includes(query) ||
        c.value.toLowerCase().includes(query) ||
        (c.notes && c.notes.toLowerCase().includes(query))
    );
  }, [query]);

  // Filtered Physics Equations
  const filteredIasEquations = useMemo(() => {
    if (!query) return IAS_PHYSICS_EQUATIONS;
    return IAS_PHYSICS_EQUATIONS.filter(
      (eq) =>
        eq.title.toLowerCase().includes(query) ||
        eq.formula.toLowerCase().includes(query) ||
        eq.topic.toLowerCase().includes(query) ||
        (eq.description && eq.description.toLowerCase().includes(query))
    );
  }, [query]);

  const filteredIa2Equations = useMemo(() => {
    if (!query) return IA2_PHYSICS_EQUATIONS;
    return IA2_PHYSICS_EQUATIONS.filter(
      (eq) =>
        eq.title.toLowerCase().includes(query) ||
        eq.formula.toLowerCase().includes(query) ||
        eq.topic.toLowerCase().includes(query) ||
        (eq.description && eq.description.toLowerCase().includes(query))
    );
  }, [query]);

  // Filtered Chemistry Data
  const filteredChemConstants = useMemo(() => {
    if (!query) return CHEMISTRY_CONSTANTS;
    return CHEMISTRY_CONSTANTS.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.symbol.toLowerCase().includes(query) ||
        c.value.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredChemEquations = useMemo(() => {
    if (!query) return CHEMISTRY_KEY_EQUATIONS;
    return CHEMISTRY_KEY_EQUATIONS.filter(
      (eq) =>
        eq.title.toLowerCase().includes(query) ||
        eq.formula.toLowerCase().includes(query) ||
        eq.topic.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredIndicators = useMemo(() => {
    if (!query) return CHEMISTRY_INDICATORS;
    return CHEMISTRY_INDICATORS.filter(
      (ind) =>
        ind.name.toLowerCase().includes(query) ||
        ind.phRange.toLowerCase().includes(query) ||
        ind.acidColour.toLowerCase().includes(query) ||
        ind.alkalineColour.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredIr = useMemo(() => {
    if (!query) return IR_SPECTROSCOPY_DATA;
    return IR_SPECTROSCOPY_DATA.filter(
      (item) =>
        item.group.toLowerCase().includes(query) ||
        (item.bond && item.bond.toLowerCase().includes(query)) ||
        item.environment.toLowerCase().includes(query) ||
        item.range.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredProtonNmr = useMemo(() => {
    if (!query) return PROTON_NMR_SHIFTS;
    return PROTON_NMR_SHIFTS.filter(
      (item) =>
        item.structure.toLowerCase().includes(query) ||
        item.shiftRange.toLowerCase().includes(query) ||
        (item.example && item.example.toLowerCase().includes(query))
    );
  }, [query]);

  const filteredCarbonNmr = useMemo(() => {
    if (!query) return CARBON_NMR_SHIFTS;
    return CARBON_NMR_SHIFTS.filter(
      (item) =>
        item.structure.toLowerCase().includes(query) ||
        item.shiftRange.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredRedox = useMemo(() => {
    if (!query) return ELECTRODE_POTENTIALS;
    return ELECTRODE_POTENTIALS.filter(
      (item) =>
        item.equation.toLowerCase().includes(query) ||
        item.potential.toLowerCase().includes(query) ||
        (item.latex && item.latex.toLowerCase().includes(query))
    );
  }, [query]);

  const filteredElements = useMemo(() => {
    if (!query) return PERIODIC_ELEMENTS;
    return PERIODIC_ELEMENTS.filter(
      (el) =>
        el.symbol.toLowerCase().includes(query) ||
        el.name.toLowerCase().includes(query) ||
        String(el.atomicNumber).includes(query) ||
        el.atomicMass.toLowerCase().includes(query)
    );
  }, [query]);

  const isGridActive = subject === 'chemistry' && chemistryTab === 'periodic_table' && !query && periodicView === 'grid';

  useEffect(() => {
    onExpandedChange?.(isOpen && isGridActive);
  }, [isOpen, isGridActive, onExpandedChange]);

  const groupByTopic = <T extends { topic: string }>(items: T[]) => {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
      if (!groups[item.topic]) {
        groups[item.topic] = [];
      }
      groups[item.topic].push(item);
    }
    return groups;
  };

  const groupedIasEquations = useMemo(() => groupByTopic(filteredIasEquations), [filteredIasEquations]);
  const groupedIa2Equations = useMemo(() => groupByTopic(filteredIa2Equations), [filteredIa2Equations]);
  const groupedChemEquations = useMemo(() => groupByTopic(filteredChemEquations), [filteredChemEquations]);

  const groupedIr = useMemo(() => {
    const groups: Record<string, typeof IR_SPECTROSCOPY_DATA> = {};
    for (const item of filteredIr) {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    }
    return groups;
  }, [filteredIr]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-transparent select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Drawer Container */}
      <div 
        className={`w-full ${
          isGridActive ? 'md:w-[92vw] lg:w-[960px] max-w-5xl' : 'sm:w-[500px] md:w-[560px]'
        } h-full bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-dark-750 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 z-10 select-text transition-[width]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-850 shrink-0 space-y-3">
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
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-dark-700">
                Press D
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-800 transition-colors"
                title="Close Drawer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subject Switcher Segmented Control */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center bg-slate-200/70 dark:bg-dark-800 p-0.5 rounded-lg text-xs w-full">
              <button
                type="button"
                onClick={() => setSubject('physics')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-bold transition-all ${
                  subject === 'physics'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Physics (Appendix 7 &amp; 8)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubject('chemistry');
                  setChemistryTab('periodic_table');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-bold transition-all ${
                  subject === 'chemistry'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Chemistry (Appendix 9)</span>
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
                  : 'Search constants, indicators, NMR shifts, electrode potentials...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-750 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
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
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                >
                  Data Sheet (14)
                </button>
                <button
                  type="button"
                  onClick={() => setPhysicsTab('ias')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    physicsTab === 'ias'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                >
                  IAS Equations
                </button>
                <button
                  type="button"
                  onClick={() => setPhysicsTab('ia2')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    physicsTab === 'ia2'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                >
                  IA2 Equations
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 w-full text-xs">
                <button
                  type="button"
                  onClick={() => setChemistryTab('periodic_table')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center truncate transition-all ${
                    chemistryTab === 'periodic_table'
                      ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
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
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
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
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
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
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
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
          {/* ================================================================= */}
          {/* PHYSICS TABS                                                      */}
          {/* ================================================================= */}
          {subject === 'physics' && physicsTab === 'constants' && (
            <div className="space-y-2.5">
              <div className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs">
                <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2.5 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Physics Data Sheet (Appendix 8)
                  </h4>
                  <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                    {filteredPhysicsConstants.length} constants
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-dark-800">
                  {filteredPhysicsConstants.map((c, i) => {
                    const id = `phys-c-${i}`;
                    const isCopied = copiedId === id;
                    return (
                      <div
                        key={id}
                        className="p-3 flex items-center justify-between gap-3 group hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {c.name}
                          </div>
                          {c.notes && (
                            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 italic">
                              ({c.notes})
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center justify-end gap-1.5 font-mono text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-dark-750 text-cyan-700 dark:text-cyan-300">
                              <MathFormula latex={c.symbolLatex || c.symbol} className="text-xs" />
                            </span>
                            <span className="text-slate-400">=</span>
                            <span className="font-bold text-slate-900 dark:text-white">{c.value}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">{c.unit}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`${c.symbol} = ${c.value} ${c.unit}`, id)}
                            className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
                            title="Copy constant to clipboard"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {subject === 'physics' && physicsTab === 'ias' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
                <span>Units 1 &amp; 2 Formulae (Appendix 8)</span>
                <span>{filteredIasEquations.length} equations</span>
              </div>
              <div className="space-y-3">
                {Object.entries(groupedIasEquations).map(([topic, eqs]) => (
                  <div
                    key={topic}
                    className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs"
                  >
                    <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        {topic}
                      </h4>
                      <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                        {eqs.length} {eqs.length === 1 ? 'formula' : 'formulae'}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-dark-800">
                      {eqs.map((eq) => {
                        const isCopied = copiedId === eq.id;
                        return (
                          <div
                            key={eq.id}
                            className="p-3 flex items-center justify-between gap-3 group hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                {eq.title}
                              </div>
                              {eq.description && (
                                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 italic">
                                  {eq.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200/80 dark:border-dark-750 text-slate-900 dark:text-white flex items-center justify-center min-h-[36px]">
                                <MathFormula latex={eq.latex || eq.formula} className="text-xs sm:text-sm" />
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(eq.formula, eq.id)}
                                className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
                                title="Copy formula"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subject === 'physics' && physicsTab === 'ia2' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
                <span>Units 4 &amp; 5 Formulae (Appendix 8)</span>
                <span>{filteredIa2Equations.length} equations</span>
              </div>
              <div className="space-y-3">
                {Object.entries(groupedIa2Equations).map(([topic, eqs]) => (
                  <div
                    key={topic}
                    className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs"
                  >
                    <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        {topic}
                      </h4>
                      <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                        {eqs.length} {eqs.length === 1 ? 'formula' : 'formulae'}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-dark-800">
                      {eqs.map((eq) => {
                        const isCopied = copiedId === eq.id;
                        return (
                          <div
                            key={eq.id}
                            className="p-3 flex items-center justify-between gap-3 group hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                {eq.title}
                              </div>
                              {eq.description && (
                                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 italic">
                                  {eq.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200/80 dark:border-dark-750 text-slate-900 dark:text-white flex items-center justify-center min-h-[36px]">
                                <MathFormula latex={eq.latex || eq.formula} className="text-xs sm:text-sm" />
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(eq.formula, eq.id)}
                                className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
                                title="Copy formula"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* CHEMISTRY TABS                                                    */}
          {/* ================================================================= */}
          {subject === 'chemistry' && chemistryTab === 'constants_indicators' && (
            <div className="space-y-4">
              {/* Constants */}
              <div>
                <div className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs mb-4">
                  <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2.5 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      Physical Constants (Page 100)
                    </h4>
                    <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                      {filteredChemConstants.length} constants
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-dark-800">
                    {filteredChemConstants.map((c, i) => {
                      const id = `chem-c-${i}`;
                      const isCopied = copiedId === id;
                      return (
                        <div
                          key={id}
                          className="p-2.5 flex items-center justify-between gap-3 group hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {c.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center justify-end gap-1.5 font-mono text-xs">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-dark-750 text-cyan-700 dark:text-cyan-300">
                                <MathFormula latex={c.symbolLatex || c.symbol} className="text-xs" />
                              </span>
                              <span className="text-slate-400">=</span>
                              <span className="font-bold text-slate-900 dark:text-white">{c.value}</span>
                              <span className="text-slate-500 dark:text-slate-400 text-[11px]">{c.unit}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`${c.symbol} = ${c.value} ${c.unit}`, id)}
                              className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
                              title="Copy"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Specification Equations */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1 mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Key Specification Equations
                  </h4>
                  <span>{filteredChemEquations.length} equations</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(groupedChemEquations).map(([topic, eqs]) => (
                    <div
                      key={topic}
                      className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs"
                    >
                      <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          {topic}
                        </h4>
                        <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                          {eqs.length} {eqs.length === 1 ? 'formula' : 'formulae'}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-dark-800">
                        {eqs.map((eq) => {
                          const isCopied = copiedId === eq.id;
                          return (
                            <div
                              key={eq.id}
                              className="p-3 flex items-center justify-between gap-3 group hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
                            >
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                  {eq.title}
                                </div>
                                {eq.description && (
                                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 italic">
                                    {eq.description}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200/80 dark:border-dark-750 text-slate-900 dark:text-white flex items-center justify-center min-h-[36px]">
                                  <MathFormula latex={eq.latex || eq.formula} className="text-xs sm:text-sm" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(eq.formula, eq.id)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
                                  title="Copy"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acid-Base Indicators Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Indicators (Page 103 — at 298 K)
                </h4>
                <div className="space-y-1.5">
                  {filteredIndicators.map((ind, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-750 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{ind.name}</span>
                        <span className="font-mono text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                          pK_in = {ind.pKin}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="capitalize font-medium text-slate-600 dark:text-slate-300">
                          {ind.acidColour}
                        </span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          pH {ind.phRange}
                        </span>
                        <span className="capitalize font-medium text-slate-600 dark:text-slate-300">
                          {ind.alkalineColour}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {subject === 'chemistry' && chemistryTab === 'spectroscopy' && (
            <div className="space-y-4">
              {/* IR Spectroscopy Grouped Table */}
              <div className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs">
                {/* Table Header Bar */}
                <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2.5 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Infrared Spectroscopy (Page 101)
                  </h4>
                  <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                    {filteredIr.length} ranges
                  </span>
                </div>

                {/* Two-Column Header */}
                <div className="grid grid-cols-12 bg-slate-50 dark:bg-dark-900 border-b border-slate-200 dark:border-dark-750 text-[11px] font-bold text-slate-600 dark:text-slate-300 px-3.5 py-2">
                  <div className="col-span-7">Group</div>
                  <div className="col-span-5 text-right font-mono">Wavenumber range / cm⁻¹</div>
                </div>

                {/* Grouped Rows by Section Subheader */}
                <div className="divide-y divide-slate-100 dark:divide-dark-800">
                  {Object.entries(groupedIr).map(([groupTitle, items]) => (
                    <div key={groupTitle}>
                      {/* Bold Section Subheader */}
                      <div className="bg-slate-100/70 dark:bg-dark-800/70 px-3.5 py-1.5 border-y border-slate-200/60 dark:border-dark-750/60 text-xs font-bold text-cyan-700 dark:text-cyan-400">
                        {groupTitle}
                      </div>

                      {/* Rows for this group */}
                      <div className="divide-y divide-slate-100/80 dark:divide-dark-800/80">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 items-center px-3.5 py-2 text-xs hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
                          >
                            <div className="col-span-7 font-medium text-slate-800 dark:text-slate-200 pr-2">
                              {item.environment}
                            </div>
                            <div className="col-span-5 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {item.range}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1H NMR Shifts */}
              <div className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs">
                <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2.5 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      ¹H NMR Chemical Shifts (Page 102)
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      δ / ppm relative to tetramethylsilane (TMS = 0.0 ppm)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                    {filteredProtonNmr.length} ranges
                  </span>
                </div>

                {/* Visual Axis Header */}
                <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-dark-900 border-b border-slate-200/80 dark:border-dark-750/80">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 pb-0.5">
                    <span>12.0 (Downfield)</span>
                    <span>10.0</span>
                    <span>8.0</span>
                    <span>6.0</span>
                    <span>4.0</span>
                    <span>2.0</span>
                    <span>0.0 ppm (TMS)</span>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-dark-750 rounded-full w-full" />
                </div>

                <div className="divide-y divide-slate-100 dark:divide-dark-800">
                  {filteredProtonNmr.map((item, idx) => {
                    const min = item.minShift ?? 0;
                    const max = item.maxShift ?? 12;
                    // Scale 0 to 12.1 ppm (downfield 12.1 on left, 0 on right)
                    const leftPct = Math.max(0, Math.min(100, ((12.1 - max) / 12.1) * 100));
                    const widthPct = Math.max(2, Math.min(100 - leftPct, ((max - min) / 12.1) * 100));

                    return (
                      <div
                        key={idx}
                        className="p-3 hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold font-mono text-xs text-slate-900 dark:text-slate-100">
                              {item.structure}
                            </div>
                            {item.example && (
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 italic">
                                ({item.example})
                              </div>
                            )}
                          </div>
                          <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg shrink-0">
                            {item.shiftRange}
                          </span>
                        </div>

                        {/* Horizontal Visual Range Bar */}
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-dark-900 relative overflow-hidden border border-slate-200/50 dark:border-dark-750">
                          <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 13C NMR Shifts */}
              <div className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs">
                <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2.5 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      ¹³C NMR Chemical Shifts (Page 102)
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      δ / ppm relative to tetramethylsilane (TMS = 0 ppm)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                    {filteredCarbonNmr.length} ranges
                  </span>
                </div>

                {/* Visual Axis Header */}
                <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-dark-900 border-b border-slate-200/80 dark:border-dark-750/80">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 pb-0.5">
                    <span>220 (Downfield)</span>
                    <span>180</span>
                    <span>140</span>
                    <span>100</span>
                    <span>60</span>
                    <span>20</span>
                    <span>0 ppm (TMS)</span>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-dark-750 rounded-full w-full" />
                </div>

                <div className="divide-y divide-slate-100 dark:divide-dark-800">
                  {filteredCarbonNmr.map((item, idx) => {
                    const min = item.minShift ?? 0;
                    const max = item.maxShift ?? 222;
                    // Scale 0 to 225 ppm (downfield 225 on left, 0 on right)
                    const leftPct = Math.max(0, Math.min(100, ((225 - max) / 225) * 100));
                    const widthPct = Math.max(2, Math.min(100 - leftPct, ((max - min) / 225) * 100));

                    return (
                      <div
                        key={idx}
                        className="p-3 hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold font-mono text-xs text-slate-900 dark:text-slate-100">
                              {item.structure}
                            </div>
                            {item.example && (
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 italic">
                                ({item.example})
                              </div>
                            )}
                          </div>
                          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg shrink-0">
                            {item.shiftRange}
                          </span>
                        </div>

                        {/* Horizontal Visual Range Bar */}
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-dark-900 relative overflow-hidden border border-slate-200/50 dark:border-dark-750">
                          <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {subject === 'chemistry' && chemistryTab === 'redox' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/60 dark:border-dark-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Standard Electrode Potentials at 298 K (Page 104)
                </span>
                <span className="font-mono text-[11px]">{filteredRedox.length} of 31 half-equations</span>
              </div>

              {/* High-Density Specification Table */}
              <div className="border border-slate-200 dark:border-dark-750 rounded-xl overflow-hidden divide-y divide-slate-200/70 dark:divide-dark-800 bg-white dark:bg-dark-900 shadow-xs">
                {filteredRedox.map((item) => {
                  const id = `redox-${item.id}`;
                  const isCopied = copiedId === id;
                  const isPositive = item.numericValue > 0;
                  const isZero = item.numericValue === 0;
                  const isSHE = item.id === 11 || isZero;

                  return (
                    <div
                      key={item.id}
                      className={`px-3 py-2 flex items-center justify-between gap-3 text-xs group transition-colors ${
                        isSHE
                          ? 'bg-cyan-50/70 dark:bg-cyan-950/25 ring-1 ring-inset ring-cyan-500/40'
                          : 'hover:bg-slate-50/80 dark:hover:bg-dark-850/60'
                      }`}
                    >
                      {/* Left Column: Subtle Index Badge + KaTeX Half-Equation */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`font-mono text-[10px] w-5 h-5 rounded flex items-center justify-center shrink-0 font-bold ${
                            isSHE
                              ? 'bg-cyan-500 text-white'
                              : 'bg-slate-100 dark:bg-dark-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {item.id}
                        </span>

                        <div className="overflow-x-auto overflow-y-hidden py-0.5 select-text min-w-0 text-slate-900 dark:text-slate-100">
                          {item.latex ? (
                            <MathFormula latex={item.latex} displayMode={false} className="text-[12.5px] sm:text-[13px]" />
                          ) : (
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {item.equation}
                            </span>
                          )}
                        </div>

                        {isSHE && (
                          <span className="hidden sm:inline-flex items-center text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/50 shrink-0">
                            SHE Reference
                          </span>
                        )}
                      </div>

                      {/* Right Column: Color-coded Voltage Pill + Copy Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border shadow-2xs ${
                            isZero
                              ? 'bg-cyan-100/70 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-200 border-cyan-400/60 dark:border-cyan-500/50 font-extrabold'
                              : isPositive
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-500/30'
                              : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/80 dark:border-rose-500/30'
                          }`}
                        >
                          {item.potential} V
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`${item.equation}  E° = ${item.potential} V`, id)}
                          className="p-1 rounded-md bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 opacity-60 group-hover:opacity-100 transition-all"
                          title="Copy half-equation and E°"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {subject === 'chemistry' && chemistryTab === 'periodic_table' && (
            <div className="space-y-3">
              {/* Header with Title and View Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-dark-750/70">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {query ? `Search results for "${searchQuery}"` : 'Periodic Table of the Elements'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Pearson Edexcel IAL Specification (Appendix 9) • {filteredElements.length} elements
                  </div>
                </div>

                {/* View Toggle (18-Col Grid vs Compact Cards) */}
                <div className="flex items-center bg-slate-200/80 dark:bg-dark-800 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPeriodicView('grid')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      (!query && periodicView === 'grid')
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    18-Col Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodicView('cards')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      (query || periodicView === 'cards')
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Compact Cards {query && `(${filteredElements.length})`}
                  </button>
                </div>
              </div>

              {/* 18-Column Grid View (when NOT searching and periodicView is 'grid') */}
              {!query && periodicView === 'grid' ? (
                <div className="space-y-2">
                  <div className="overflow-x-auto pb-3 -mx-2 px-2">
                    <div
                      className="min-w-[760px] grid gap-0.5 select-text"
                      style={{
                        gridTemplateColumns: '24px repeat(18, minmax(0, 1fr))',
                        gridTemplateRows: '20px repeat(6, minmax(54px, auto))',
                      }}
                    >
                      {/* Top-Left Corner */}
                      <div
                        style={{ gridRow: 1, gridColumn: 1 }}
                        className="text-center font-mono text-[9px] text-slate-400 dark:text-slate-500 font-bold self-end"
                      >
                        P \ G
                      </div>

                      {/* Group Headers 1 to 18 */}
                      {Array.from({ length: 18 }, (_, i) => i + 1).map((g) => (
                        <div
                          key={`grp-${g}`}
                          style={{ gridRow: 1, gridColumn: g + 1 }}
                          className="text-center font-mono font-bold text-[9px] text-slate-500 dark:text-slate-400 self-end pb-0.5"
                        >
                          {g}
                        </div>
                      ))}

                      {/* Period Labels 1 to 6 */}
                      {Array.from({ length: 6 }, (_, i) => i + 1).map((p) => (
                        <div
                          key={`prd-${p}`}
                          style={{ gridRow: p + 1, gridColumn: 1 }}
                          className="text-center font-mono font-bold text-[9px] text-slate-500 dark:text-slate-400 self-center pr-1"
                        >
                          {p}
                        </div>
                      ))}

                      {/* Official Pearson Specification Key Box placed in the empty transition gap of Periods 1-2 */}
                      <div
                        style={{ gridRow: '2 / span 2', gridColumn: '4 / span 9' }}
                        className="hidden sm:flex items-center justify-center p-1"
                      >
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-100/90 dark:bg-dark-800/90 border border-slate-300/60 dark:border-dark-700 shadow-xs">
                          {/* Sample Element Box (Carbon) */}
                          <div className="w-14 p-1 rounded-md border border-cyan-500/50 bg-white dark:bg-dark-850 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between text-[8px] font-mono leading-none">
                              <span className="font-bold text-slate-700 dark:text-slate-300">6</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">2.5</span>
                            </div>
                            <div className="text-center my-0.5">
                              <span className="font-black font-mono text-sm text-cyan-600 dark:text-cyan-400 leading-none">
                                C
                              </span>
                            </div>
                            <div className="text-center text-[8px] font-mono font-bold text-slate-700 dark:text-slate-300 leading-none">
                              12.0
                            </div>
                          </div>

                          {/* Key Explanation */}
                          <div className="space-y-0.5 text-[9px] text-slate-600 dark:text-slate-300 font-sans">
                            <div className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[8.5px]">
                              Key
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">6</span>
                              <span className="text-slate-400">=</span>
                              <span>Atomic Number (Z)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">2.5</span>
                              <span className="text-slate-400">=</span>
                              <span>Pauling Electronegativity</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">12.0</span>
                              <span className="text-slate-400">=</span>
                              <span>Relative Atomic Mass (A_r)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 18-Column Element Cells */}
                      {filteredElements.map((el) => (
                        <div
                          key={el.atomicNumber}
                          style={{
                            gridRow: Number(el.period) + 1,
                            gridColumn: Number(el.group) + 1,
                          }}
                          title={`${el.name} (Z = ${el.atomicNumber})\nRelative Atomic Mass: ${el.atomicMass}\nPeriod ${el.period}, Group ${el.group}${el.electronegativity !== undefined ? `\nElectronegativity: ${el.electronegativity}` : ''}`}
                          className={`p-1 rounded-md border flex flex-col justify-between select-text cursor-pointer hover:scale-150 hover:z-30 hover:shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 origin-center ${getElementCategoryStyle(el.category)}`}
                        >
                          <div className="flex items-center justify-between text-[8px] font-mono leading-none">
                            <span className="font-bold opacity-80">{el.atomicNumber}</span>
                            {el.electronegativity !== undefined && (
                              <span className="font-bold text-amber-600 dark:text-amber-400 scale-90 origin-right">
                                {el.electronegativity}
                              </span>
                            )}
                          </div>

                          <div className="text-center my-0.5">
                            <span className="font-black font-mono text-xs md:text-sm text-cyan-600 dark:text-cyan-400 leading-none block">
                              {el.symbol}
                            </span>
                          </div>

                          <div className="text-center text-[10px] font-mono font-bold text-slate-900 dark:text-white/95 leading-none truncate">
                            {el.atomicMass}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category Legend Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">Legend:</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-200 dark:bg-amber-800 border border-amber-400" />
                      Alkali
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-orange-200 dark:bg-orange-800 border border-orange-400" />
                      Alkaline Earth
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 dark:bg-dark-700 border border-slate-300 dark:border-dark-600" />
                      Transition
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-sky-200 dark:bg-sky-800 border border-sky-400" />
                      Post-Transition
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-teal-200 dark:bg-teal-800 border border-teal-400" />
                      Metalloids
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-200 dark:bg-blue-800 border border-blue-400" />
                      Nonmetals
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200 dark:bg-emerald-800 border border-emerald-400" />
                      Halogens
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-purple-200 dark:bg-purple-800 border border-purple-400" />
                      Noble Gases
                    </span>
                  </div>
                </div>
              ) : (
                /* Compact Cards View (default on mobile or when searching or toggled) */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredElements.map((el) => (
                    <div
                      key={el.atomicNumber}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all text-xs ${getElementCategoryStyle(el.category)}`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-1">
                        <span className="font-mono font-bold">Z = {el.atomicNumber}</span>
                        <span className="font-mono text-[10px]">P{el.period} G{el.group}</span>
                      </div>

                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400">
                          {el.symbol}
                        </span>
                        <span className="font-bold truncate ml-1 text-xs">
                          {el.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-slate-200/60 dark:border-dark-750/70 font-mono">
                        <span title="Relative Atomic Mass">
                          A_r = {el.atomicMass}
                        </span>
                        {el.electronegativity !== undefined ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400" title="Pauling Electronegativity">
                            EN {el.electronegativity}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataBookletDrawer;
