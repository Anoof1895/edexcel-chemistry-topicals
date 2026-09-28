import React, { useState } from 'react';
import { 
  FlaskConical, 
  Home, 
  Compass, 
  FileText, 
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { AppView } from '../types';

interface AppNavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  cartCount?: number;
  totalQuestions?: number;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  currentView,
  onNavigate,
  cartCount = 0,
  totalQuestions = 5712
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="h-14 border-b border-dark-800 bg-dark-900/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-3 select-none shrink-0 z-30 relative">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group transition-all shrink-0"
          title="Go to Home Portal"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 border border-cyan-400/30 group-hover:scale-105 transition-transform">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                Edexcel Hub
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                IAL
              </span>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Chemistry Topicals & Exam Builder
            </span>
          </div>
        </div>

        {/* Desktop / Tablet Nav (> 768px) */}
        <nav className="hidden md:flex items-center gap-1.5 bg-dark-855 p-1 rounded-xl border border-dark-750">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'home'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Portal</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('chemistry-topical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'chemistry-topical'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Topicals</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('chemistry-test-maker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
              currentView === 'chemistry-test-maker'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Test Maker</span>
            {cartCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-dark-950 animate-pulse-subtle">
                {cartCount}
              </span>
            )}
          </button>
        </nav>

        {/* Desktop Active Subject Pill (> 768px) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/80 hover:bg-dark-800 border border-dark-700/80 text-xs font-medium transition-all group"
            title="Chemistry Specification"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-200 font-semibold">Chemistry</span>
            <span className="text-slate-500 hidden lg:inline">({totalQuestions.toLocaleString()} Qs)</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile Action Controls (< 768px) */}
        <div className="flex md:hidden items-center gap-2">
          {/* Quick Cart Pill on Mobile */}
          {cartCount > 0 && (
            <button
              type="button"
              onClick={() => handleNavClick('chemistry-test-maker')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-800 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{cartCount}</span>
            </button>
          )}

          {/* Hamburger Menu Toggle Button (44px min target) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-200 active:scale-95 transition-all"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-cyan-400" />
            ) : (
              <Menu className="w-5 h-5 text-slate-200" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Sheet (< 768px) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 top-14 z-50 bg-black/70 backdrop-blur-md md:hidden flex flex-col justify-start animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="bg-dark-900 border-b border-dark-750 p-4 space-y-2 shadow-2xl animate-in slide-in-from-top-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all ${
                currentView === 'home'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                  : 'bg-dark-850 border-dark-750 text-slate-300 hover:bg-dark-800'
              }`}
            >
              <Home className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span>Portal Dashboard</span>
                <span className="text-[11px] opacity-75 font-normal">Specification overview & quick navigation</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('chemistry-topical')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all ${
                currentView === 'chemistry-topical'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                  : 'bg-dark-850 border-dark-750 text-slate-300 hover:bg-dark-800'
              }`}
            >
              <Compass className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span>Topical Explorer</span>
                <span className="text-[11px] opacity-75 font-normal">Past paper questions & official mark schemes (Units 1–6)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('chemistry-test-maker')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all ${
                currentView === 'chemistry-test-maker'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                  : 'bg-dark-850 border-dark-750 text-slate-300 hover:bg-dark-800'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <FileText className="w-5 h-5" />
                <div className="flex flex-col">
                  <span>Test Maker</span>
                  <span className="text-[11px] opacity-75 font-normal">Custom mock exams & worksheet builder</span>
                </div>
              </div>
              {cartCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400 text-dark-950">
                  {cartCount} added
                </span>
              )}
            </button>

            {/* Subject Footer Details */}
            <div className="pt-3 mt-1 border-t border-dark-800 flex items-center justify-between text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-slate-200">Edexcel Chemistry (IAL)</span>
              </div>
              <span className="font-mono text-[11px] text-cyan-400 font-bold">
                {totalQuestions.toLocaleString()} Questions
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppNavbar;
