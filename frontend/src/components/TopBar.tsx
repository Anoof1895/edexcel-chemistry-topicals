import React, { useMemo, useState } from 'react';
import { 
  Columns, 
  Eye, 
  CheckCircle2, 
  Search, 
  Layers,
  RotateCcw,
  Calendar,
  CalendarRange,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { FilterState, ViewMode, QuestionItem } from '../types';
import { SubtopicMultiSelect } from './SubtopicMultiSelect';
import { FilterMultiSelect, FilterOption } from './FilterMultiSelect';
import { SubtopicGroup } from '../constants/taxonomy';

export type { SubtopicGroup };

interface TopBarProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  availableUnits: string[];
  subtopicHierarchy: SubtopicGroup[];
  availableYears: number[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalFiltered: number;
  totalMarks: number;
  onResetFilters: () => void;
  allQuestions?: QuestionItem[];
}

export const TopBar: React.FC<TopBarProps> = ({
  filters,
  onFilterChange,
  availableUnits,
  subtopicHierarchy,
  availableYears,
  viewMode,
  onViewModeChange,
  totalFiltered,
  totalMarks,
  onResetFilters,
  allQuestions
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Precompute options with question counts
  const unitOptions: FilterOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    if (allQuestions) {
      allQuestions.forEach((q) => {
        if (q.unit) counts.set(q.unit, (counts.get(q.unit) || 0) + 1);
      });
    }
    return availableUnits.map((u) => ({
      value: u,
      label: u,
      count: counts.get(u),
    }));
  }, [availableUnits, allQuestions]);

  const yearOptions: FilterOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    if (allQuestions) {
      allQuestions.forEach((q) => {
        if (q.year) {
          const yStr = String(q.year);
          counts.set(yStr, (counts.get(yStr) || 0) + 1);
        }
      });
    }
    return availableYears.map((yr) => ({
      value: String(yr),
      label: String(yr),
      count: counts.get(String(yr)),
    }));
  }, [availableYears, allQuestions]);

  const seriesOptions: FilterOption[] = useMemo(() => {
    const seriesList = ['January', 'May/June', 'October'];
    const counts = new Map<string, number>();
    if (allQuestions) {
      allQuestions.forEach((q) => {
        const qSession = (q.session || '').toLowerCase();
        const qSeries = (q.series || '').toLowerCase();
        for (const s of seriesList) {
          const target = s.toLowerCase();
          let match = false;
          if (target === 'january') {
            match = qSession.includes('jan') || qSeries.includes('jan');
          } else if (target === 'may/june') {
            match =
              qSession.includes('june') ||
              qSession.includes('may') ||
              qSeries.includes('june') ||
              qSeries.includes('may');
          } else if (target === 'october') {
            match =
              qSession.includes('oct') ||
              qSession.includes('nov') ||
              qSeries.includes('oct') ||
              qSeries.includes('nov');
          }
          if (match) {
            counts.set(s, (counts.get(s) || 0) + 1);
          }
        }
      });
    }
    return seriesList.map((s) => ({
      value: s,
      label: s,
      count: counts.get(s),
    }));
  }, [allQuestions]);

  // Active filter badge count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedUnits.length > 0) count++;
    if (filters.selectedSubtopics.length > 0) count++;
    if (filters.selectedYears.length > 0) count++;
    if (filters.selectedSeries.length > 0) count++;
    if (filters.statusFilter !== 'all') count++;
    if (filters.questionType !== 'all') count++;
    if (filters.bookmarkedOnly) count++;
    if (filters.searchQuery.trim().length > 0) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <>
      <header className="h-13 border-b border-dark-800 bg-dark-900/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 select-none shrink-0 z-20">
        {/* Context Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-xs tracking-tight text-white flex items-center gap-1.5">
            <span className="hidden sm:inline">Topical</span> Explorer
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              U1–6
            </span>
          </span>
        </div>

        {/* ===================================================================== */}
        {/* MOBILE & TABLET COMPACT BAR (< 1024px)                                */}
        {/* ===================================================================== */}
        <div className="flex lg:hidden items-center gap-2 flex-1 justify-end">
          {/* Compact Search Input */}
          <div className="relative w-32 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Q# or topic..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="w-full bg-dark-800/80 border border-dark-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Filters Drawer Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className={`min-h-[34px] px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 ${
              hasActiveFilters
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950/40'
                : 'bg-dark-800 text-slate-300 border-dark-700 hover:bg-dark-750'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-cyan-500 text-dark-950 font-bold font-mono text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Quick Reset if Active Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset All Filters"
              className="p-2 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-750 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Desktop/Tablet View Mode Switcher (visible on tablet >= 768px) */}
          <div className="hidden sm:flex md:flex items-center bg-dark-800/90 p-0.5 rounded-lg border border-dark-750">
            <button
              onClick={() => onViewModeChange('question-only')}
              title="Question Only"
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'question-only' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('split')}
              title="Side-by-Side Split"
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'split' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('ms-only')}
              title="Mark Scheme"
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'ms-only' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* DESKTOP FULL INLINE FILTER TOOLBAR (>= 1024px)                        */}
        {/* ===================================================================== */}
        <div className="hidden lg:flex items-center gap-2.5 flex-1 max-w-4xl justify-center">
          {/* Search */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search topic or Q#..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="w-full bg-dark-800/80 border border-dark-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          {/* Unit Multi-Select */}
          <FilterMultiSelect
            labelSingular="Unit"
            labelPlural="Units"
            icon={<Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            options={unitOptions}
            selectedValues={filters.selectedUnits}
            onChange={(units) => onFilterChange({ selectedUnits: units })}
          />

          {/* Searchable Multi-Select Subtopics with Collapsible Main Topics */}
          <SubtopicMultiSelect
            hierarchy={subtopicHierarchy}
            selectedSubtopics={filters.selectedSubtopics}
            onChange={(subs) => onFilterChange({ selectedSubtopics: subs })}
          />

          {/* Year Multi-Select */}
          <FilterMultiSelect
            labelSingular="Year"
            labelPlural="Years"
            icon={<Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            options={yearOptions}
            selectedValues={filters.selectedYears}
            onChange={(years) => onFilterChange({ selectedYears: years })}
            badgeFontMono
          />

          {/* Series / Season Multi-Select */}
          <FilterMultiSelect
            labelSingular="Series"
            labelPlural="Series"
            icon={<CalendarRange className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            options={seriesOptions}
            selectedValues={filters.selectedSeries}
            onChange={(series) => onFilterChange({ selectedSeries: series })}
            showSearch={false}
          />

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-dark-800/80 border border-dark-700/80 rounded-lg px-2.5 py-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${
              filters.statusFilter === 'mastered' ? 'text-emerald-400' :
              filters.statusFilter === 'review' ? 'text-amber-400' :
              filters.statusFilter === 'unattempted' ? 'text-slate-400' : 'text-cyan-400'
            }`} />
            <select
              value={filters.statusFilter}
              onChange={(e) => onFilterChange({ statusFilter: e.target.value as any })}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1 font-medium"
            >
              <option value="all" className="bg-dark-900 text-slate-200">All Status</option>
              <option value="unattempted" className="bg-dark-900 text-slate-400">⚪ Unattempted</option>
              <option value="review" className="bg-dark-900 text-amber-300">🟡 Review Needed</option>
              <option value="mastered" className="bg-dark-900 text-emerald-300">🟢 Mastered</option>
            </select>
          </div>

          {/* Question Type: MCQ vs Theory Segmented Switch */}
          <div className="flex items-center bg-dark-800/80 border border-dark-700/80 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => onFilterChange({ questionType: 'all' })}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                filters.questionType === 'all'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ questionType: 'mcq' })}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                filters.questionType === 'mcq'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MCQ
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ questionType: 'theory' })}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                filters.questionType === 'theory'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Theory
            </button>
          </div>

          {/* Stats Pill */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-dark-800 border border-dark-750 text-[11px] text-slate-300">
            <span className="font-semibold text-cyan-400">{totalFiltered}</span> questions
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span className="font-semibold text-emerald-400">{totalMarks}</span> marks
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              title="Reset All Filters"
              className="p-1.5 rounded-lg bg-dark-800/80 border border-dark-700/80 hover:bg-dark-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop View Mode Switcher (>= 1024px) */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-dark-800/90 p-1 rounded-lg border border-dark-750">
            <button
              onClick={() => onViewModeChange('question-only')}
              title="Question Only (Focus Mode - Hides Answers)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'question-only'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Question</span>
            </button>

            <button
              onClick={() => onViewModeChange('split')}
              title="Side-by-Side Split View"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>

            <button
              onClick={() => onViewModeChange('ms-only')}
              title="Mark Scheme Only"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'ms-only'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answers</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* SLIDE-OVER FILTER DRAWER FOR TABLET & MOBILE (< 1024px)               */}
      {/* ===================================================================== */}
      {isMobileDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden flex justify-end animate-in fade-in duration-150"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div 
            className="w-full sm:w-[26rem] h-full bg-dark-900 border-l border-dark-750 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 border-b border-dark-800 bg-dark-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-white">Filter Questions</span>
                {hasActiveFilters && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded"
                  >
                    Reset All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body: Clean Scrollable Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Search Query */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Search Keywords
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search topic, question number, or keyword..."
                    value={filters.searchQuery}
                    onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-750 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Units Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Specification Unit
                </label>
                <FilterMultiSelect
                  labelSingular="Unit"
                  labelPlural="Units"
                  icon={<Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  options={unitOptions}
                  selectedValues={filters.selectedUnits}
                  onChange={(units) => onFilterChange({ selectedUnits: units })}
                />
              </div>

              {/* Subtopics Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Topic & Subtopics
                </label>
                <SubtopicMultiSelect
                  hierarchy={subtopicHierarchy}
                  selectedSubtopics={filters.selectedSubtopics}
                  onChange={(subs) => onFilterChange({ selectedSubtopics: subs })}
                />
              </div>

              {/* Year & Series Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Exam Year
                  </label>
                  <FilterMultiSelect
                    labelSingular="Year"
                    labelPlural="Years"
                    icon={<Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    options={yearOptions}
                    selectedValues={filters.selectedYears}
                    onChange={(years) => onFilterChange({ selectedYears: years })}
                    badgeFontMono
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Series / Season
                  </label>
                  <FilterMultiSelect
                    labelSingular="Series"
                    labelPlural="Series"
                    icon={<CalendarRange className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    options={seriesOptions}
                    selectedValues={filters.selectedSeries}
                    onChange={(series) => onFilterChange({ selectedSeries: series })}
                    showSearch={false}
                  />
                </div>
              </div>

              {/* Question Type Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Question Format
                </label>
                <div className="grid grid-cols-3 gap-1 bg-dark-800 p-1 rounded-xl border border-dark-750 text-xs">
                  {(['all', 'mcq', 'theory'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onFilterChange({ questionType: t })}
                      className={`py-2 rounded-lg font-bold capitalize transition-all ${
                        filters.questionType === t
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t === 'all' ? 'All' : t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Revision Mastery Status
                </label>
                <div className="flex items-center gap-2 bg-dark-800 border border-dark-750 rounded-xl px-3 py-2">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${
                    filters.statusFilter === 'mastered' ? 'text-emerald-400' :
                    filters.statusFilter === 'review' ? 'text-amber-400' :
                    filters.statusFilter === 'unattempted' ? 'text-slate-400' : 'text-cyan-400'
                  }`} />
                  <select
                    value={filters.statusFilter}
                    onChange={(e) => onFilterChange({ statusFilter: e.target.value as any })}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer w-full font-medium"
                  >
                    <option value="all" className="bg-dark-900 text-slate-200">All Questions</option>
                    <option value="unattempted" className="bg-dark-900 text-slate-400">⚪ Unattempted</option>
                    <option value="review" className="bg-dark-900 text-amber-300">🟡 Review Needed</option>
                    <option value="mastered" className="bg-dark-900 text-emerald-300">🟢 Mastered</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Metrics */}
              <div className="p-3 rounded-xl bg-dark-800/80 border border-dark-750 flex items-center justify-between text-xs">
                <span className="text-slate-400">Matching Pool:</span>
                <span className="font-semibold text-slate-200">
                  <span className="text-cyan-400 font-bold">{totalFiltered}</span> questions •{' '}
                  <span className="text-emerald-400 font-bold">{totalMarks}</span> marks
                </span>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-dark-800 bg-dark-900/90 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Show {totalFiltered} Questions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
