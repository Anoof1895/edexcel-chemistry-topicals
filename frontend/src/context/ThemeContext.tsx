import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Subject } from '../types';

export type Theme = 'dark' | 'light';

export interface SubjectThemeToken {
  subject: Subject;
  name: string;
  accent: string;
  accentRgb: string;
}

export const SUBJECT_THEME_TOKENS: Record<Subject, SubjectThemeToken> = {
  chemistry: {
    subject: 'chemistry',
    name: 'Chemistry',
    accent: '#06B6D4',
    accentRgb: '6, 182, 212',
  },
  physics: {
    subject: 'physics',
    name: 'Physics',
    accent: '#6366F1',
    accentRgb: '99, 102, 241',
  },
  mathematics: {
    subject: 'mathematics',
    name: 'Mathematics',
    accent: '#F59E0B',
    accentRgb: '245, 158, 11',
  },
};

export function applySubjectThemeVariables(subject: Subject): SubjectThemeToken {
  const token = SUBJECT_THEME_TOKENS[subject] || SUBJECT_THEME_TOKENS.chemistry;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--subject-accent', token.accent);
    root.style.setProperty('--subject-accent-rgb', token.accentRgb);
    root.style.setProperty('--subject-glow-rgb', token.accentRgb);
    root.setAttribute('data-subject', token.subject);
  }
  return token;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  activeSubject: Subject;
  subjectTheme: SubjectThemeToken;
  setSubjectTheme: (subject: Subject) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [activeSubject, setActiveSubjectState] = useState<Subject>(() => {
    try {
      const saved = localStorage.getItem('edexcel_active_subject');
      if (saved === 'chemistry' || saved === 'physics' || saved === 'mathematics') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'chemistry';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    applySubjectThemeVariables(activeSubject);
    try {
      localStorage.setItem('edexcel_active_subject', activeSubject);
    } catch {
      // ignore
    }
  }, [activeSubject]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setSubjectTheme = useCallback((subject: Subject) => {
    setActiveSubjectState(subject);
    applySubjectThemeVariables(subject);
  }, []);

  const subjectTheme = SUBJECT_THEME_TOKENS[activeSubject] || SUBJECT_THEME_TOKENS.chemistry;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        activeSubject,
        subjectTheme,
        setSubjectTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
