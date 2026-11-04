import React, { useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  PHYSICS_CONSTANTS,
  IAS_PHYSICS_EQUATIONS,
  IA2_PHYSICS_EQUATIONS,
} from '../../constants/referenceData';
import { MathFormula } from '../MathFormula';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../../utils/spotlight';

export type PhysicsTab = 'constants' | 'ias' | 'ia2';

interface PhysicsReferenceProps {
  physicsTab: PhysicsTab;
  searchQuery: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

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

export const PhysicsReference: React.FC<PhysicsReferenceProps> = ({
  physicsTab,
  searchQuery,
  copiedId,
  onCopy,
}) => {
  const query = searchQuery.trim().toLowerCase();

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

  const groupedIasEquations = useMemo(
    () => groupByTopic(filteredIasEquations),
    [filteredIasEquations]
  );
  const groupedIa2Equations = useMemo(
    () => groupByTopic(filteredIa2Equations),
    [filteredIa2Equations]
  );

  if (physicsTab === 'constants') {
    return (
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
                  onPointerMove={handleSpotlightMove}
                  onPointerLeave={handleSpotlightLeave}
                  style={getSubjectSpotlightStyle('physics', 300)}
                  className="spotlight-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 group hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="relative z-10 min-w-0 flex-1 space-y-0.5">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {c.name}
                    </div>
                    {c.notes && (
                      <div className="text-[10.5px] text-slate-400 dark:text-slate-500 italic">
                        ({c.notes})
                      </div>
                    )}
                  </div>
                  <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 max-w-full overflow-x-auto">
                    <div className="flex items-center justify-end gap-1.5 font-mono text-xs overflow-x-auto max-w-full">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-dark-750 text-cyan-700 dark:text-cyan-300">
                        <MathFormula latex={c.symbolLatex || c.symbol} className="text-xs" />
                      </span>
                      <span className="text-slate-400">=</span>
                      <span className="font-bold text-slate-900 dark:text-white">{c.value}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {c.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCopy(`${c.symbol} = ${c.value} ${c.unit}`, id)}
                      className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
                      title="Copy constant to clipboard"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const isIas = physicsTab === 'ias';
  const equationsList = isIas ? filteredIasEquations : filteredIa2Equations;
  const groupedEquations = isIas ? groupedIasEquations : groupedIa2Equations;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
        <span>{isIas ? 'Units 1 & 2 Formulae (Appendix 8)' : 'Units 4 & 5 Formulae (Appendix 8)'}</span>
        <span>{equationsList.length} equations</span>
      </div>
      <div className="space-y-3">
        {Object.entries(groupedEquations).map(([topic, eqs]) => (
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
                    onPointerMove={handleSpotlightMove}
                    onPointerLeave={handleSpotlightLeave}
                    style={getSubjectSpotlightStyle('physics', 300)}
                    className="spotlight-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 group hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="relative z-10 min-w-0 flex-1 space-y-0.5">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                        {eq.title}
                      </div>
                      {eq.description && (
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 italic">
                          {eq.description}
                        </div>
                      )}
                    </div>
                    <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 max-w-full">
                      <div className="text-right px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200/80 dark:border-dark-750 text-slate-900 dark:text-white flex items-center justify-center min-h-[36px] overflow-x-auto max-w-full">
                        <MathFormula latex={eq.latex || eq.formula} className="text-xs sm:text-sm" />
                      </div>
                      <button
                        type="button"
                        onClick={() => onCopy(eq.formula, eq.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
                        title="Copy formula"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
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
  );
};
