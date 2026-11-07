import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Search, Check, X, BookOpen } from 'lucide-react';
import { SubtopicGroup } from '../constants/taxonomy';
import { QuestionItem, Subject } from '../types';
import { getQuestionValidSubtopics } from '../utils/questionClassification';

interface SubtopicMultiSelectProps {
  hierarchy: SubtopicGroup[];
  selectedSubtopics: string[];
  onChange: (subtopics: string[]) => void;
  questions?: QuestionItem[];
  align?: 'left' | 'right';
  fullWidth?: boolean;
  primaryOnly?: boolean;
  onTogglePrimaryOnly?: (primaryOnly: boolean) => void;
  activeSubject?: Subject;
}

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export const SubtopicMultiSelect: React.FC<SubtopicMultiSelectProps> = ({
  hierarchy,
  selectedSubtopics,
  onChange,
  questions,
  align = 'left',
  fullWidth = false,
  primaryOnly = false,
  onTogglePrimaryOnly,
  activeSubject = 'chemistry',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isMath = activeSubject === 'mathematics';
  const isPhysics = activeSubject === 'physics';

  const accent = isMath
    ? {
        activeToggle: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
        actionLink: 'text-amber-600 dark:text-amber-400 hover:underline font-semibold',
        allBtn: 'bg-amber-600 border-amber-600 text-white',
        partialBtn: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
        rowSelected: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100',
        checkbox: 'bg-amber-600 border-amber-600 text-white shadow-sm shadow-amber-500/30',
        activeTrigger: 'bg-amber-50 dark:bg-amber-500/15 border-amber-400/70 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 shadow-sm',
        triggerIcon: 'text-amber-600 dark:text-amber-400',
      }
    : isPhysics
    ? {
        activeToggle: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
        actionLink: 'text-indigo-600 dark:text-indigo-400 hover:underline font-semibold',
        allBtn: 'bg-indigo-600 border-indigo-600 text-white',
        partialBtn: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300',
        rowSelected: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100',
        checkbox: 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/30',
        activeTrigger: 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-400/70 dark:border-indigo-500/40 text-indigo-800 dark:text-indigo-200 shadow-sm',
        triggerIcon: 'text-indigo-600 dark:text-indigo-400',
      }
    : {
        activeToggle: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
        actionLink: 'text-cyan-600 dark:text-cyan-400 hover:underline font-semibold',
        allBtn: 'bg-cyan-600 border-cyan-600 text-white',
        partialBtn: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300',
        rowSelected: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-100',
        checkbox: 'bg-cyan-600 border-cyan-600 text-white shadow-sm shadow-cyan-500/30',
        activeTrigger: 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-400/70 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-200 shadow-sm',
        triggerIcon: 'text-cyan-600 dark:text-cyan-400',
      };
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const desiredWidth = Math.min(430, vw - 16);
    const width = Math.max(desiredWidth, Math.min(rect.width, vw - 16));

    let left = align === 'right' ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, vw - width - 8));

    const gap = 6;
    const spaceBelow = vh - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const viewportCap = Math.min(480, Math.max(200, vh - 120));

    let top = rect.bottom + gap;
    let maxHeight = Math.min(viewportCap, Math.max(180, spaceBelow));

    // Flip above trigger only if cramped near bottom of viewport and meaningfully more room above
    if (spaceBelow < 220 && spaceAbove > spaceBelow + 40) {
      maxHeight = Math.min(viewportCap, Math.max(180, spaceAbove));
      top = Math.max(8, rect.top - gap - maxHeight);
    }

    setPopoverPos({ top, left, width, maxHeight });
  }, [align]);

  // Anchor dynamically on open, window resize, and any scroll container movement
  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Focus search input once when opening without scrolling any ancestor container
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Close when clicking outside both trigger and portaled menu, or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDownOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDownOutside);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDownOutside);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  // Count how many unit-filtered questions belong to each subtopic (strictly unit-scoped)
  const subtopicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!questions) return counts;
    questions.forEach((q) => {
      const subs = getQuestionValidSubtopics(q, !primaryOnly);
      const seen = new Set<string>();
      subs.forEach((s) => {
        if (s && !seen.has(s)) {
          seen.add(s);
          counts[s] = (counts[s] || 0) + 1;
        }
      });
    });
    return counts;
  }, [questions, primaryOnly]);

  const selectedSet = useMemo(() => new Set(selectedSubtopics), [selectedSubtopics]);

  // Filter hierarchy by search term
  const filteredHierarchy = useMemo(() => {
    if (!searchTerm.trim()) return hierarchy;
    const q = searchTerm.toLowerCase();
    return hierarchy
      .map((group) => {
        const topicMatch = group.topicName.toLowerCase().includes(q);
        const matchingSubtopics = group.subtopics.filter((s) =>
          s.name.toLowerCase().includes(q)
        );
        if (topicMatch) return group;
        if (matchingSubtopics.length > 0) {
          return { ...group, subtopics: matchingSubtopics };
        }
        return null;
      })
      .filter((g): g is SubtopicGroup => g !== null);
  }, [hierarchy, searchTerm]);

  const allAvailableSubtopics = useMemo(() => {
    const list: string[] = [];
    hierarchy.forEach((g) =>
      g.subtopics.forEach((s) => {
        if (!list.includes(s.name)) list.push(s.name);
      })
    );
    return list;
  }, [hierarchy]);

  const handleToggleSubtopic = (name: string) => {
    if (selectedSet.has(name)) {
      onChange(selectedSubtopics.filter((s) => s !== name));
    } else {
      onChange([...selectedSubtopics, name]);
    }
  };

  const handleToggleTopicGroup = (group: SubtopicGroup) => {
    const groupNames = group.subtopics.map((s) => s.name);
    const allSelected = groupNames.every((n) => selectedSet.has(n));
    if (allSelected) {
      const removeSet = new Set(groupNames);
      onChange(selectedSubtopics.filter((s) => !removeSet.has(s)));
    } else {
      const merged = Array.from(new Set([...selectedSubtopics, ...groupNames]));
      onChange(merged);
    }
  };

  const handleSelectAll = () => {
    onChange(allAvailableSubtopics);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const toggleCollapse = (key: string) => {
    setCollapsedTopics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = selectedSubtopics.length;

  const buttonLabel = useMemo(() => {
    if (selectedCount === 0) return 'All Subtopics';
    if (selectedCount === 1) {
      const single = selectedSubtopics[0];
      const parts = single.split(':');
      return parts.length > 1 ? parts[1].trim() : single;
    }
    return `${selectedCount} Subtopics`;
  }, [selectedCount, selectedSubtopics]);

  const dropdownPortal =
    isOpen &&
    popoverPos &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={menuRef}
        role="listbox"
        aria-multiselectable="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          top: popoverPos.top,
          left: popoverPos.left,
          width: popoverPos.width,
          maxHeight: popoverPos.maxHeight,
        }}
        className="fixed z-[9999] flex flex-col overflow-hidden max-h-[min(480px,calc(100vh-120px))] bg-white dark:bg-[#0f1420] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 select-none"
      >
        {/* Top Header (Locked: never scrolls out of view) */}
        <div className="flex-shrink-0 p-2.5 bg-slate-50 dark:bg-[#131a29] border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search official subtopics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-y-1.5 text-[11px] px-0.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
              {selectedCount} of {allAvailableSubtopics.length} selected
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {onTogglePrimaryOnly && (
                <>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onTogglePrimaryOnly(!primaryOnly)}
                    title={
                      primaryOnly
                        ? 'Showing only questions where selected subtopic is the Primary topic. Click to include Secondary matches.'
                        : 'Primary matches appear first, followed by Secondary matches. Click to match Primary topic only.'
                    }
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      primaryOnly
                        ? accent.activeToggle
                        : 'bg-slate-200/70 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {primaryOnly ? 'Primary Only' : 'Primary + Related'}
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                </>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSelectAll}
                className={accent.actionLink}
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearAll}
                disabled={selectedCount === 0}
                className="text-rose-600 dark:text-rose-400 hover:underline font-semibold disabled:opacity-40 disabled:no-underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Isolated Inner Scroll Container */}
        <div
          ref={listScrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5 bg-white dark:bg-[#0f1420]"
        >
          {filteredHierarchy.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching subtopics found.
            </div>
          ) : (
            filteredHierarchy.map((group) => {
              const groupKey = group.topicName;
              const isCollapsed = collapsedTopics[groupKey] && !searchTerm.trim();
              const groupNames = group.subtopics.map((s) => s.name);
              const selectedInGroup = groupNames.filter((n) => selectedSet.has(n)).length;
              const allGroupSelected =
                groupNames.length > 0 && selectedInGroup === groupNames.length;
              const partialGroupSelected = selectedInGroup > 0 && !allGroupSelected;

              return (
                <div
                  key={groupKey}
                  className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-slate-50/70 dark:bg-[#131a29]"
                >
                  {/* Topic Group Header */}
                  <div className="flex items-center justify-between px-2.5 py-2 bg-slate-100/90 dark:bg-[#161f31] gap-2">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggleCollapse(groupKey)}
                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left group"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {group.topicName}
                      </span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleToggleTopicGroup(group)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors shrink-0 ${
                        allGroupSelected
                          ? accent.allBtn
                          : partialGroupSelected
                          ? accent.partialBtn
                          : 'bg-white dark:bg-[#0f1420] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-500/50'
                      }`}
                    >
                      {allGroupSelected ? 'Deselect' : 'All'}
                    </button>
                  </div>

                  {/* Subtopic Option Rows (no native <input> so browser never triggers scrollIntoView) */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#0f1420]">
                      {group.subtopics.map((sub) => {
                        const isChecked = selectedSet.has(sub.name);
                        const count = questions ? (subtopicCounts[sub.name] || 0) : sub.count;
                        return (
                          <div
                            key={sub.name}
                            role="option"
                            aria-selected={isChecked}
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleToggleSubtopic(sub.name)}
                            className={`flex items-center justify-between gap-2.5 px-3 py-2 cursor-pointer transition-colors text-xs ${
                              isChecked
                                ? accent.rowSelected
                                : 'hover:bg-slate-50 dark:hover:bg-[#161f31] text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div
                                className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                                  isChecked
                                    ? accent.checkbox
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0b0f19]'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="leading-snug break-words font-medium">
                                {sub.name}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 tabular-nums ${
                                count > 0
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600'
                              }`}
                            >
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      {/* Trigger Pill */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all select-none ${
          fullWidth ? 'w-full' : 'min-w-[140px] max-w-[220px]'
        } ${
          selectedCount > 0
            ? accent.activeTrigger
            : 'bg-slate-100 dark:bg-dark-850 border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-dark-600'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen className={`w-3.5 h-3.5 shrink-0 ${accent.triggerIcon}`} />
          <span className="truncate">{buttonLabel}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedCount > 0 && (
            <span
              role="button"
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleClearAll();
                }
              }}
              title="Clear subtopic filter"
              className="p-0.5 rounded-full hover:bg-cyan-200/60 dark:hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {dropdownPortal}
    </div>
  );
};
