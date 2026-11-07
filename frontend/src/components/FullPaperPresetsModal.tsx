import React from 'react';
import { X, Award, Clock, Sparkles } from 'lucide-react';
import { MockExamPreset } from '../types';

interface FullPaperPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: MockExamPreset[];
  selectedPresetId: string | null;
  onApplyPreset: (preset: MockExamPreset) => void;
  accentClasses: {
    primary: string;
    text: string;
    bg: string;
    bgLight: string;
    border: string;
    gradient: string;
  };
}

export const FullPaperPresetsModal: React.FC<FullPaperPresetsModalProps> = ({
  isOpen,
  onClose,
  presets,
  selectedPresetId,
  onApplyPreset,
  accentClasses,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Official Pearson Edexcel IAL Presets"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${accentClasses.bgLight} ${accentClasses.text}`}>
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Official Pearson Edexcel IAL Presets
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  Full Unit Papers
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate complete unit paper simulations calibrated to official Edexcel IAL mark totals and time allocations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto">
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onApplyPreset(preset);
                  onClose();
                }}
                className={`group p-3.5 rounded-xl border text-left cursor-pointer transition-all active:scale-[0.98] ${
                  isSelected
                    ? `${accentClasses.bgLight} ${accentClasses.border} shadow-md`
                    : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-xs font-bold ${isSelected ? accentClasses.text : 'text-slate-900 dark:text-white'}`}>
                    {preset.label}
                  </span>
                  <span className="text-xs font-mono font-extrabold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 tabular-nums">
                    {preset.targetMarks}m
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2.5">
                  {preset.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {preset.durationLabel}
                  </span>
                  <span className="font-semibold text-slate-500 dark:text-slate-300">
                    {preset.tier}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Note */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Randomizes authentic questions while preserving unit topic distribution.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
