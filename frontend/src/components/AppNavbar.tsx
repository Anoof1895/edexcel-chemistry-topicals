import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  Atom,
  Home, 
  Compass, 
  FileText, 
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  LogIn,
  LogOut
} from 'lucide-react';
import { AppView, Subject } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface AppNavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  cartCount?: number;
  totalQuestions?: number;
  activeSubject?: Subject;
  chemCount?: number;
  physCount?: number;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  currentView,
  onNavigate,
  cartCount = 0,
  totalQuestions = 5712,
  activeSubject = 'chemistry',
  chemCount = 5712,
  physCount = 4136
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const subjectMenuRef = useRef<HTMLDivElement>(null);

  // Close subject switcher on click outside
  useEffect(() => {
    if (!isSubjectMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (subjectMenuRef.current && !subjectMenuRef.current.contains(e.target as Node)) {
        setIsSubjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSubjectMenuOpen]);

  const { theme, toggleTheme } = useTheme();
  const { user, openAuthModal, signOut } = useAuth();

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Student';

  const isPhysics = activeSubject === 'physics' || currentView.startsWith('physics');
  const topicalView: AppView = isPhysics ? 'physics-topical' : 'chemistry-topical';
  const testMakerView: AppView = isPhysics ? 'physics-test-maker' : 'chemistry-test-maker';
  const isTopicalActive = currentView === 'chemistry-topical' || currentView === 'physics-topical';
  const isTestMakerActive = currentView === 'chemistry-test-maker' || currentView === 'physics-test-maker';

  return (
    <>
      <header className="h-14 border-b border-slate-200 dark:border-dark-800 bg-white/95 dark:bg-dark-900/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-3 select-none shrink-0 z-30 relative transition-colors">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group transition-all shrink-0"
          title="Go to Home Portal"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 border border-cyan-400/30 group-hover:scale-105 transition-transform">
            {isPhysics ? (
              <Atom className="w-4 h-4 text-white" />
            ) : (
              <FlaskConical className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                Edexcel IAL Topicals
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                Hub
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              {currentView === 'home'
                ? 'Chemistry & Physics Topicals & Exam Builder'
                : isPhysics ? 'Physics Topicals & Exam Builder' : 'Chemistry Topicals & Exam Builder'}
            </span>
          </div>
        </div>

        {/* Desktop / Tablet Nav & Theme Switch (> 768px) */}
        <div className="hidden md:flex items-center gap-2">
          <nav className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-300 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'home'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-dark-800'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate(topicalView)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isTopicalActive
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-dark-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Topicals</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate(testMakerView)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                isTestMakerActive
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-dark-800'
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

          {/* Theme Toggle Button (Desktop/Tablet) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-dark-800/80 dark:hover:bg-dark-750 border border-slate-200 dark:border-dark-700/80 text-slate-700 dark:text-slate-200 transition-all active:scale-95 shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Desktop Authentication Button / User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800/90 dark:hover:bg-dark-750 border border-slate-200 dark:border-dark-700 text-xs transition-all active:scale-95 shadow-sm"
                  title={`Logged in as ${user.email}`}
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {userInitial}
                  </div>
                  <span className="max-w-[110px] truncate font-medium text-slate-800 dark:text-slate-200 hidden lg:inline">
                    {userDisplayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800 mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                          {userInitial}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Cloud Sync Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-sm shadow-cyan-600/25 active:scale-95"
                title="Sign in to sync your bookmarks and progress across devices"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Subject Switcher (> 768px) */}
        <div className="hidden md:flex items-center gap-2 relative" ref={subjectMenuRef}>
          <button
            type="button"
            onClick={() => setIsSubjectMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-dark-800/80 dark:hover:bg-dark-800 border border-slate-200 dark:border-dark-700/80 text-xs font-medium transition-all"
            title="Switch subject"
            aria-haspopup="menu"
            aria-expanded={isSubjectMenuOpen}
          >
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              currentView === 'home'
                ? 'bg-cyan-500 dark:bg-cyan-400'
                : isPhysics ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-emerald-500 dark:bg-emerald-400'
            }`}></span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              {currentView === 'home' ? 'All Subjects' : isPhysics ? 'Physics' : 'Chemistry'}
            </span>
            <span className="text-slate-500 hidden lg:inline">
              ({(currentView === 'home' ? chemCount + physCount : totalQuestions).toLocaleString()} Qs)
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${isSubjectMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSubjectMenuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 shadow-2xl p-1.5 z-50">
              {([
                { subject: 'chemistry' as Subject, label: 'Chemistry', count: chemCount, view: 'chemistry-topical' as AppView, Icon: FlaskConical, dot: 'bg-emerald-500' },
                { subject: 'physics' as Subject, label: 'Physics', count: physCount, view: 'physics-topical' as AppView, Icon: Atom, dot: 'bg-indigo-500' },
              ]).map(({ subject, label, count, view, Icon, dot }) => {
                const isActive = currentView !== 'home' && (subject === 'physics') === isPhysics;
                return (
                  <button
                    key={subject}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsSubjectMenuOpen(false);
                      onNavigate(view);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dot}`}></span>
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {count.toLocaleString()} Qs
                    </span>
                  </button>
                );
              })}
              <div className="my-1 border-t border-slate-100 dark:border-dark-800" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsSubjectMenuOpen(false);
                  onNavigate('home');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800"
              >
                <Home className="w-3.5 h-3.5" />
                Subject Portal
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Action Controls (< 768px) */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Auth Button */}
          {user ? (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm active:scale-95"
              title={`Logged in as ${user.email}`}
            >
              {userInitial}
            </button>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              className="h-10 px-3 flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs active:scale-95 transition-all shadow-sm"
              title="Sign In"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Quick Cart Pill on Mobile */}
          {cartCount > 0 && (
            <button
              type="button"
              onClick={() => handleNavClick(testMakerView)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-dark-800 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold font-mono transition-all"
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
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
            ) : (
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Sheet (< 768px) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 top-14 z-50 bg-black/60 dark:bg-black/70 backdrop-blur-md md:hidden flex flex-col justify-start animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-750 p-4 space-y-2 shadow-2xl animate-in slide-in-from-top-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Account Card in Mobile Drawer */}
            {user ? (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-dark-750 bg-slate-50 dark:bg-dark-850 flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                    {userInitial}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Cloud Sync Active
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="p-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all shadow-md shadow-cyan-600/30"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Create Account</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all ${
                currentView === 'home'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-dark-850 dark:border-dark-750 dark:text-slate-300 dark:hover:bg-dark-800'
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
              onClick={() => handleNavClick(topicalView)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all ${
                isTopicalActive
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-dark-850 dark:border-dark-750 dark:text-slate-300 dark:hover:bg-dark-800'
              }`}
            >
              <Compass className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span>Topical Explorer</span>
                <span className="text-[11px] opacity-75 font-normal">
                  {isPhysics ? 'Physics past paper questions & official mark schemes (Units 1–2)' : 'Chemistry past paper questions & official mark schemes (Units 1–6)'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick(testMakerView)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all ${
                isTestMakerActive
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-dark-850 dark:border-dark-750 dark:text-slate-300 dark:hover:bg-dark-800'
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

            {/* Theme Toggle in Mobile Drawer */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-dark-750 bg-slate-50 dark:bg-dark-850 text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 text-sm font-semibold transition-all"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-700" />
                )}
                <div className="flex flex-col text-left">
                  <span>Day / Night Theme</span>
                  <span className="text-[11px] opacity-75 font-normal">Switch to {theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 dark:bg-dark-750 text-slate-800 dark:text-slate-200">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </button>

            {/* Subject Footer Details */}
            <div className="pt-3 mt-1 border-t border-slate-200 dark:border-dark-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${isPhysics ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-emerald-500 dark:bg-emerald-400'}`}></span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {isPhysics ? 'Edexcel Physics (IAL)' : 'Edexcel Chemistry (IAL)'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-bold">
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
