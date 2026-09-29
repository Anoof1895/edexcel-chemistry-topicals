import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  X
} from 'lucide-react';

interface SubtopicHierarchy {
  topicName: string;
  subtopics: {
    name: string;
    count: number;
  }[];
}

interface SubtopicMultiSelectProps {
  hierarchy: SubtopicHierarchy[];
  selectedSubtopics: string[];
  onChange: (selected: string[]) => void;
}

export const SubtopicMultiSelect: React.FC<SubtopicMultiSelectProps> = ({
  hierarchy,
  selectedSubtopics,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(new Set());
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

  const toggleTopicCollapse = (topicName: string) => {
    setCollapsedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicName)) next.delete(topicName);
      else next.add(topicName);
      return next;
    });
  };

  const handleToggleSubtopic = (subtopic: string) => {
    if (selectedSubtopics.includes(subtopic)) {
      onChange(selectedSubtopics.filter(s => s !== subtopic));
    } else {
      onChange([...selectedSubtopics, subtopic]);
    }
  };

  const handleSelectAllInTopic = (subtopicNames: string[]) => {
    const allSelected = subtopicNames.every(s => selectedSubtopics.includes(s));
    if (allSelected) {
      // Deselect these
      onChange(selectedSubtopics.filter(s => !subtopicNames.includes(s)));
    } else {
      // Add all missing
      const newItems = subtopicNames.filter(s => !selectedSubtopics.includes(s));
      onChange([...selectedSubtopics, ...newItems]);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Filter hierarchy by search term
  const filteredHierarchy = useMemo(() => {
    if (!search.trim()) return hierarchy;
    const q = search.toLowerCase();

    return hierarchy
      .map(group => {
        const matchingSubtopics = group.subtopics.filter(
          s => s.name.toLowerCase().includes(q) || group.topicName.toLowerCase().includes(q)
        );
        return {
          ...group,
          subtopics: matchingSubtopics
        };
      })
      .filter(group => group.subtopics.length > 0);
  }, [hierarchy, search]);

  const totalAvailable = useMemo(() => {
    return hierarchy.reduce((sum, g) => sum + g.subtopics.length, 0);
  }, [hierarchy]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all select-none ${
          selectedSubtopics.length > 0
            ? 'bg-cyan-50 dark:bg-blue-950/60 border-cyan-400 dark:border-blue-500/50 text-cyan-800 dark:text-blue-200 hover:border-cyan-500 dark:hover:border-blue-400'
            : 'bg-slate-100 dark:bg-dark-800/80 border-slate-200 dark:border-dark-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-dark-600'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-blue-400 shrink-0" />
        <span className="truncate max-w-[150px] sm:max-w-[200px]">
          {selectedSubtopics.length === 0 ? (
            'All Subtopics'
          ) : selectedSubtopics.length === 1 ? (
            selectedSubtopics[0]
          ) : (
            `${selectedSubtopics.length} Subtopics Selected`
          )}
        </span>

        {selectedSubtopics.length > 0 && (
          <span 
            onClick={handleClearAll}
            title="Clear subtopics"
            className="w-4 h-4 rounded-full bg-cyan-700 dark:bg-blue-800/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] ml-1 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] max-h-[480px] bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 rounded-xl shadow-2xl shadow-slate-900/10 dark:shadow-black/80 z-50 flex flex-col overflow-hidden backdrop-blur-xl">
          {/* Header Search */}
          <div className="p-2.5 border-b border-slate-100 dark:border-dark-800 bg-slate-50/80 dark:bg-dark-900/90 shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search official subtopics..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <span>
                {selectedSubtopics.length} of {totalAvailable} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all = hierarchy.flatMap(g => g.subtopics.map(s => s.name));
                    onChange(all);
                  }}
                  className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-dark-700">•</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Subtopic Accordion Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-dark-800/40">
            {filteredHierarchy.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching subtopics found
              </div>
            ) : (
              filteredHierarchy.map(group => {
                const isCollapsed = collapsedTopics.has(group.topicName);
                const groupSubNames = group.subtopics.map(s => s.name);
                const selectedInGroup = groupSubNames.filter(s => selectedSubtopics.includes(s)).length;
                const allInGroupSelected = groupSubNames.length > 0 && selectedInGroup === groupSubNames.length;

                return (
                  <div key={group.topicName} className="pt-1.5 first:pt-0">
                    {/* Collapsible Main Topic Header */}
                    <div 
                      onClick={() => toggleTopicCollapse(group.topicName)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800/60 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 group select-none"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                        )}
                        <span className="truncate text-slate-800 dark:text-slate-200 text-xs">{group.topicName}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {selectedInGroup > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-blue-500/20 text-cyan-700 dark:text-blue-300 border border-cyan-200 dark:border-blue-500/30 text-[10px] font-mono">
                            {selectedInGroup}/{groupSubNames.length}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAllInTopic(groupSubNames);
                          }}
                          className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                        >
                          {allInGroupSelected ? 'Deselect' : 'All'}
                        </button>
                      </div>
                    </div>

                    {/* Subtopics Under Group */}
                    {!isCollapsed && (
                      <div className="mt-1 ml-4 pl-2 border-l border-slate-200 dark:border-dark-800 space-y-1 py-1">
                        {group.subtopics.map(sub => {
                          const isChecked = selectedSubtopics.includes(sub.name);
                          return (
                            <label
                              key={sub.name}
                              className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs select-none ${
                                isChecked
                                  ? 'bg-cyan-50 dark:bg-blue-900/30 text-cyan-900 dark:text-white font-medium'
                                  : 'hover:bg-slate-100 dark:hover:bg-dark-800/40 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSubtopic(sub.name)}
                                  className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-dark-800 border-slate-300 dark:border-dark-700 text-cyan-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                              </div>
                              <span className="flex-1 leading-snug">{sub.name}</span>
                              {sub.count > 0 && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono px-1 rounded bg-slate-100 dark:bg-dark-800 shrink-0">
                                  {sub.count}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtopicMultiSelect;
