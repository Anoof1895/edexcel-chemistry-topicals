import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Compass,
  FileText,
  BookOpen,
  Home,
  FlaskConical,
  Atom,
  Sigma,
  Sun,
  Moon,
  FilterX,
  Bookmark,
  Eye,
  CornerDownLeft,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { AppView, QuestionItem, Subject } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  currentView: AppView;
  activeSubject: Subject;
  onNavigate: (view: AppView) => void;
  onToggleDataBooklet: () => void;
  onResetFilters: () => void;
  onSelectUnitFilter: (subject: Subject, unitLabel: string) => void;
  onSelectQuestion?: (subject: Subject, questionId: string) => void;
  onToggleMarkScheme?: () => void;
  onToggleBookmarkedOnly?: () => void;
  chemQuestions: QuestionItem[] | null;
  physQuestions: QuestionItem[] | null;
  mathQuestions: QuestionItem[] | null;
}

type CommandCategory =
  | 'Navigation / Views'
  | 'Subject Switching'
  | 'Quick Actions'
  | 'Papers & Units'
  | 'Questions';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  keywords: string;
  icon: React.ReactNode;
  shortcut?: string;
  badge?: string;
  subjectAccent?: Subject;
  action: () => void;
}

// Canonical Edexcel IAL Paper / Unit directory for instant matching even before/after dataset load
const CANONICAL_UNITS: Array<{
  code: string;
  unit: string;
  title: string;
  subject: Subject;
  keywords: string;
}> = [
  // Chemistry (WCH11–WCH16)
  { code: 'WCH11', unit: 'Unit 1', title: 'WCH11 — Structure, Bonding & Intro to Organic Chemistry', subject: 'chemistry', keywords: 'wch11 chemistry unit 1 u1 AS organic bonding' },
  { code: 'WCH12', unit: 'Unit 2', title: 'WCH12 — Energetics, Group Chemistry, Halogenoalkanes & Alcohols', subject: 'chemistry', keywords: 'wch12 chemistry unit 2 u2 AS energetics kinetics' },
  { code: 'WCH13', unit: 'Unit 3', title: 'WCH13 — Practical Skills in Chemistry I', subject: 'chemistry', keywords: 'wch13 chemistry unit 3 u3 AS practical lab' },
  { code: 'WCH14', unit: 'Unit 4', title: 'WCH14 — Rates, Equilibria & Further Organic Chemistry', subject: 'chemistry', keywords: 'wch14 chemistry unit 4 u4 A2 rates entropy equilibria carbonyls' },
  { code: 'WCH15', unit: 'Unit 5', title: 'WCH15 — Transition Metals & Organic Nitrogen Chemistry', subject: 'chemistry', keywords: 'wch15 chemistry unit 5 u5 A2 redox transition metals benzene amines' },
  { code: 'WCH16', unit: 'Unit 6', title: 'WCH16 — Practical Skills in Chemistry II', subject: 'chemistry', keywords: 'wch16 chemistry unit 6 u6 A2 practical lab' },
  // Physics (WPH11–WPH16)
  { code: 'WPH11', unit: 'Unit 1', title: 'WPH11 — Mechanics and Materials', subject: 'physics', keywords: 'wph11 physics unit 1 u1 AS mechanics materials suvat forces' },
  { code: 'WPH12', unit: 'Unit 2', title: 'WPH12 — Waves and Electricity', subject: 'physics', keywords: 'wph12 physics unit 2 u2 AS waves electricity circuits optics' },
  { code: 'WPH13', unit: 'Unit 3', title: 'WPH13 — Practical Skills in Physics I', subject: 'physics', keywords: 'wph13 physics unit 3 u3 AS practical uncertainties' },
  { code: 'WPH14', unit: 'Unit 4', title: 'WPH14 — Further Mechanics, Fields and Particles', subject: 'physics', keywords: 'wph14 physics unit 4 u4 A2 momentum circular electric magnetic fields capacitors nuclear' },
  { code: 'WPH15', unit: 'Unit 5', title: 'WPH15 — Thermodynamics, Radiation, Oscillations and Cosmology', subject: 'physics', keywords: 'wph15 physics unit 5 u5 A2 thermal gases shm astrophysics cosmology' },
  { code: 'WPH16', unit: 'Unit 6', title: 'WPH16 — Practical Skills in Physics II', subject: 'physics', keywords: 'wph16 physics unit 6 u6 A2 practical' },
  // Mathematics (WMA11–WMA14, WME01, WST01)
  { code: 'WMA11', unit: 'P1', title: 'WMA11 — Pure Mathematics 1 (P1)', subject: 'mathematics', keywords: 'wma11 p1 pure 1 mathematics quadratics differentiation integration radians' },
  { code: 'WMA12', unit: 'P2', title: 'WMA12 — Pure Mathematics 2 (P2)', subject: 'mathematics', keywords: 'wma12 p2 pure 2 mathematics logarithms sequences series binomial trapezium' },
  { code: 'WMA13', unit: 'P3', title: 'WMA13 — Pure Mathematics 3 (P3)', subject: 'mathematics', keywords: 'wma13 p3 pure 3 mathematics functions trig chain product quotient rule numerical' },
  { code: 'WMA14', unit: 'P4', title: 'WMA14 — Pure Mathematics 4 (P4)', subject: 'mathematics', keywords: 'wma14 p4 pure 4 mathematics parametric vectors differential equations integration by parts' },
  { code: 'WME01', unit: 'M1', title: 'WME01 — Mechanics 1 (M1)', subject: 'mathematics', keywords: 'wme01 m1 mechanics 1 mathematics kinematics dynamics moments vectors statics' },
  { code: 'WST01', unit: 'S1', title: 'WST01 — Statistics 1 (S1)', subject: 'mathematics', keywords: 'wst01 s1 statistics 1 mathematics probability normal distribution regression correlation discrete' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpen,
  currentView,
  activeSubject,
  onNavigate,
  onToggleDataBooklet,
  onResetFilters,
  onSelectUnitFilter,
  onSelectQuestion,
  onToggleMarkScheme,
  onToggleBookmarkedOnly,
  chemQuestions,
  physQuestions,
  mathQuestions,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Global Ctrl+K / Cmd+K and Escape listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
        return;
      }

      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [isOpen, onOpen, onClose]);

  // Reset search & focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 15);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  const executeAndClose = useCallback(
    (fn: () => void) => {
      fn();
      onClose();
    },
    [onClose]
  );

  // Build static + dynamic command items
  const allCommands = useMemo<CommandItem[]>(() => {
    const activeSubjectLabel =
      activeSubject === 'mathematics'
        ? 'Mathematics'
        : activeSubject === 'physics'
        ? 'Physics'
        : 'Chemistry';

    const topicalView: AppView =
      activeSubject === 'mathematics'
        ? 'mathematics-topical'
        : activeSubject === 'physics'
        ? 'physics-topical'
        : 'chemistry-topical';

    const testMakerView: AppView =
      activeSubject === 'mathematics'
        ? 'mathematics-test-maker'
        : activeSubject === 'physics'
        ? 'physics-test-maker'
        : 'chemistry-test-maker';

    const baseItems: CommandItem[] = [
      // 1. Navigation / Views
      {
        id: 'nav-topical-active',
        title: `Open ${activeSubjectLabel} Topical Explorer`,
        subtitle: 'Browse past paper questions by unit, topic, and year',
        category: 'Navigation / Views',
        keywords: `topicals explorer questions ${activeSubject} browse practice`,
        icon: <Compass className="w-4 h-4" />,
        badge: currentView === topicalView ? 'Active' : undefined,
        subjectAccent: activeSubject,
        action: () => executeAndClose(() => onNavigate(topicalView)),
      },
      {
        id: 'nav-test-maker-active',
        title: `Open ${activeSubjectLabel} Custom Test Maker`,
        subtitle: 'Auto-generate or build custom printable PDF mock exams',
        category: 'Navigation / Views',
        keywords: `test maker mock exam builder generator pdf ${activeSubject}`,
        icon: <FileText className="w-4 h-4" />,
        badge: currentView === testMakerView ? 'Active' : undefined,
        subjectAccent: activeSubject,
        action: () => executeAndClose(() => onNavigate(testMakerView)),
      },
      {
        id: 'nav-data-booklet',
        title: 'Toggle Official Data Booklet & Formula Sheet',
        subtitle: 'Pearson Edexcel IAL constants, equations, periodic table & Φ(z)',
        category: 'Navigation / Views',
        keywords: 'data booklet formula sheet periodic table constants equations yellow booklet',
        icon: <BookOpen className="w-4 h-4" />,
        shortcut: 'D',
        subjectAccent: activeSubject,
        action: () => executeAndClose(onToggleDataBooklet),
      },
      {
        id: 'nav-home',
        title: 'Go to Subject Portal (Home)',
        subtitle: 'Overview of Chemistry, Physics & Mathematics archives',
        category: 'Navigation / Views',
        keywords: 'home portal dashboard overview landing',
        icon: <Home className="w-4 h-4" />,
        badge: currentView === 'home' ? 'Active' : undefined,
        action: () => executeAndClose(() => onNavigate('home')),
      },

      // 2. Subject Switching
      {
        id: 'sub-chemistry',
        title: 'Switch to Chemistry (IAL)',
        subtitle: 'Units 1–6 (WCH11–WCH16) • 5,712 Questions',
        category: 'Subject Switching',
        keywords: 'switch chemistry wch11 wch12 wch13 wch14 wch15 wch16 organic inorganic',
        icon: <FlaskConical className="w-4 h-4 text-cyan-400" />,
        badge: currentView !== 'home' && activeSubject === 'chemistry' ? 'Current' : 'WCH11–16',
        subjectAccent: 'chemistry',
        action: () =>
          executeAndClose(() =>
            onNavigate(currentView.endsWith('test-maker') ? 'chemistry-test-maker' : 'chemistry-topical')
          ),
      },
      {
        id: 'sub-physics',
        title: 'Switch to Physics (IAL)',
        subtitle: 'Units 1–6 (WPH11–WPH16) • 4,136 Questions',
        category: 'Subject Switching',
        keywords: 'switch physics wph11 wph12 wph13 wph14 wph15 wph16 mechanics waves fields',
        icon: <Atom className="w-4 h-4 text-indigo-400" />,
        badge: currentView !== 'home' && activeSubject === 'physics' ? 'Current' : 'WPH11–16',
        subjectAccent: 'physics',
        action: () =>
          executeAndClose(() =>
            onNavigate(currentView.endsWith('test-maker') ? 'physics-test-maker' : 'physics-topical')
          ),
      },
      {
        id: 'sub-mathematics',
        title: 'Switch to Mathematics (IAL)',
        subtitle: 'Pure P1–P4, Mechanics M1, Statistics S1 • 1,269 Questions',
        category: 'Subject Switching',
        keywords: 'switch mathematics maths math wma11 wma12 wma13 wma14 wme01 wst01 p1 p2 p3 p4 m1 s1',
        icon: <Sigma className="w-4 h-4 text-amber-400" />,
        badge: currentView !== 'home' && activeSubject === 'mathematics' ? 'Current' : 'P1–P4, M1, S1',
        subjectAccent: 'mathematics',
        action: () =>
          executeAndClose(() =>
            onNavigate(currentView.endsWith('test-maker') ? 'mathematics-test-maker' : 'mathematics-topical')
          ),
      },

      // 3. Quick Actions
      {
        id: 'act-toggle-theme',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: `Currently using ${theme === 'dark' ? 'Dark' : 'Light'} appearance`,
        category: 'Quick Actions',
        keywords: 'toggle theme dark light mode appearance night day',
        icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        action: () => executeAndClose(toggleTheme),
      },
      {
        id: 'act-clear-filters',
        title: 'Clear All Active Filters',
        subtitle: 'Reset unit, subtopic, year, session, and search filters',
        category: 'Quick Actions',
        keywords: 'clear reset filters all questions show all',
        icon: <FilterX className="w-4 h-4 text-rose-400" />,
        action: () => executeAndClose(onResetFilters),
      },
    ];

    if (onToggleMarkScheme && currentView.endsWith('-topical')) {
      baseItems.push({
        id: 'act-toggle-ms',
        title: 'Toggle Mark Scheme / Split View',
        subtitle: 'Show or hide the official Pearson mark scheme side-by-side',
        category: 'Quick Actions',
        keywords: 'toggle mark scheme answer split view show hide',
        icon: <Eye className="w-4 h-4 text-emerald-400" />,
        shortcut: 'Space',
        action: () => executeAndClose(onToggleMarkScheme),
      });
    }

    if (onToggleBookmarkedOnly) {
      baseItems.push({
        id: 'act-bookmarks-only',
        title: 'Filter by Bookmarked Questions',
        subtitle: 'Jump to your saved & bookmarked questions in Topical Explorer',
        category: 'Quick Actions',
        keywords: 'bookmarks saved starred filter review',
        icon: <Bookmark className="w-4 h-4 text-amber-400" />,
        action: () => executeAndClose(onToggleBookmarkedOnly),
      });
    }

    // 4. Papers & Units (WCH11–16, WPH11–16, WMA11–14, WME01, WST01)
    // Prioritize active subject units first
    const sortedUnits = [...CANONICAL_UNITS].sort((a, b) => {
      if (a.subject === activeSubject && b.subject !== activeSubject) return -1;
      if (a.subject !== activeSubject && b.subject === activeSubject) return 1;
      return 0;
    });

    for (const u of sortedUnits) {
      const loadedPool =
        u.subject === 'chemistry'
          ? chemQuestions
          : u.subject === 'physics'
          ? physQuestions
          : mathQuestions;

      const unitQuestionCount = loadedPool
        ? loadedPool.filter(
            (q) =>
              q.unitCode?.toUpperCase() === u.code ||
              (q.paperCode || q.paper_code || '').toUpperCase().startsWith(u.code) ||
              (q.unit || '').split(':')[0].trim().toLowerCase() === u.unit.toLowerCase()
          ).length
        : null;

      baseItems.push({
        id: `unit-${u.code}`,
        title: u.title,
        subtitle: `Filter ${
          u.subject === 'mathematics' ? 'Mathematics' : u.subject === 'physics' ? 'Physics' : 'Chemistry'
        } Topicals by ${u.unit} (${u.code})`,
        category: 'Papers & Units',
        keywords: `${u.code} ${u.unit} ${u.title} ${u.keywords}`,
        icon: <Layers className="w-4 h-4" />,
        badge: unitQuestionCount !== null && unitQuestionCount > 0 ? `${unitQuestionCount} Qs` : u.code,
        subjectAccent: u.subject,
        action: () => executeAndClose(() => onSelectUnitFilter(u.subject, u.unit)),
      });
    }

    return baseItems;
  }, [
    activeSubject,
    currentView,
    theme,
    chemQuestions,
    physQuestions,
    mathQuestions,
    executeAndClose,
    onNavigate,
    onToggleDataBooklet,
    onResetFilters,
    onSelectUnitFilter,
    onToggleMarkScheme,
    onToggleBookmarkedOnly,
    toggleTheme,
  ]);

  // Filter items by query + optionally match loaded questions when query >= 2 chars
  const filteredItems = useMemo<CommandItem[]>(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Default view: show all Navigation, Subject Switching, Quick Actions, and active subject's Papers & Units
      return allCommands.filter(
        (item) =>
          item.category !== 'Papers & Units' || item.subjectAccent === activeSubject
      );
    }

    const terms = trimmed.split(/\s+/).filter(Boolean);
    const matchedBase = allCommands.filter((item) => {
      const haystack = `${item.title} ${item.subtitle || ''} ${item.keywords} ${item.badge || ''}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });

    // Also search loaded datasets for specific paper codes / questions when query is >= 2 chars
    const matchedQuestions: CommandItem[] = [];
    if (trimmed.length >= 2 && onSelectQuestion) {
      const pools: Array<{ subject: Subject; list: QuestionItem[] | null }> = [
        { subject: activeSubject, list: activeSubject === 'chemistry' ? chemQuestions : activeSubject === 'physics' ? physQuestions : mathQuestions },
        { subject: 'chemistry', list: activeSubject !== 'chemistry' ? chemQuestions : null },
        { subject: 'physics', list: activeSubject !== 'physics' ? physQuestions : null },
        { subject: 'mathematics', list: activeSubject !== 'mathematics' ? mathQuestions : null },
      ];

      for (const pool of pools) {
        if (!pool.list) continue;
        for (const q of pool.list) {
          if (matchedQuestions.length >= 8) break;
          const paperCode = q.paperCode || q.paper_code || q.unitCode || '';
          const seriesStr = `${q.series || q.session || ''} ${q.year || ''}`.trim();
          const qNumStr = `Q${q.questionNumber}`;
          const searchTarget = `${paperCode} ${q.unit} ${seriesStr} ${qNumStr} ${q.topic || ''} ${q.subtopic || ''} ${q.id}`.toLowerCase();
          if (terms.every((t) => searchTarget.includes(t))) {
            matchedQuestions.push({
              id: `q-${pool.subject}-${q.id}`,
              title: `${paperCode || q.unit} • ${seriesStr} • ${qNumStr}`,
              subtitle: `${q.subtopic || q.topic} (${q.marks}m)`,
              category: 'Questions',
              keywords: searchTarget,
              icon: <Sparkles className="w-4 h-4" />,
              badge: `${q.marks}m`,
              subjectAccent: pool.subject,
              action: () => executeAndClose(() => onSelectQuestion(pool.subject, q.id)),
            });
          }
        }
      }
    }

    return [...matchedBase, ...matchedQuestions];
  }, [
    query,
    allCommands,
    activeSubject,
    chemQuestions,
    physQuestions,
    mathQuestions,
    onSelectQuestion,
    executeAndClose,
  ]);

  // Group items in display order while maintaining flat index for keyboard navigation
  const groupedSections = useMemo(() => {
    const order: CommandCategory[] = [
      'Navigation / Views',
      'Subject Switching',
      'Quick Actions',
      'Papers & Units',
      'Questions',
    ];
    const sections: Array<{ category: CommandCategory; items: Array<{ item: CommandItem; flatIndex: number }> }> = [];
    let runningIndex = 0;

    for (const cat of order) {
      const catItems = filteredItems.filter((i) => i.category === cat);
      if (catItems.length > 0) {
        sections.push({
          category: cat,
          items: catItems.map((item) => ({
            item,
            flatIndex: runningIndex++,
          })),
        });
      }
    }

    return { sections, totalCount: runningIndex };
  }, [filteredItems]);

  const flatOrderedItems = useMemo(
    () => groupedSections.sections.flatMap((s) => s.items.map((x) => x.item)),
    [groupedSections]
  );

  // Clamp selectedIndex when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view on keyboard navigation
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatOrderedItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatOrderedItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatOrderedItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatOrderedItems.length) % flatOrderedItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatOrderedItems[selectedIndex];
      if (target) {
        target.action();
      }
    }
  };

  if (!isOpen) return null;

  const isMath = activeSubject === 'mathematics';
  const isPhysics = activeSubject === 'physics';

  const activeRowHighlight = isMath
    ? 'bg-amber-500/15 dark:bg-amber-500/15 text-amber-900 dark:text-white border-amber-500/40 dark:border-amber-400/40 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.15)]'
    : isPhysics
    ? 'bg-indigo-500/15 dark:bg-indigo-500/15 text-indigo-900 dark:text-white border-indigo-500/40 dark:border-indigo-400/40 shadow-[inset_0_1px_0_0_rgba(129,140,248,0.15)]'
    : 'bg-cyan-500/15 dark:bg-cyan-500/15 text-cyan-900 dark:text-white border-cyan-500/40 dark:border-cyan-400/40 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.15)]';

  const activeIconColor = isMath
    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30'
    : isPhysics
    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 border-indigo-500/30'
    : 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/15 border-cyan-500/30';

  const topAccentGlint = isMath
    ? 'from-amber-500/0 via-amber-400/90 to-amber-500/0'
    : isPhysics
    ? 'from-indigo-500/0 via-indigo-400/90 to-indigo-500/0'
    : 'from-cyan-500/0 via-cyan-400/90 to-cyan-500/0';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-start justify-center pt-[10vh] sm:pt-[13vh] px-3 sm:px-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
      onKeyDown={handleModalKeyDown}
    >
      <div
        className="w-full max-w-xl rounded-2xl surface-glass border border-slate-200/90 dark:border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Subject Specular Glint */}
        <div
          className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r ${topAccentGlint} pointer-events-none`}
        />

        {/* Search Input Header */}
        <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center gap-3 bg-white/50 dark:bg-[#07090D]/60">
          <Search
            className={`w-4 h-4 shrink-0 ${
              isMath
                ? 'text-amber-500 dark:text-amber-400'
                : isPhysics
                ? 'text-indigo-500 dark:text-indigo-400'
                : 'text-cyan-500 dark:text-cyan-400'
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, subject, or paper code (e.g. WMA14, WCH11, WPH12)..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 shrink-0">
            {groupedSections.totalCount} {groupedSections.totalCount === 1 ? 'hit' : 'hits'}
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[62vh] sm:max-h-[420px] overflow-y-auto p-2 space-y-3">
          {groupedSections.sections.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                No matching commands or papers for &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Try searching for paper codes like <span className="font-mono">WMA14</span>,{' '}
                <span className="font-mono">WCH11</span>, <span className="font-mono">WPH12</span>, or views like{' '}
                <span className="font-mono">Test Maker</span>.
              </p>
            </div>
          ) : (
            groupedSections.sections.map((section) => (
              <div key={section.category} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>{section.category}</span>
                  <span className="font-mono tabular-nums text-[10px] opacity-75">
                    {section.items.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {section.items.map(({ item, flatIndex }) => {
                    const isSelected = flatIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          itemRefs.current[flatIndex] = el;
                        }}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        onClick={item.action}
                        className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl text-left border transition-all duration-100 ${
                          isSelected
                            ? activeRowHighlight
                            : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${
                              isSelected
                                ? activeIconColor
                                : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate flex items-center gap-2">
                              <span className="truncate">{item.title}</span>
                            </div>
                            {item.subtitle && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && (
                            <span className="text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                              {item.badge}
                            </span>
                          )}
                          {item.shortcut && <kbd className="kbd-keycap">{item.shortcut}</kbd>}
                          {isSelected && (
                            <CornerDownLeft
                              className={`w-3.5 h-3.5 ml-0.5 ${
                                isMath
                                  ? 'text-amber-500 dark:text-amber-400'
                                  : isPhysics
                                  ? 'text-indigo-500 dark:text-indigo-400'
                                  : 'text-cyan-500 dark:text-cyan-400'
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Hints Bar */}
        <div className="px-4 py-2 border-t border-slate-200/80 dark:border-white/[0.07] bg-slate-50/90 dark:bg-[#07090D]/90 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd-keycap">↑</kbd>
              <kbd className="kbd-keycap">↓</kbd>
              <span className="ml-0.5">Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd-keycap">↵</kbd>
              <span className="ml-0.5">Select</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd-keycap">Esc</kbd>
              <span className="ml-0.5">Close</span>
            </span>
          </div>
          <span className="hidden sm:inline font-mono tabular-nums text-[10px] text-slate-400 dark:text-slate-500">
            Edexcel IAL Command Palette
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
