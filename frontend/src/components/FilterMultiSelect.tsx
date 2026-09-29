import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterMultiSelectProps {
  labelSingular: string; // e.g. "Unit", "Year", "Series"
  labelPlural: string;   // e.g. "Units", "Years", "Series"
  icon: React.ReactNode;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  showSearch?: boolean;
  align?: 'left' | 'right';
  badgeFontMono?: boolean;
}

export const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({
  labelSingular,
  labelPlural,
  icon,
  options,
  selectedValues,
  onChange,
  showSearch,
  align = 'left',
  badgeFontMono = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const shouldShowSearch = showSearch ?? options.length > 5;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        title={`Filter by ${labelSingular}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all select-none ${
          selectedValues.length > 0
            ? 'bg-cyan-50 dark:bg-blue-950/60 border-cyan-400 dark:border-blue-500/50 text-cyan-800 dark:text-blue-200 hover:border-cyan-500 dark:hover:border-blue-400'
            : 'bg-slate-100 dark:bg-dark-800/80 border-slate-200 dark:border-dark-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-dark-600'
        }`}
      >
        {icon}
        <span className="truncate max-w-[130px] sm:max-w-[170px]">
          {selectedValues.length === 0 ? (
            `All ${labelPlural}`
          ) : selectedValues.length === 1 ? (
            options.find((o) => o.value === selectedValues[0])?.label || `${labelSingular}: ${selectedValues[0]}`
          ) : (
            `${selectedValues.length} ${labelPlural} Selected`
          )}
        </span>

        {selectedValues.length > 0 && (
          <span
            onClick={handleClearAll}
            title={`Clear ${labelPlural.toLowerCase()}`}
            className="w-4 h-4 rounded-full bg-cyan-700 dark:bg-blue-800/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] ml-0.5 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 w-64 sm:w-72 max-w-[calc(100vw-2rem)] max-h-[380px] bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 rounded-xl shadow-2xl shadow-slate-900/10 dark:shadow-black/80 z-50 flex flex-col overflow-hidden backdrop-blur-xl`}
        >
          {/* Header Search & Actions */}
          <div className="p-2.5 border-b border-slate-100 dark:border-dark-800 bg-slate-50/80 dark:bg-dark-900/90 shrink-0 space-y-2">
            {shouldShowSearch && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Search ${labelPlural.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <span>
                {selectedValues.length} of {options.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium transition-colors"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-dark-700">•</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Options Checkbox List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching {labelPlural.toLowerCase()}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs select-none ${
                      isChecked
                        ? 'bg-cyan-50 dark:bg-blue-900/30 text-cyan-900 dark:text-white font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-dark-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt.value)}
                      className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-dark-800 border-slate-300 dark:border-dark-700 text-cyan-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span
                      className={`flex-1 leading-snug truncate ${
                        badgeFontMono ? 'font-mono' : ''
                      }`}
                    >
                      {opt.label}
                    </span>
                    {opt.count !== undefined && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-800 shrink-0">
                        {opt.count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
