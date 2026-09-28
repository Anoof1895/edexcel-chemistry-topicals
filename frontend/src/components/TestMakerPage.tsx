import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Plus, 
  Check, 
  Layers, 
  Search, 
  Calendar, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Printer,
  AlertCircle,
  X,
  Eye
} from 'lucide-react';
import { QuestionItem, FilterState } from '../types';
import { FilterMultiSelect, FilterOption } from './FilterMultiSelect';
import { SubtopicMultiSelect } from './SubtopicMultiSelect';
import { SubtopicGroup, buildStaticSubtopicHierarchy } from '../constants/taxonomy';
import { getQuestionType } from '../utils/questionClassification';
import { ImageCanvas } from './ImageCanvas';
import { generateQuestionPaperPDF, generateMarkSchemePDF } from '../utils/pdfGenerator';

interface TestMakerPageProps {
  questions: QuestionItem[];
  cartQuestionIds: string[];
  onAddToCart: (id: string) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  onReorderCart: (newIds: string[]) => void;
  testTitle: string;
  onSetTestTitle: (title: string) => void;
}

const PAGE_SIZE = 15;

export const TestMakerPage: React.FC<TestMakerPageProps> = ({
  questions,
  cartQuestionIds,
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  onReorderCart,
  testTitle,
  onSetTestTitle,
}) => {
  // Center preview state: question currently being inspected
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'question' | 'ms' | 'split'>('split');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isExportingQP, setIsExportingQP] = useState<boolean>(false);
  const [isExportingMS, setIsExportingMS] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [includeFormalHeader, setIncludeFormalHeader] = useState<boolean>(false);
  const [includeSourceTags, setIncludeSourceTags] = useState<boolean>(true);
  const [includeHeaderFooter, setIncludeHeaderFooter] = useState<boolean>(true);

  // Responsive state
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'pool' | 'preview'>('pool');

  // Local filter state for searching available questions
  const [filters, setFilters] = useState<FilterState>({
    selectedUnits: [],
    selectedSubtopics: [],
    selectedYears: [],
    selectedSeries: [],
    searchQuery: '',
    statusFilter: 'all',
    questionType: 'all',
    bookmarkedOnly: false,
  });

  // Marks filter: 'all' | '1' | '2-3' | '4+'
  const [marksFilter, setMarksFilter] = useState<'all' | '1' | '2-3' | '4+'>('all');

  // Available filter options
  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    questions.forEach((q) => { if (q.unit) units.add(q.unit); });
    return Array.from(units).sort();
  }, [questions]);

  const unitOptions: FilterOption[] = useMemo(() => {
    return availableUnits.map((u) => ({ value: u, label: u }));
  }, [availableUnits]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    questions.forEach((q) => { if (q.year) years.add(q.year); });
    return Array.from(years).sort((a, b) => b - a);
  }, [questions]);

  const yearOptions: FilterOption[] = useMemo(() => {
    return availableYears.map((yr) => ({ value: String(yr), label: String(yr) }));
  }, [availableYears]);

  const subtopicHierarchy: SubtopicGroup[] = useMemo(() => {
    return buildStaticSubtopicHierarchy(filters.selectedUnits, questions);
  }, [questions, filters.selectedUnits]);

  const seriesOptions: FilterOption[] = useMemo(() => {
    return ['January', 'May/June', 'October'].map((s) => ({ value: s, label: s }));
  }, []);

  // Filtered pool of questions
  const filteredPool = useMemo(() => {
    return questions.filter((q) => {
      if (filters.selectedUnits.length > 0 && !filters.selectedUnits.includes(q.unit)) return false;

      if (filters.selectedSubtopics.length > 0) {
        const qSubs = q.subtopics && q.subtopics.length > 0 ? q.subtopics : [q.subtopic];
        const hasMatch = qSubs.some((s) => s && filters.selectedSubtopics.includes(s));
        if (!hasMatch) return false;
      }

      if (filters.selectedYears.length > 0 && !filters.selectedYears.includes(String(q.year))) return false;

      if (filters.selectedSeries.length > 0) {
        const qSession = (q.session || '').toLowerCase();
        const qSeries = (q.series || '').toLowerCase();
        const matchesSeries = filters.selectedSeries.some((s) => {
          const target = s.toLowerCase();
          if (target === 'january') return qSession.includes('jan') || qSeries.includes('jan');
          if (target === 'may/june') return qSession.includes('june') || qSession.includes('may') || qSeries.includes('june') || qSeries.includes('may');
          if (target === 'october') return qSession.includes('oct') || qSession.includes('nov') || qSeries.includes('oct') || qSeries.includes('nov');
          return qSeries.includes(target) || qSession.includes(target);
        });
        if (!matchesSeries) return false;
      }

      if (filters.questionType !== 'all') {
        const qType = getQuestionType(q);
        if (qType !== filters.questionType) return false;
      }

      if (marksFilter !== 'all') {
        const m = q.marks || 0;
        if (marksFilter === '1' && m !== 1) return false;
        if (marksFilter === '2-3' && (m < 2 || m > 3)) return false;
        if (marksFilter === '4+' && m < 4) return false;
      }

      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchQNum = q.questionNumber.toLowerCase().includes(query);
        const matchTopic = (q.topic || '').toLowerCase().includes(query);
        const matchSubtopic = (q.subtopic || '').toLowerCase().includes(query);
        const matchPaper = (q.paperCode || q.unitCode || '').toLowerCase().includes(query);
        if (!matchQNum && !matchTopic && !matchSubtopic && !matchPaper) return false;
      }

      return true;
    });
  }, [questions, filters, marksFilter]);

  // Set default preview question if none active
  useEffect(() => {
    if (!previewQuestionId && filteredPool.length > 0) {
      setPreviewQuestionId(filteredPool[0].id);
    }
  }, [filteredPool, previewQuestionId]);

  const activePreviewQuestion = useMemo(() => {
    if (!previewQuestionId) return filteredPool[0] || null;
    return questions.find((q) => q.id === previewQuestionId) || filteredPool[0] || null;
  }, [questions, previewQuestionId, filteredPool]);

  // Pagination for search pool
  const totalPages = Math.max(1, Math.ceil(filteredPool.length / PAGE_SIZE));
  const pagedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPool.slice(start, start + PAGE_SIZE);
  }, [filteredPool, currentPage]);

  // Full Question objects for items currently in cart
  const cartQuestions: QuestionItem[] = useMemo(() => {
    const questionMap = new Map<string, QuestionItem>();
    questions.forEach((q) => questionMap.set(q.id, q));
    return cartQuestionIds
      .map((id) => questionMap.get(id))
      .filter((q): q is QuestionItem => q !== undefined);
  }, [cartQuestionIds, questions]);

  // Metrics
  const totalCartMarks = useMemo(() => {
    return cartQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }, [cartQuestions]);

  const targetTimeMinutes = useMemo(() => {
    return Math.round(totalCartMarks * 1.2);
  }, [totalCartMarks]);

  // Reordering helpers
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newIds = [...cartQuestionIds];
    const temp = newIds[index - 1];
    newIds[index - 1] = newIds[index];
    newIds[index] = temp;
    onReorderCart(newIds);
  };

  const handleMoveDown = (index: number) => {
    if (index >= cartQuestionIds.length - 1) return;
    const newIds = [...cartQuestionIds];
    const temp = newIds[index + 1];
    newIds[index + 1] = newIds[index];
    newIds[index] = temp;
    onReorderCart(newIds);
  };

  // PDF Export Handlers
  const handleExportQP = async () => {
    if (cartQuestions.length === 0) return;
    setIsExportingQP(true);
    setExportStatus('Generating Question Paper PDF...');
    try {
      await generateQuestionPaperPDF({
        title: testTitle || 'Custom Chemistry Mock Exam',
        questions: cartQuestions,
        includeFormalHeader,
        includeSourceTags,
        includeHeaderFooter,
        onProgress: (_cur, _tot, text) => setExportStatus(text),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate Question Paper PDF. Check console for details.');
    } finally {
      setIsExportingQP(false);
      setExportStatus('');
    }
  };

  const handleExportMS = async () => {
    if (cartQuestions.length === 0) return;
    setIsExportingMS(true);
    setExportStatus('Generating Mark Scheme PDF...');
    try {
      await generateMarkSchemePDF({
        title: testTitle || 'Custom Chemistry Mock Exam',
        questions: cartQuestions,
        includeFormalHeader,
        includeSourceTags,
        includeHeaderFooter,
        onProgress: (_cur, _tot, text) => setExportStatus(text),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate Mark Scheme PDF. Check console for details.');
    } finally {
      setIsExportingMS(false);
      setExportStatus('');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-dark-950 text-slate-100 select-none relative">
      {/* ===================================================================== */}
      {/* MOBILE TOP TAB BAR: [ Question Pool ] | [ Preview ] (< 768px)         */}
      {/* ===================================================================== */}
      <div className="flex md:hidden items-center justify-center p-2 bg-dark-900 border-b border-dark-800 shrink-0">
        <div className="grid grid-cols-2 w-full max-w-md bg-dark-850 p-1 rounded-xl border border-dark-750">
          <button
            type="button"
            onClick={() => setMobileTab('pool')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'pool'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Pool ({filteredPool.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'preview'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview {activePreviewQuestion ? `(Q${activePreviewQuestion.questionNumber})` : ''}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEFT COLUMN: Search & Filter Drawer + Question Pool                      */}
      {/* ========================================================================= */}
      <aside 
        className={`
          border-r border-dark-800 bg-dark-900/80 flex flex-col shrink-0 overflow-hidden
          w-full md:w-80 lg:w-84 xl:w-96
          ${mobileTab === 'pool' ? 'flex flex-1 md:flex-none' : 'hidden md:flex'}
        `}
      >
        {/* Filter Controls Header */}
        <div className="p-3 sm:p-3.5 border-b border-dark-800 bg-dark-900 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              Question Search
            </span>
            <span className="text-[11px] text-cyan-400 font-mono font-semibold">
              {filteredPool.length} found
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search topic, question, or year..."
              value={filters.searchQuery}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full bg-dark-800 border border-dark-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Unit & Subtopic Filter Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <FilterMultiSelect
              labelSingular="Unit"
              labelPlural="Units"
              icon={<Layers className="w-3 h-3 text-cyan-400 shrink-0" />}
              options={unitOptions}
              selectedValues={filters.selectedUnits}
              onChange={(units) => {
                setFilters((prev) => ({ ...prev, selectedUnits: units }));
                setCurrentPage(1);
              }}
            />

            <SubtopicMultiSelect
              hierarchy={subtopicHierarchy}
              selectedSubtopics={filters.selectedSubtopics}
              onChange={(subs) => {
                setFilters((prev) => ({ ...prev, selectedSubtopics: subs }));
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Year & Series Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <FilterMultiSelect
              labelSingular="Year"
              labelPlural="Years"
              icon={<Calendar className="w-3 h-3 text-cyan-400 shrink-0" />}
              options={yearOptions}
              selectedValues={filters.selectedYears}
              onChange={(years) => {
                setFilters((prev) => ({ ...prev, selectedYears: years }));
                setCurrentPage(1);
              }}
              badgeFontMono
            />

            <FilterMultiSelect
              labelSingular="Series"
              labelPlural="Series"
              icon={<Calendar className="w-3 h-3 text-cyan-400 shrink-0" />}
              options={seriesOptions}
              selectedValues={filters.selectedSeries}
              onChange={(series) => {
                setFilters((prev) => ({ ...prev, selectedSeries: series }));
                setCurrentPage(1);
              }}
              showSearch={false}
            />
          </div>

          {/* Question Type & Marks Filter Row */}
          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-dark-800/80">
            {/* Type Switcher */}
            <div className="flex items-center bg-dark-800 p-0.5 rounded-lg text-[10px]">
              {(['all', 'mcq', 'theory'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, questionType: t }));
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded capitalize font-medium transition-all ${
                    filters.questionType === t
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Marks Filter */}
            <div className="flex items-center bg-dark-800 p-0.5 rounded-lg text-[10px]">
              {(['all', '1', '2-3', '4+'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMarksFilter(m);
                    setCurrentPage(1);
                  }}
                  className={`px-1.5 py-0.5 rounded font-medium transition-all ${
                    marksFilter === m
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'all' ? 'All m' : `${m}m`}
                </button>
              ))}
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={() => {
                setFilters({
                  selectedUnits: [],
                  selectedSubtopics: [],
                  selectedYears: [],
                  selectedSeries: [],
                  searchQuery: '',
                  statusFilter: 'all',
                  questionType: 'all',
                  bookmarkedOnly: false,
                });
                setMarksFilter('all');
                setCurrentPage(1);
              }}
              title="Reset Search Filters"
              className="p-1 rounded hover:bg-dark-800 text-slate-500 hover:text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filtered Questions List */}
        <div className="flex-1 overflow-y-auto divide-y divide-dark-800/60 p-2 space-y-1 pb-20 md:pb-2">
          {pagedQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">No matching questions found.</p>
              <p className="text-[11px] text-slate-600 mt-1">Try relaxing your search or unit filters.</p>
            </div>
          ) : (
            pagedQuestions.map((q) => {
              const isSelected = previewQuestionId === q.id;
              const isInCart = cartQuestionIds.includes(q.id);
              const qType = getQuestionType(q);

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setPreviewQuestionId(q.id);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-dark-800 border-cyan-500/50 shadow-md shadow-cyan-950/20'
                      : 'bg-dark-900/60 hover:bg-dark-850 border-dark-800/80 hover:border-dark-750'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-cyan-300">
                        Q{q.questionNumber}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                        {q.marks}m
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {q.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Mobile Preview Switch button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewQuestionId(q.id);
                          setMobileTab('preview');
                        }}
                        className="md:hidden px-2 py-1 rounded-lg bg-dark-750 hover:bg-dark-700 text-cyan-300 text-[10px] font-semibold border border-dark-700"
                        title="View Diagram"
                      >
                        Inspect
                      </button>

                      {/* Quick Add / Remove Toggle - Large Touch Target (44px min height) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isInCart) {
                            onRemoveFromCart(q.id);
                          } else {
                            onAddToCart(q.id);
                          }
                        }}
                        title={isInCart ? 'Remove from test' : 'Add to test'}
                        className={`flex items-center justify-center gap-1 min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isInCart
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-dark-750 text-slate-300 border border-dark-700 hover:bg-cyan-600 hover:text-white hover:border-cyan-500'
                        }`}
                      >
                        {isInCart ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 truncate font-medium">
                    {q.subtopic || q.topic}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {q.series || q.session} {q.year} • {qType === 'mcq' ? 'Section A' : 'Theory'}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="h-10 px-3 border-t border-dark-800 bg-dark-900 flex items-center justify-between shrink-0 text-xs text-slate-400">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-dark-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-dark-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* CENTER COLUMN: Live Question & Mark Scheme Preview Pane                  */}
      {/* ========================================================================= */}
      <main 
        className={`
          flex-1 flex flex-col h-full bg-dark-950 overflow-hidden border-r border-dark-800
          w-full
          ${mobileTab === 'preview' ? 'flex' : 'hidden md:flex'}
        `}
      >
        {/* Preview Header Bar */}
        <div className="h-14 px-3 sm:px-5 border-b border-dark-800 bg-dark-900/90 flex items-center justify-between shrink-0 gap-2">
          {activePreviewQuestion ? (
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
              {/* Back to Pool Button on Mobile (< 768px) */}
              <button
                type="button"
                onClick={() => setMobileTab('pool')}
                className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-xs font-semibold text-cyan-300 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Pool</span>
              </button>

              <span className="font-mono font-bold text-sm text-cyan-300 shrink-0">
                Q{activePreviewQuestion.questionNumber}
              </span>
              <span className="text-dark-600 hidden sm:inline">•</span>
              <div className="flex items-center gap-2 text-xs overflow-hidden">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold shrink-0">
                  {activePreviewQuestion.marks}m
                </span>
                <span className="text-slate-300 font-medium truncate hidden sm:inline">
                  {activePreviewQuestion.unit} / {activePreviewQuestion.subtopic || activePreviewQuestion.topic}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-500">No question selected for preview</span>
          )}

          {/* Preview Controls & Add/Remove Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* View Mode Toggle: Question / Split / MS */}
            <div className="flex items-center bg-dark-850 p-0.5 rounded-lg border border-dark-750 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab('question')}
                className={`px-2 py-1 rounded transition-all font-medium ${
                  previewTab === 'question' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Question
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('split')}
                className={`hidden md:inline-block px-2.5 py-1 rounded transition-all font-medium ${
                  previewTab === 'split' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('ms')}
                className={`px-2 py-1 rounded transition-all font-medium ${
                  previewTab === 'ms' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Answers
              </button>
            </div>

            {/* Primary Add/Remove from Test Cart Button */}
            {activePreviewQuestion && (
              <button
                type="button"
                onClick={() => {
                  if (cartQuestionIds.includes(activePreviewQuestion.id)) {
                    onRemoveFromCart(activePreviewQuestion.id);
                  } else {
                    onAddToCart(activePreviewQuestion.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all ${
                  cartQuestionIds.includes(activePreviewQuestion.id)
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400/40 hover:brightness-110 shadow-cyan-950/40'
                }`}
              >
                {cartQuestionIds.includes(activePreviewQuestion.id) ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Test</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Preview Canvas Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative pb-16 md:pb-0">
          {activePreviewQuestion ? (
            <>
              {(previewTab === 'question' || previewTab === 'split') && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <ImageCanvas
                    src={activePreviewQuestion.questionImagePath}
                    title={`Question ${activePreviewQuestion.questionNumber}`}
                    badgeText={`${activePreviewQuestion.marks}m`}
                    badgeColor="cyan"
                    placeholderTitle="Question crop missing"
                  />
                </div>
              )}

              {(previewTab === 'ms' || previewTab === 'split') && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <ImageCanvas
                    src={activePreviewQuestion.markSchemeImagePath}
                    title={`Official Mark Scheme: Q${activePreviewQuestion.questionNumber}`}
                    badgeText="Answers"
                    badgeColor="emerald"
                    placeholderTitle="Mark Scheme not indexed"
                    placeholderMessage="Official mark scheme slice not found for this item."
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select any question on the left to preview.
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FLOATING EXAM CART BADGE BUTTON (< 1024px)                                */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setIsCartDrawerOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-2xl shadow-cyan-950 border border-cyan-400/40 hover:scale-105 active:scale-95 transition-all select-none"
          title="Open Exam Cart"
        >
          <FileText className="w-4 h-4 text-cyan-200" />
          <span>Exam Cart ({cartQuestionIds.length})</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-dark-950 font-bold font-mono text-[11px]">
            {totalCartMarks}m
          </span>
        </button>
      </div>

      {/* Mobile/Tablet Backdrop for Cart Drawer (< 1024px) */}
      {isCartDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-150"
          onClick={() => setIsCartDrawerOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Exam Paper Cart & PDF Builder Panel                         */}
      {/* (Permanent Sidebar on Desktop >= 1024px, Slide-Over Drawer on < 1024px)  */}
      {/* ========================================================================= */}
      <aside 
        className={`
          bg-dark-900 flex flex-col shrink-0 overflow-hidden transition-transform duration-200
          fixed inset-y-0 right-0 z-50 w-full sm:w-[26rem] border-l border-dark-750 shadow-2xl
          lg:static lg:w-84 lg:xl:w-96 lg:z-auto lg:border-l lg:border-dark-800 lg:shadow-none lg:translate-x-0
          ${isCartDrawerOpen ? 'translate-x-0 flex' : 'translate-x-full lg:translate-x-0 hidden lg:flex'}
        `}
      >
        {/* Cart Header */}
        <div className="p-4 border-b border-dark-800 bg-dark-850 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Custom Exam Cart
            </h3>
            <div className="flex items-center gap-2">
              {cartQuestionIds.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors"
                  title="Remove all questions"
                >
                  Clear All
                </button>
              )}
              {/* Close Button on Mobile/Tablet */}
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 lg:hidden transition-colors"
                title="Close Exam Cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Test Title Input */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Exam Title
            </label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => onSetTestTitle(e.target.value)}
              placeholder="e.g. Unit 4 Kinetics & Equilibria Test"
              className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-medium placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Test Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-dark-800/80 border border-dark-750 text-center">
              <div className="text-xs text-slate-400">Questions</div>
              <div className="text-sm font-extrabold text-cyan-300 font-mono mt-0.5">
                {cartQuestions.length}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-dark-800/80 border border-dark-750 text-center">
              <div className="text-xs text-slate-400">Total Marks</div>
              <div className="text-sm font-extrabold text-amber-300 font-mono mt-0.5">
                {totalCartMarks}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-dark-800/80 border border-dark-750 text-center">
              <div className="text-xs text-slate-400">Est. Time</div>
              <div className="text-sm font-extrabold text-emerald-300 font-mono mt-0.5">
                {targetTimeMinutes}m
              </div>
            </div>
          </div>
        </div>

        {/* Selected Questions Reorderable List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cartQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FileText className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Your Exam Cart is Empty</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-[14rem]">
                Search questions and click "Add" to assemble your custom test.
              </p>
            </div>
          ) : (
            cartQuestions.map((q, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === cartQuestions.length - 1;
              const isPreviewed = previewQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setPreviewQuestionId(q.id);
                    if (window.innerWidth < 1024) {
                      setMobileTab('preview');
                      setIsCartDrawerOpen(false);
                    }
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isPreviewed
                      ? 'bg-dark-800 border-cyan-500/50 shadow-md'
                      : 'bg-dark-850 hover:bg-dark-800/90 border-dark-750'
                  }`}
                >
                  {/* Left: Index & Question Info */}
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-5 h-5 rounded-md bg-dark-750 flex items-center justify-center font-mono font-bold text-[11px] text-slate-300 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-cyan-300">
                          Q{q.questionNumber}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                          {q.marks}m
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {q.unit} • {q.subtopic || q.topic}
                      </p>
                    </div>
                  </div>

                  {/* Right: Reorder & Remove Controls (44px min tap friendly) */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(idx)}
                      title="Move Question Up"
                      className="p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(idx)}
                      title="Move Question Down"
                      className="p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFromCart(q.id)}
                      title="Remove from Cart"
                      className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors ml-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Bar: PDF Export Options & Buttons */}
        <div className="p-3.5 border-t border-dark-800 bg-dark-850 space-y-2.5 shrink-0">
          {/* Export Options Configuration Box */}
          <div className="p-2.5 rounded-xl bg-dark-800/80 border border-dark-750 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-dark-750/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Export Options
              </span>
              <span
                className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                  !includeHeaderFooter
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : includeFormalHeader
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                }`}
              >
                {!includeHeaderFooter ? 'Pure Questions' : includeFormalHeader ? 'Exam Mode' : 'Worksheet Mode'}
              </span>
            </div>

            {/* Include Header & Page Footer Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer group pt-0.5">
              <input
                type="checkbox"
                checked={includeHeaderFooter}
                onChange={(e) => setIncludeHeaderFooter(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded bg-dark-900 border-dark-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
              />
              <div className="text-left select-none leading-snug">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  Include Header &amp; Page Footer
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Uncheck for pure questions only (removes title bar, footer text, and page numbering).
                </div>
              </div>
            </label>

            {/* Formal Exam Header Checkbox */}
            <label
              className={`flex items-start gap-2.5 cursor-pointer group pt-1.5 border-t border-dark-750/60 transition-opacity ${
                !includeHeaderFooter ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <input
                type="checkbox"
                disabled={!includeHeaderFooter}
                checked={includeFormalHeader && includeHeaderFooter}
                onChange={(e) => setIncludeFormalHeader(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded bg-dark-900 border-dark-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
              />
              <div className="text-left select-none leading-snug">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  Formal Exam Header
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {includeFormalHeader
                    ? 'Includes candidate boxes, instructions, and official title banner'
                    : 'Worksheet mode: starts Q1 near top margin to save ink and paper'}
                </div>
              </div>
            </label>

            {/* Include Source Citation Tag Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer group pt-1.5 border-t border-dark-750/60">
              <input
                type="checkbox"
                checked={includeSourceTags}
                onChange={(e) => setIncludeSourceTags(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded bg-dark-900 border-dark-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
              />
              <div className="text-left select-none leading-snug">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  Include Question Source Tag
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Prints citation (e.g. Unit 3 • June 2024 Q2(a)) above questions
                </div>
              </div>
            </label>
          </div>

          {exportStatus && (
            <div className="text-[11px] text-center text-cyan-300 font-medium py-0.5 animate-pulse">
              {exportStatus}
            </div>
          )}

          <button
            type="button"
            disabled={cartQuestions.length === 0 || isExportingQP || isExportingMS}
            onClick={handleExportQP}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950/40 border border-cyan-400/30 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
          >
            <Printer className="w-4 h-4" />
            <span>
              {!includeHeaderFooter
                ? 'Export Questions Only (PDF)'
                : includeFormalHeader
                ? 'Export Exam Paper (PDF)'
                : 'Export Worksheet (PDF)'}
            </span>
          </button>

          <button
            type="button"
            disabled={cartQuestions.length === 0 || isExportingQP || isExportingMS}
            onClick={handleExportMS}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-emerald-300 font-bold text-xs border border-dark-700 hover:border-emerald-500/40 transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Mark Scheme (PDF)</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

export default TestMakerPage;
