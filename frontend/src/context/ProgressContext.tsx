import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { MasteryStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ProgressContextType {
  bookmarks: Set<string>;
  questionStatuses: Record<string, MasteryStatus>;
  userAnswers: Record<string, string>;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  toggleBookmark: (id: string) => void;
  setQuestionStatus: (id: string, status: MasteryStatus) => void;
  cycleQuestionStatus: (id: string) => void;
  setMcqAnswer: (id: string, selectedOption: string, isCorrect?: boolean) => void;
  clearProgress: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  BOOKMARKS: 'chem_bookmarks',
  STATUSES: 'chem_question_status',
  ANSWERS: 'chem_user_answers',
};

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // 1. Initial State from localStorage (Guest Cache)
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.BOOKMARKS);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [questionStatuses, setQuestionStatuses] = useState<Record<string, MasteryStatus>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.STATUSES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ANSWERS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Use refs to avoid closure stale state in async operations
  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;

  const statusesRef = useRef(questionStatuses);
  statusesRef.current = questionStatuses;

  const answersRef = useRef(userAnswers);
  answersRef.current = userAnswers;

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.BOOKMARKS, JSON.stringify(Array.from(bookmarks)));
    } catch (e) {
      console.warn('Failed to save bookmarks to localStorage', e);
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.STATUSES, JSON.stringify(questionStatuses));
    } catch (e) {
      console.warn('Failed to save statuses to localStorage', e);
    }
  }, [questionStatuses]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWERS, JSON.stringify(userAnswers));
    } catch (e) {
      console.warn('Failed to save user answers to localStorage', e);
    }
  }, [userAnswers]);

  const userId = user?.id ?? null;

  // Helper to upsert a single item to Supabase in the background
  const upsertCloudRecord = useCallback(
    async (questionId: string, updates: { is_bookmarked?: boolean; status?: string; user_answer?: string | null }) => {
      if (!userId || !isSupabaseConfigured) return;

      const currentIsBookmarked = updates.is_bookmarked !== undefined 
        ? updates.is_bookmarked 
        : bookmarksRef.current.has(questionId);

      const currentStatus = updates.status !== undefined 
        ? updates.status 
        : (statusesRef.current[questionId] || 'unattempted');

      const currentAnswer = updates.user_answer !== undefined 
        ? updates.user_answer 
        : (answersRef.current[questionId] || null);

      const record = {
        user_id: userId,
        question_id: questionId,
        status: currentStatus,
        is_bookmarked: currentIsBookmarked,
        user_answer: currentAnswer,
        updated_at: new Date().toISOString(),
      };

      try {
        const { error } = await supabase
          .from('user_progress')
          .upsert(record, { onConflict: 'user_id,question_id' });

        if (error) {
          console.warn('[CloudSync] Upsert error for', questionId, error.message);
        }
      } catch (err: any) {
        console.warn('[CloudSync] Network error on upsert:', err);
      }
    },
    [userId]
  );

  const clearProgress = useCallback(() => {
    setBookmarks(new Set());
    setQuestionStatuses({});
    setUserAnswers({});
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.BOOKMARKS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.STATUSES);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ANSWERS);
    } catch (e) {
      console.warn('Failed to clear localStorage', e);
    }
  }, []);

  // Clear progress on user sign out to prevent cross-account progress leakage
  const prevUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevUserRef.current && !userId) {
      clearProgress();
    }
    prevUserRef.current = userId;
  }, [userId, clearProgress]);

  // 2. Cloud Sync & Account Migration on User Login
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const syncWithCloud = async () => {
      setIsSyncing(true);
      try {
        // Fetch remote records from Supabase
        const { data: remoteRows, error: fetchErr } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId);

        if (fetchErr) {
          console.warn('[CloudSync] Could not fetch remote progress:', fetchErr.message);
          if (isMounted) setIsSyncing(false);
          return;
        }

        const remoteMap = new Map<string, any>();
        (remoteRows || []).forEach((row: any) => {
          remoteMap.set(row.question_id, row);
        });

        // Current local offline state
        const localBookmarksArr = Array.from(bookmarksRef.current);
        const localStatusesObj = { ...statusesRef.current };
        const localAnswersObj = { ...answersRef.current };

        const allQIds = new Set<string>([
          ...localBookmarksArr,
          ...Object.keys(localStatusesObj),
          ...Object.keys(localAnswersObj),
          ...Array.from(remoteMap.keys()),
        ]);

        const mergedBookmarks = new Set<string>();
        const mergedStatuses: Record<string, MasteryStatus> = {};
        const mergedAnswers: Record<string, string> = {};
        const recordsToMigrate: any[] = [];

        allQIds.forEach((qId) => {
          const remote = remoteMap.get(qId);
          const hasLocalBookmark = bookmarksRef.current.has(qId);
          const localStatus = localStatusesObj[qId];
          const localAnswer = localAnswersObj[qId];

          const isBookmarked = hasLocalBookmark || Boolean(remote?.is_bookmarked);
          const status = (localStatus && localStatus !== 'unattempted')
            ? localStatus
            : ((remote?.status as MasteryStatus) || 'unattempted');
          const answer = localAnswer || remote?.user_answer || null;

          if (isBookmarked) mergedBookmarks.add(qId);
          if (status !== 'unattempted') mergedStatuses[qId] = status;
          if (answer) mergedAnswers[qId] = answer;

          // Check if local guest data had changes not reflected in cloud
          const isRemoteDifferent =
            !remote ||
            (hasLocalBookmark && !remote.is_bookmarked) ||
            (localStatus && localStatus !== 'unattempted' && localStatus !== remote.status) ||
            (localAnswer && localAnswer !== remote.user_answer);

          if (isRemoteDifferent) {
            recordsToMigrate.push({
              user_id: userId,
              question_id: qId,
              status,
              is_bookmarked: isBookmarked,
              user_answer: answer,
              updated_at: new Date().toISOString(),
            });
          }
        });

        // Batch upsert unsynced guest progress to cloud
        if (recordsToMigrate.length > 0) {
          for (let i = 0; i < recordsToMigrate.length; i += 50) {
            const batch = recordsToMigrate.slice(i, i + 50);
            const { error: batchErr } = await supabase
              .from('user_progress')
              .upsert(batch, { onConflict: 'user_id,question_id' });

            if (batchErr) {
              console.warn('[CloudSync] Batch migration error:', batchErr.message);
            }
          }
        }

        if (isMounted) {
          setBookmarks(mergedBookmarks);
          setQuestionStatuses(mergedStatuses);
          setUserAnswers(mergedAnswers);
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        console.warn('[CloudSync] Sync exception:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    syncWithCloud();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Actions (all side-effect network calls strictly outside React state updaters)
  const toggleBookmark = useCallback(
    (id: string) => {
      const next = new Set(bookmarksRef.current);
      const nextState = !next.has(id);
      if (nextState) {
        next.add(id);
      } else {
        next.delete(id);
      }
      bookmarksRef.current = next;
      setBookmarks(next);
      upsertCloudRecord(id, { is_bookmarked: nextState });
    },
    [upsertCloudRecord]
  );

  const setQuestionStatus = useCallback(
    (id: string, status: MasteryStatus) => {
      const next = { ...statusesRef.current };
      if (status === 'unattempted') {
        delete next[id];
      } else {
        next[id] = status;
      }
      statusesRef.current = next;
      setQuestionStatuses(next);
      upsertCloudRecord(id, { status });
    },
    [upsertCloudRecord]
  );

  const cycleQuestionStatus = useCallback(
    (id: string) => {
      const current = statusesRef.current[id] || 'unattempted';
      let nextStatus: MasteryStatus = 'unattempted';
      if (current === 'unattempted') nextStatus = 'review';
      else if (current === 'review' || current === 'incorrect') nextStatus = 'mastered';
      else nextStatus = 'unattempted';

      const next = { ...statusesRef.current };
      if (nextStatus === 'unattempted') {
        delete next[id];
      } else {
        next[id] = nextStatus;
      }
      statusesRef.current = next;
      setQuestionStatuses(next);
      upsertCloudRecord(id, { status: nextStatus });
    },
    [upsertCloudRecord]
  );

  const setMcqAnswer = useCallback(
    (id: string, selectedOption: string, isCorrect?: boolean) => {
      const trimmed = selectedOption.trim();
      if (!trimmed) {
        // Reset MCQ choice and status back to 'unattempted' both locally and in Supabase
        const nextAnswers = { ...answersRef.current };
        delete nextAnswers[id];
        answersRef.current = nextAnswers;
        setUserAnswers(nextAnswers);

        const nextStatuses = { ...statusesRef.current };
        delete nextStatuses[id];
        statusesRef.current = nextStatuses;
        setQuestionStatuses(nextStatuses);

        upsertCloudRecord(id, {
          user_answer: null,
          status: 'unattempted',
        });
        return;
      }

      const nextAnswers = { ...answersRef.current, [id]: trimmed };
      answersRef.current = nextAnswers;
      setUserAnswers(nextAnswers);

      let newStatus: MasteryStatus | undefined = undefined;
      if (isCorrect !== undefined) {
        newStatus = isCorrect ? 'correct' : 'incorrect';
        const nextStatuses = { ...statusesRef.current, [id]: newStatus };
        statusesRef.current = nextStatuses;
        setQuestionStatuses(nextStatuses);
      }

      upsertCloudRecord(id, {
        user_answer: trimmed,
        status: newStatus,
      });
    },
    [upsertCloudRecord]
  );

  return (
    <ProgressContext.Provider
      value={{
        bookmarks,
        questionStatuses,
        userAnswers,
        isSyncing,
        lastSyncedAt,
        toggleBookmark,
        setQuestionStatus,
        cycleQuestionStatus,
        setMcqAnswer,
        clearProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = (): ProgressContextType => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};
