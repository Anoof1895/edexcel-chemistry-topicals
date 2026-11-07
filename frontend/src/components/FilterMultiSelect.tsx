import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { Subject } from '../types';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterMultiSelectProps {
  labelSingular: string;
  labelPlural: string;
  allLabel?: string;
  icon?: React.ReactNode;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  showSearch?: boolean;
  align?: 'left' | 'right';
  badgeFontMono?: boolean;
  fullWidth?: boolean;
  activeSubject?: Subject;
}

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({
  labelSingular,
  labelPlural,
  allLabel,
  icon,
  options,
  selectedValues,
  onChange,
  showSearch = true,
  align = 'left',
  badgeFontMono = false,
  fullWidth = false,
  activeSubject = 'chemistry',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isMath = activeSubject === 'mathematics';
  const isPhysics = activeSubject === 'physics';

  const accent = isMath
    ? {
        actionLink: 'text-amber-600 dark:text-amber-400 hover:underline font-semibold',
        rowSelected: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-semibold',
        checkbox: 'bg-amber-600 border-amber-600 text-white shadow-sm shadow-amber-500/30',
        activeTrigger: 'bg-amber-50 dark:bg-amber-500/15 border-amber-400/70 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 shadow-sm',
      }
    : isPhysics
    ? {
        actionLink: 'text-indigo-600 dark:text-indigo-400 hover:underline font-semibold',
        rowSelected: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 font-semibold',
        checkbox: 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/30',
        activeTrigger: 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-400/70 dark:border-indigo-500/40 text-indigo-800 dark:text-indigo-200 shadow-sm',
      }
    : {
        actionLink: 'text-cyan-600 dark:text-cyan-400 hover:underline font-semibold',
        rowSelected: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-100 font-semibold',
        checkbox: 'bg-cyan-600 border-cyan-600 text-white shadow-sm shadow-cyan-500/30',
        activeTrigger: 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-400/70 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-200 shadow-sm',
      };
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const desiredWidth = Math.min(280, vw - 16);
    const width = Math.max(desiredWidth, Math.min(rect.width, vw - 16));

    let left = align === 'right' ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, vw - width - 8));

    const gap = 6;
    const spaceBelow = vh - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const viewportCap = Math.min(420, Math.max(200, vh - 120));

    let top = rect.bottom + gap;
    let maxHeight = Math.min(viewportCap, Math.max(180, spaceBelow));

    if (spaceBelow < 200 && spaceAbove > spaceBelow + 40) {
      maxHeight = Math.min(viewportCap, Math.max(180, spaceAbove));
      top = Math.max(8, rect.top - gap - maxHeight);
    }

    setPopoverPos({ top, left, width, maxHeight });
  }, [align]);

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

  useEffect(() => {
    if (!isOpen || !showSearch || options.length <= 5) return;
    const raf = requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, showSearch, options.length]);

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

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [options, searchTerm]);

  const handleToggle = (val: string) => {
    if (selectedSet.has(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedCount = selectedValues.length;

  const buttonLabel = useMemo(() => {
    if (selectedCount === 0) return allLabel || `All ${labelPlural}`;
    if (selectedCount === 1) {
      const match = options.find((o) => o.value === selectedValues[0]);
      return match ? match.label : selectedValues[0];
    }
    return `${selectedCount} ${labelPlural}`;
  }, [selectedCount, selectedValues, options, allLabel, labelPlural]);

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
        className="fixed z-[9999] flex flex-col overflow-hidden max-h-[min(420px,calc(100vh-120px))] bg-white dark:bg-[#0f1420] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 select-none"
      >
        {/* Locked Search & Bulk Actions Header */}
        <div className="flex-shrink-0 p-2.5 bg-slate-50 dark:bg-[#131a29] border-b border-slate-200 dark:border-slate-800 space-y-2">
          {showSearch && options.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={`Search ${labelPlural.toLowerCase()}...`}
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
          )}

          <div className="flex items-center justify-between text-[11px] px-0.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
              {selectedCount} of {options.length} {labelSingular.toLowerCase()}
              {options.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSelectAll}
                className={accent.actionLink}
              >
                All
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-1.5 space-y-0.5 bg-white dark:bg-[#0f1420]">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching {labelPlural.toLowerCase()}.
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isChecked = selectedSet.has(opt.value);
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isChecked}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleToggle(opt.value)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                    isChecked
                      ? accent.rowSelected
                      : 'hover:bg-slate-50 dark:hover:bg-[#161f31] text-slate-700 dark:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                        isChecked
                          ? accent.checkbox
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0b0f19]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`truncate ${badgeFontMono ? 'font-mono' : ''}`}>
                      {opt.label}
                    </span>
                  </div>

                  {opt.count !== undefined && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 tabular-nums">
                      {opt.count}
                    </span>
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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all select-none ${
          fullWidth ? 'w-full' : 'min-w-[105px] max-w-[180px]'
        } ${
          selectedCount > 0
            ? accent.activeTrigger
            : 'bg-slate-100 dark:bg-dark-850 border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-dark-600'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span className={`truncate ${badgeFontMono && selectedCount === 1 ? 'font-mono' : ''}`}>
            {buttonLabel}
          </span>
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
              title={`Clear ${labelSingular.toLowerCase()} filter`}
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
