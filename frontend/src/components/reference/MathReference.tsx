import React, { useState, useMemo } from 'react';
import { Copy, Check, AlertTriangle, Calculator } from 'lucide-react';
import {
  MathFormulaItem,
  PURE_MATH_FORMULAE,
  MECHANICS_FORMULAE,
  STATISTICS_FORMULAE,
  NORMAL_TABLE_5COL,
  NORMAL_PERCENTAGE_POINTS,
  calculatePhi,
} from '../../constants/referenceData';
import { MathFormula } from '../MathFormula';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../../utils/spotlight';

export type MathTab = 'pure' | 'mechanics' | 'statistics';
export type MathFilter = 'all' | 'in_booklet' | 'must_memorise';

interface MathReferenceProps {
  mathTab: MathTab;
  mathFilter: MathFilter;
  onChangeMathFilter: (filter: MathFilter) => void;
  searchQuery: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

const stripLatex = (str: string) =>
  str
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}\^_$]/g, ' ')
    .toLowerCase();

export const MathReference: React.FC<MathReferenceProps> = ({
  mathTab,
  mathFilter,
  onChangeMathFilter,
  searchQuery,
  copiedId,
  onCopy,
}) => {
  const [zLookup, setZLookup] = useState<string>('');
  const [showPhiTable, setShowPhiTable] = useState<boolean>(true);
  const query = searchQuery.trim().toLowerCase();

  const matchFormulaItem = (item: MathFormulaItem) => {
    if (!query) return true;
    const cleanLatex = stripLatex(item.latex);
    return (
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.unit.toLowerCase().includes(query) ||
      cleanLatex.includes(query) ||
      item.latex.toLowerCase().includes(query) ||
      Boolean(
        item.description &&
          (item.description.toLowerCase().includes(query) ||
            stripLatex(item.description).includes(query))
      )
    );
  };

  const filteredPureMath = useMemo(() => {
    let items = PURE_MATH_FORMULAE;
    if (mathFilter === 'in_booklet') items = items.filter((item) => item.inBooklet);
    else if (mathFilter === 'must_memorise') items = items.filter((item) => !item.inBooklet);
    return items.filter(matchFormulaItem);
  }, [query, mathFilter]);

  const filteredMechanics = useMemo(() => {
    let items = MECHANICS_FORMULAE;
    if (mathFilter === 'in_booklet') items = items.filter((item) => item.inBooklet);
    else if (mathFilter === 'must_memorise') items = items.filter((item) => !item.inBooklet);
    return items.filter(matchFormulaItem);
  }, [query, mathFilter]);

  const filteredStatistics = useMemo(() => {
    let items = STATISTICS_FORMULAE;
    if (mathFilter === 'in_booklet') items = items.filter((item) => item.inBooklet);
    else if (mathFilter === 'must_memorise') items = items.filter((item) => !item.inBooklet);
    return items.filter(matchFormulaItem);
  }, [query, mathFilter]);

  const groupedPureMath = useMemo(() => {
    const groups: Record<string, typeof PURE_MATH_FORMULAE> = {};
    for (const item of filteredPureMath) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredPureMath]);

  const groupedMechanics = useMemo(() => {
    const groups: Record<string, typeof MECHANICS_FORMULAE> = {};
    for (const item of filteredMechanics) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredMechanics]);

  const groupedStatistics = useMemo(() => {
    const groups: Record<string, typeof STATISTICS_FORMULAE> = {};
    for (const item of filteredStatistics) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredStatistics]);

  const parsedZ = useMemo(() => {
    if (!zLookup.trim()) return null;
    const val = parseFloat(zLookup.trim());
    return isNaN(val) ? null : val;
  }, [zLookup]);

  const renderMathFormulaCard = (item: MathFormulaItem) => {
    const isCopied = copiedId === item.id;
    const isLongFormula = item.latex.length > 42;

    if (isLongFormula) {
      return (
        <div
          key={item.id}
          onPointerMove={handleSpotlightMove}
          onPointerLeave={handleSpotlightLeave}
          style={getSubjectSpotlightStyle('mathematics', 320)}
          className="spotlight-surface p-3 flex flex-col gap-2 group hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
        >
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0">
                {item.unit}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold tracking-wide shrink-0 ${
                  item.inBooklet
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {item.inBooklet ? 'IN BOOKLET' : 'MUST MEMORISE'}
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                {item.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onCopy(item.latex, item.id)}
              className="p-1.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
              title="Copy LaTeX formula"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="relative z-10 w-full overflow-x-auto px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#07090D] border border-slate-200/80 dark:border-white/[0.06] text-slate-900 dark:text-white flex items-center min-h-[38px]">
            <MathFormula latex={item.latex} className="text-xs sm:text-[13px] whitespace-nowrap" />
          </div>

          {item.description && (
            <div className="relative z-10 text-[10.5px] text-slate-500 dark:text-slate-400 italic">
              {item.description.includes('\\') ? (
                <MathFormula latex={item.description} className="text-[11px]" />
              ) : (
                item.description
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={item.id}
        onPointerMove={handleSpotlightMove}
        onPointerLeave={handleSpotlightLeave}
        style={getSubjectSpotlightStyle('mathematics', 320)}
        className="spotlight-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 group hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="relative z-10 sm:max-w-[44%] min-w-[140px] space-y-1 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0">
              {item.unit}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold tracking-wide shrink-0 ${
                item.inBooklet
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}
            >
              {item.inBooklet ? 'IN BOOKLET' : 'MUST MEMORISE'}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
            {item.title}
          </div>
          {item.description && (
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 italic">
              {item.description.includes('\\') ? (
                <MathFormula latex={item.description} className="text-[11px]" />
              ) : (
                item.description
              )}
            </div>
          )}
        </div>
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 flex-1 min-w-0 max-w-full">
          <div className="overflow-x-auto max-w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#07090D] border border-slate-200/80 dark:border-white/[0.06] text-slate-900 dark:text-white flex items-center min-h-[36px]">
            <MathFormula latex={item.latex} className="text-xs sm:text-sm whitespace-nowrap" />
          </div>
          <button
            type="button"
            onClick={() => onCopy(item.latex, item.id)}
            className="p-1.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 opacity-40 group-hover:opacity-100 transition-all shrink-0"
            title="Copy LaTeX formula"
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
  };

  if (mathTab === 'pure') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
          <span>Pure Mathematics (Units P1–P4)</span>
          <span>{filteredPureMath.length} formulae</span>
        </div>
        {filteredPureMath.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 dark:border-dark-750 p-6 space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No formulae found for this filter
            </p>
            <p className="text-[11px] text-slate-400">
              Try switching between &quot;All Formulae&quot;, &quot;In Yellow Booklet&quot;, or &quot;Must Memorise&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedPureMath).map(([category, items]) => (
              <div
                key={category}
                className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs"
              >
                <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {category}
                  </h4>
                  <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                    {items.length} {items.length === 1 ? 'formula' : 'formulae'}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-dark-800">
                  {items.map(renderMathFormulaCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mathTab === 'mechanics') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
          <span>Mechanics (Unit M1)</span>
          <span>{filteredMechanics.length} formulae</span>
        </div>

        {mathFilter === 'in_booklet' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                  Official Notice: No Formula Sheet for Mechanics 1 (M1)
                </h4>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  The official Pearson Edexcel Yellow Booklet (Issue 2) provides <strong>no formulae</strong> for Mechanics 1. All kinematic (SUVAT), dynamic (Newton&apos;s laws, friction), momentum, impulse, moments, and vector equations are expected to be known and must be memorised.
                </p>
              </div>
            </div>
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => onChangeMathFilter('must_memorise')}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                Show M1 Must-Memorise Formulae ({MECHANICS_FORMULAE.length})
              </button>
            </div>
          </div>
        )}

        {filteredMechanics.length > 0 && (
          <div className="space-y-3">
            {Object.entries(groupedMechanics).map(([category, items]) => (
              <div
                key={category}
                className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs"
              >
                <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {category}
                  </h4>
                  <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                    {items.length} {items.length === 1 ? 'formula' : 'formulae'}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-dark-800">
                  {items.map(renderMathFormulaCard)}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredMechanics.length === 0 && mathFilter !== 'in_booklet' && (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 dark:border-dark-750 p-6 space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No formulae found for this filter
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
        <span>Statistics (Unit S1)</span>
        <span>{filteredStatistics.length} formulae &amp; tables</span>
      </div>

      {filteredStatistics.length > 0 && (
        <div className="space-y-3">
          {Object.entries(groupedStatistics).map(([category, items]) => (
            <div
              key={category}
              className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs"
            >
              <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  {category}
                </h4>
                <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                  {items.length} {items.length === 1 ? 'formula' : 'formulae'}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-dark-800">
                {items.map(renderMathFormulaCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table 1: Standard Normal Cumulative Distribution Function Phi(z) */}
      {(mathFilter === 'all' || mathFilter === 'in_booklet') && (
        <div className="rounded-xl border border-cyan-500/30 dark:border-cyan-500/20 overflow-hidden bg-white dark:bg-dark-850 shadow-xs">
          <div className="bg-cyan-50/70 dark:bg-cyan-950/30 px-3.5 py-2.5 border-b border-cyan-100 dark:border-cyan-900/40 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-cyan-900 dark:text-cyan-200 uppercase tracking-wider">
                  Table 1: Standard Normal Distribution Φ(z)
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  IN BOOKLET
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cumulative probability <span className="font-mono font-semibold">Φ(z) = P(Z ≤ z)</span> for{' '}
                <span className="font-mono">Z ~ N(0, 1)</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPhiTable(!showPhiTable)}
              className="px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-bold transition-colors"
            >
              {showPhiTable ? 'Collapse Table' : 'Expand Table'}
            </button>
          </div>

          {/* Interactive z Search / Lookup Box */}
          <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Calculator className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Interactive z Lookup</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Instant CDF probability</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 font-bold">
                  z =
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter z value (e.g. 1.96, 0.5, 2.33, -1.5)"
                  value={zLookup}
                  onChange={(e) => setZLookup(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#07090D] border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs font-mono tabular-nums text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              {zLookup && (
                <button
                  type="button"
                  onClick={() => setZLookup('')}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {parsedZ !== null && !isNaN(parsedZ) && (
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#07090D] border border-cyan-200 dark:border-cyan-800/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Φ(z) = P(Z ≤ {parsedZ})
                  </span>
                  <span className="font-mono tabular-nums font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                    {calculatePhi(parsedZ).toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    P(Z &gt; {parsedZ}) = 1 − Φ(z)
                  </span>
                  <span className="font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {(1 - calculatePhi(parsedZ)).toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Central: P(−|z| ≤ Z ≤ |z|)
                  </span>
                  <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {(2 * calculatePhi(Math.abs(parsedZ)) - 1).toFixed(4)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5-Column-Pair Table (Page 16 Yellow Booklet) */}
          {showPhiTable && (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-center text-xs border-collapse tabular-nums font-mono">
                <thead className="bg-slate-100 dark:bg-[#07090D] text-[10.5px] text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 shadow-xs">
                  <tr className="border-b border-slate-200 dark:border-dark-750">
                    <th
                      colSpan={2}
                      className="py-1 px-1 border-r border-slate-200/80 dark:border-dark-750 text-cyan-700 dark:text-cyan-300"
                    >
                      0.00 – 0.49
                    </th>
                    <th
                      colSpan={2}
                      className="py-1 px-1 border-r border-slate-200/80 dark:border-dark-750 text-cyan-700 dark:text-cyan-300"
                    >
                      0.50 – 0.99
                    </th>
                    <th
                      colSpan={2}
                      className="py-1 px-1 border-r border-slate-200/80 dark:border-dark-750 text-cyan-700 dark:text-cyan-300"
                    >
                      1.00 – 1.49
                    </th>
                    <th
                      colSpan={2}
                      className="py-1 px-1 border-r border-slate-200/80 dark:border-dark-750 text-cyan-700 dark:text-cyan-300"
                    >
                      1.50 – 1.99
                    </th>
                    <th colSpan={2} className="py-1 px-1 text-cyan-700 dark:text-cyan-300">
                      2.00 – 4.00
                    </th>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-dark-750 font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-dark-850">
                    <th className="py-0.5 px-1 w-[8%]">z</th>
                    <th className="py-0.5 px-1 w-[12%] border-r border-slate-200/80 dark:border-dark-750">
                      Φ(z)
                    </th>
                    <th className="py-0.5 px-1 w-[8%]">z</th>
                    <th className="py-0.5 px-1 w-[12%] border-r border-slate-200/80 dark:border-dark-750">
                      Φ(z)
                    </th>
                    <th className="py-0.5 px-1 w-[8%]">z</th>
                    <th className="py-0.5 px-1 w-[12%] border-r border-slate-200/80 dark:border-dark-750">
                      Φ(z)
                    </th>
                    <th className="py-0.5 px-1 w-[8%]">z</th>
                    <th className="py-0.5 px-1 w-[12%] border-r border-slate-200/80 dark:border-dark-750">
                      Φ(z)
                    </th>
                    <th className="py-0.5 px-1 w-[8%]">z</th>
                    <th className="py-0.5 px-1 w-[12%]">Φ(z)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800 font-mono text-[11px]">
                  {NORMAL_TABLE_5COL.map((row, rowIdx) => {
                    const targetZStr =
                      parsedZ !== null ? (Math.round(parsedZ * 100) / 100).toFixed(2) : null;
                    const isM1 = targetZStr !== null && row.c1.z === targetZStr;
                    const isM2 = targetZStr !== null && row.c2.z === targetZStr;
                    const isM3 = targetZStr !== null && row.c3.z === targetZStr;
                    const isM4 = targetZStr !== null && row.c4.z === targetZStr;
                    const isM5 = targetZStr !== null && row.c5.z === targetZStr;

                    return (
                      <tr
                        key={rowIdx}
                        className="hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
                      >
                        <td
                          className={`py-0.5 px-1 text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-dark-900/30 font-medium ${
                            isM1 ? 'bg-cyan-500 text-white font-extrabold' : ''
                          }`}
                        >
                          {row.c1.z}
                        </td>
                        <td
                          className={`py-0.5 px-1 border-r border-slate-200/80 dark:border-dark-750 font-semibold text-slate-800 dark:text-slate-200 ${
                            isM1
                              ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-extrabold'
                              : ''
                          }`}
                        >
                          {row.c1.phi}
                        </td>

                        <td
                          className={`py-0.5 px-1 text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-dark-900/30 font-medium ${
                            isM2 ? 'bg-cyan-500 text-white font-extrabold' : ''
                          }`}
                        >
                          {row.c2.z}
                        </td>
                        <td
                          className={`py-0.5 px-1 border-r border-slate-200/80 dark:border-dark-750 font-semibold text-slate-800 dark:text-slate-200 ${
                            isM2
                              ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-extrabold'
                              : ''
                          }`}
                        >
                          {row.c2.phi}
                        </td>

                        <td
                          className={`py-0.5 px-1 text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-dark-900/30 font-medium ${
                            isM3 ? 'bg-cyan-500 text-white font-extrabold' : ''
                          }`}
                        >
                          {row.c3.z}
                        </td>
                        <td
                          className={`py-0.5 px-1 border-r border-slate-200/80 dark:border-dark-750 font-semibold text-slate-800 dark:text-slate-200 ${
                            isM3
                              ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-extrabold'
                              : ''
                          }`}
                        >
                          {row.c3.phi}
                        </td>

                        <td
                          className={`py-0.5 px-1 text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-dark-900/30 font-medium ${
                            isM4 ? 'bg-cyan-500 text-white font-extrabold' : ''
                          }`}
                        >
                          {row.c4.z}
                        </td>
                        <td
                          className={`py-0.5 px-1 border-r border-slate-200/80 dark:border-dark-750 font-semibold text-slate-800 dark:text-slate-200 ${
                            isM4
                              ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-extrabold'
                              : ''
                          }`}
                        >
                          {row.c4.phi}
                        </td>

                        <td
                          className={`py-0.5 px-1 text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-dark-900/30 font-medium ${
                            isM5 ? 'bg-cyan-500 text-white font-extrabold' : ''
                          }`}
                        >
                          {row.c5.z}
                        </td>
                        <td
                          className={`py-0.5 px-1 font-semibold text-slate-800 dark:text-slate-200 ${
                            isM5
                              ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-extrabold'
                              : ''
                          }`}
                        >
                          {row.c5.phi}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Table 2: Percentage Points of the Normal Distribution */}
      {(mathFilter === 'all' || mathFilter === 'in_booklet') && (
        <div className="rounded-xl border border-cyan-500/30 dark:border-cyan-500/20 overflow-hidden bg-white dark:bg-dark-850 shadow-xs">
          <div className="bg-cyan-50/70 dark:bg-cyan-950/30 px-3.5 py-2.5 border-b border-cyan-100 dark:border-cyan-900/40 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-cyan-900 dark:text-cyan-200 uppercase tracking-wider">
                  Table 2: Normal Distribution Percentage Points
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  IN BOOKLET
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Critical values of <span className="font-mono font-semibold">z</span> such that{' '}
                <span className="font-mono">P(Z &gt; z) = p</span>
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              Standard N(0, 1)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-dark-800 text-[10.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-dark-750">
                <tr>
                  <th className="px-3 py-2">p = P(Z &gt; z)</th>
                  <th className="px-3 py-2 border-r border-slate-200/80 dark:border-dark-750">
                    z (Critical)
                  </th>
                  <th className="px-3 py-2">p = P(Z &gt; z)</th>
                  <th className="px-3 py-2">z (Critical)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800 font-mono text-[11px]">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const p1 = NORMAL_PERCENTAGE_POINTS[idx];
                  const p2 = NORMAL_PERCENTAGE_POINTS[idx + 6];
                  const id1 = `norm-pt-${idx}`;
                  const id2 = `norm-pt-${idx + 6}`;
                  const isCopied1 = copiedId === id1;
                  const isCopied2 = copiedId === id2;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
                    >
                      <td className="px-3 py-1.5 font-bold text-slate-700 dark:text-slate-300">
                        {p1.p}
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200/80 dark:border-dark-750">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-extrabold text-cyan-700 dark:text-cyan-300">
                            {p1.z}
                          </span>
                          <button
                            type="button"
                            onClick={() => onCopy(`z = ${p1.z} (p = ${p1.p})`, id1)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-dark-750 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                            title="Copy value"
                          >
                            {isCopied1 ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 font-bold text-slate-700 dark:text-slate-300">
                        {p2.p}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-extrabold text-cyan-700 dark:text-cyan-300">
                            {p2.z}
                          </span>
                          <button
                            type="button"
                            onClick={() => onCopy(`z = ${p2.z} (p = ${p2.p})`, id2)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-dark-750 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                            title="Copy value"
                          >
                            {isCopied2 ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
