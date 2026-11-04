import React, { useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  CHEMISTRY_CONSTANTS,
  CHEMISTRY_KEY_EQUATIONS,
  CHEMISTRY_INDICATORS,
  IR_SPECTROSCOPY_DATA,
  PROTON_NMR_SHIFTS,
  CARBON_NMR_SHIFTS,
  ELECTRODE_POTENTIALS,
} from '../../constants/referenceData';
import { MathFormula } from '../MathFormula';
import {
  handleSpotlightMove,
  handleSpotlightLeave,
  getSubjectSpotlightStyle,
} from '../../utils/spotlight';
import { PeriodicTableInteractive, PeriodicTableView } from './PeriodicTableInteractive';

export type ChemistryTab = 'periodic_table' | 'constants_indicators' | 'spectroscopy' | 'redox';

interface ChemistryReferenceProps {
  chemistryTab: ChemistryTab;
  searchQuery: string;
  periodicView: PeriodicTableView;
  onChangePeriodicView: (view: PeriodicTableView) => void;
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

export const ChemistryReference: React.FC<ChemistryReferenceProps> = ({
  chemistryTab,
  searchQuery,
  periodicView,
  onChangePeriodicView,
  copiedId,
  onCopy,
}) => {
  const query = searchQuery.trim().toLowerCase();

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

  const groupedChemEquations = useMemo(
    () => groupByTopic(filteredChemEquations),
    [filteredChemEquations]
  );

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

  if (chemistryTab === 'periodic_table') {
    return (
      <PeriodicTableInteractive
        searchQuery={searchQuery}
        periodicView={periodicView}
        onChangeView={onChangePeriodicView}
        copiedId={copiedId}
        onCopy={onCopy}
      />
    );
  }

  if (chemistryTab === 'constants_indicators') {
    return (
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
                    onPointerMove={handleSpotlightMove}
                    onPointerLeave={handleSpotlightLeave}
                    style={getSubjectSpotlightStyle('chemistry', 300)}
                    className="spotlight-surface p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 group hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="relative z-10 min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {c.name}
                      </div>
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
                        title="Copy"
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
                        onPointerMove={handleSpotlightMove}
                        onPointerLeave={handleSpotlightLeave}
                        style={getSubjectSpotlightStyle('chemistry', 300)}
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
                            title="Copy"
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

        {/* Acid-Base Indicators Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Indicators (Page 103 — at 298 K)
          </h4>
          <div className="space-y-1.5">
            {filteredIndicators.map((ind, i) => (
              <div
                key={i}
                onPointerMove={handleSpotlightMove}
                onPointerLeave={handleSpotlightLeave}
                style={getSubjectSpotlightStyle('chemistry', 260)}
                className="spotlight-surface p-2.5 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-750 space-y-1 text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{ind.name}</span>
                  <span className="font-mono text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                    pK_in = {ind.pKin}
                  </span>
                </div>
                <div className="relative z-10 flex items-center gap-2 text-[11px]">
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
    );
  }

  if (chemistryTab === 'spectroscopy') {
    return (
      <div className="space-y-4">
        {/* IR Spectroscopy Grouped Table */}
        <div className="rounded-xl border border-slate-200 dark:border-dark-750 overflow-hidden bg-white dark:bg-dark-850 shadow-xs">
          <div className="bg-slate-100/80 dark:bg-dark-800 px-3.5 py-2.5 border-b border-slate-200 dark:border-dark-750 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Infrared Spectroscopy (Page 101)
            </h4>
            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
              {filteredIr.length} ranges
            </span>
          </div>

          <div className="grid grid-cols-12 bg-slate-50 dark:bg-dark-900 border-b border-slate-200 dark:border-dark-750 text-[11px] font-bold text-slate-600 dark:text-slate-300 px-3.5 py-2">
            <div className="col-span-7">Group</div>
            <div className="col-span-5 text-right font-mono">Wavenumber range / cm⁻¹</div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-dark-800">
            {Object.entries(groupedIr).map(([groupTitle, items]) => (
              <div key={groupTitle}>
                <div className="bg-slate-100/70 dark:bg-dark-800/70 px-3.5 py-1.5 border-y border-slate-200/60 dark:border-dark-750/60 text-xs font-bold text-cyan-700 dark:text-cyan-400">
                  {groupTitle}
                </div>
                <div className="divide-y divide-slate-100/80 dark:divide-dark-800/80">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      onPointerMove={handleSpotlightMove}
                      onPointerLeave={handleSpotlightLeave}
                      className="spotlight-surface grid grid-cols-12 items-center px-3.5 py-2 text-xs hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors"
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
              const leftPct = Math.max(0, Math.min(100, ((12.1 - max) / 12.1) * 100));
              const widthPct = Math.max(2, Math.min(100 - leftPct, ((max - min) / 12.1) * 100));

              return (
                <div
                  key={idx}
                  onPointerMove={handleSpotlightMove}
                  onPointerLeave={handleSpotlightLeave}
                  className="spotlight-surface p-3 hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors space-y-1.5"
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
              const leftPct = Math.max(0, Math.min(100, ((225 - max) / 225) * 100));
              const widthPct = Math.max(2, Math.min(100 - leftPct, ((max - min) / 225) * 100));

              return (
                <div
                  key={idx}
                  onPointerMove={handleSpotlightMove}
                  onPointerLeave={handleSpotlightLeave}
                  className="spotlight-surface p-3 hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition-colors space-y-1.5"
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
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/60 dark:border-dark-800">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Standard Electrode Potentials at 298 K (Page 104)
        </span>
        <span className="font-mono text-[11px]">{filteredRedox.length} of 31 half-equations</span>
      </div>

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
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              className={`spotlight-surface px-3 py-2 flex items-center justify-between gap-3 text-xs group transition-colors ${
                isSHE
                  ? 'bg-cyan-50/70 dark:bg-cyan-950/25 ring-1 ring-inset ring-cyan-500/40'
                  : 'hover:bg-slate-50/80 dark:hover:bg-dark-850/60'
              }`}
            >
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
                    <MathFormula
                      latex={item.latex}
                      displayMode={false}
                      className="text-[12.5px] sm:text-[13px]"
                    />
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
                  onClick={() => onCopy(`${item.equation}  E° = ${item.potential} V`, id)}
                  className="p-1 rounded-md bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 opacity-60 group-hover:opacity-100 transition-all"
                  title="Copy half-equation and E°"
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
  );
};
