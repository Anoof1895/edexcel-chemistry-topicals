import React, { useState, useMemo } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { PERIODIC_ELEMENTS, PeriodicElement } from '../../constants/referenceData';
import { handleSpotlightMove, handleSpotlightLeave } from '../../utils/spotlight';

export type PeriodicTableView = 'grid' | 'cards';

interface PeriodicTableInteractiveProps {
  searchQuery: string;
  periodicView: PeriodicTableView;
  onChangeView: (view: PeriodicTableView) => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

export function getElementCategoryStyle(category?: string) {
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

export const PeriodicTableInteractive: React.FC<PeriodicTableInteractiveProps> = ({
  searchQuery,
  periodicView,
  onChangeView,
  copiedId,
  onCopy,
}) => {
  const [selectedElement, setSelectedElement] = useState<PeriodicElement | null>(null);
  const query = searchQuery.trim().toLowerCase();

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

  return (
    <div className="space-y-3">
      {/* Header with Title and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-dark-750/70">
        <div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {query ? `Search results for "${searchQuery}"` : 'Periodic Table of the Elements'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Pearson Edexcel IAL Specification (Appendix 9) • {filteredElements.length} elements • Click any element to inspect
          </div>
        </div>

        {/* View Toggle (18-Col Grid vs Compact Cards) */}
        <div className="flex items-center bg-slate-200/80 dark:bg-dark-800 p-0.5 rounded-lg text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => onChangeView('grid')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              !query && periodicView === 'grid'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            18-Col Grid
          </button>
          <button
            type="button"
            onClick={() => onChangeView('cards')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              query || periodicView === 'cards'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Compact Cards {query && `(${filteredElements.length})`}
          </button>
        </div>
      </div>

      {/* Interactive Element Inspector Banner */}
      {selectedElement && (
        <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-950/30 flex items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex flex-col items-center justify-center font-mono shadow-md shrink-0">
              <span className="text-[10px] font-bold leading-none">{selectedElement.atomicNumber}</span>
              <span className="text-lg font-extrabold leading-none">{selectedElement.symbol}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>{selectedElement.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30">
                  Period {selectedElement.period}, Group {selectedElement.group}
                </span>
                {selectedElement.category && (
                  <span className="text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300">
                    {selectedElement.category.replace('-', ' ')}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5 flex items-center gap-3 flex-wrap">
                <span>
                  Relative Atomic Mass (<span className="italic">A</span>
                  <sub>r</sub>): <span className="font-bold text-slate-900 dark:text-white">{selectedElement.atomicMass}</span>
                </span>
                {selectedElement.electronegativity !== undefined && (
                  <span>
                    Pauling EN:{' '}
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {selectedElement.electronegativity}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                onCopy(
                  `${selectedElement.name} (${selectedElement.symbol}): Z = ${selectedElement.atomicNumber}, Ar = ${selectedElement.atomicMass}${
                    selectedElement.electronegativity !== undefined
                      ? `, EN = ${selectedElement.electronegativity}`
                      : ''
                  }`,
                  `el-${selectedElement.atomicNumber}`
                )
              }
              className="p-1.5 rounded-lg bg-white/80 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
              title="Copy element data"
            >
              {copiedId === `el-${selectedElement.atomicNumber}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedElement(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Dismiss inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
              {filteredElements.map((el) => {
                const isSelected = selectedElement?.atomicNumber === el.atomicNumber;
                return (
                  <button
                    key={el.atomicNumber}
                    type="button"
                    onClick={() => setSelectedElement(el)}
                    style={{
                      gridRow: Number(el.period) + 1,
                      gridColumn: Number(el.group) + 1,
                    }}
                    title={`${el.name} (Z = ${el.atomicNumber})\nRelative Atomic Mass: ${el.atomicMass}\nPeriod ${el.period}, Group ${el.group}${
                      el.electronegativity !== undefined ? `\nElectronegativity: ${el.electronegativity}` : ''
                    }`}
                    className={`p-1 rounded-md border flex flex-col justify-between text-left select-text cursor-pointer hover:scale-150 hover:z-30 hover:shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 origin-center ${getElementCategoryStyle(
                      el.category
                    )} ${isSelected ? 'ring-2 ring-cyan-500 shadow-md z-20' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full text-[8px] font-mono leading-none">
                      <span className="font-bold opacity-80">{el.atomicNumber}</span>
                      {el.electronegativity !== undefined && (
                        <span className="font-bold text-amber-600 dark:text-amber-400 scale-90 origin-right">
                          {el.electronegativity}
                        </span>
                      )}
                    </div>

                    <div className="text-center w-full my-0.5">
                      <span className="font-black font-mono text-xs md:text-sm text-cyan-600 dark:text-cyan-400 leading-none block">
                        {el.symbol}
                      </span>
                    </div>

                    <div className="text-center w-full text-[10px] font-mono font-bold text-slate-900 dark:text-white/95 leading-none truncate">
                      {el.atomicMass}
                    </div>
                  </button>
                );
              })}
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
          {filteredElements.map((el) => {
            const isSelected = selectedElement?.atomicNumber === el.atomicNumber;
            return (
              <button
                key={el.atomicNumber}
                type="button"
                onClick={() => setSelectedElement(el)}
                onPointerMove={handleSpotlightMove}
                onPointerLeave={handleSpotlightLeave}
                className={`spotlight-surface p-2.5 rounded-xl border flex flex-col justify-between text-left transition-all text-xs ${getElementCategoryStyle(
                  el.category
                )} ${isSelected ? 'ring-2 ring-cyan-500 shadow-md' : ''}`}
              >
                <div className="flex items-center justify-between w-full text-[11px] text-slate-400 dark:text-slate-500 mb-1">
                  <span className="font-mono font-bold">Z = {el.atomicNumber}</span>
                  <span className="font-mono text-[10px]">
                    P{el.period} G{el.group}
                  </span>
                </div>

                <div className="flex items-baseline justify-between w-full mb-1">
                  <span className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400">
                    {el.symbol}
                  </span>
                  <span className="font-bold truncate ml-1 text-xs">{el.name}</span>
                </div>

                <div className="flex items-center justify-between w-full text-[10.5px] pt-1 border-t border-slate-200/60 dark:border-dark-750/70 font-mono">
                  <span title="Relative Atomic Mass">A_r = {el.atomicMass}</span>
                  {el.electronegativity !== undefined ? (
                    <span
                      className="font-bold text-amber-600 dark:text-amber-400"
                      title="Pauling Electronegativity"
                    >
                      EN {el.electronegativity}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
