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

  // Helper to upsert a single item to Supabase in the background
  const upsertCloudRecord = useCallback(
    async (questionId: string, updates: { is_bookmarked?: boolean; status?: string; user_answer?: string | null }) => {
      if (!user || !isSupabaseConfigured) return;

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
        user_id: user.id,
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
    [user]
  );

  // 2. Cloud Sync & Account Migration on User Login
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
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
          .eq('user_id', user.id);

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
              user_id: user.id,
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
  }, [user]);

  // Actions
  const toggleBookmark = useCallback(
    (id: string) => {
      setBookmarks((prev) => {
        const next = new Set(prev);
        const nextState = !next.has(id);
        if (nextState) {
          next.add(id);
        } else {
          next.delete(id);
        }
        upsertCloudRecord(id, { is_bookmarked: nextState });
        return next;
      });
    },
    [upsertCloudRecord]
  );

  const setQuestionStatus = useCallback(
    (id: string, status: MasteryStatus) => {
      setQuestionStatuses((prev) => ({
        ...prev,
        [id]: status,
      }));
      upsertCloudRecord(id, { status });
    },
    [upsertCloudRecord]
  );

  const cycleQuestionStatus = useCallback(
    (id: string) => {
      setQuestionStatuses((prev) => {
        const current = prev[id] || 'unattempted';
        let next: MasteryStatus = 'unattempted';
        if (current === 'unattempted') next = 'review';
        else if (current === 'review' || current === 'incorrect') next = 'mastered';
        else next = 'unattempted';

        upsertCloudRecord(id, { status: next });
        return {
          ...prev,
          [id]: next,
        };
      });
    },
    [upsertCloudRecord]
  );

  const setMcqAnswer = useCallback(
    (id: string, selectedOption: string, isCorrect?: boolean) => {
      setUserAnswers((prev) => ({
        ...prev,
        [id]: selectedOption,
      }));

      let newStatus: MasteryStatus | undefined = undefined;
      if (isCorrect !== undefined) {
        newStatus = isCorrect ? 'correct' : 'incorrect';
        setQuestionStatuses((prev) => ({
          ...prev,
          [id]: newStatus!,
        }));
      }

      upsertCloudRecord(id, {
        user_answer: selectedOption,
        status: newStatus,
      });
    },
    [upsertCloudRecord]
  );

  const clearProgress = useCallback(() => {
    setBookmarks(new Set());
    setQuestionStatuses({});
    setUserAnswers({});
    localStorage.removeItem(LOCAL_STORAGE_KEYS.BOOKMARKS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.STATUSES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ANSWERS);
  }, []);

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
