import { useEffect } from 'react';
import { QuestionItem } from '../types';
import { resolveQuestionImageUrl, resolveMarkSchemeImageUrl } from '../utils/imageUrl';

// Global cache of prefetched image URLs to prevent duplicate network downloads
const prefetchedUrlCache = new Set<string>();

export interface PrefetchOptions {
  backward?: number; // default: 2
  forward?: number;  // default: 5
  enabled?: boolean;
}

/**
 * Adaptive background prefetching hook.
 * Pre-warms browser cache for adjacent question and mark scheme crops
 * in a sliding window (default: 2 backward, 5 forward) using low-priority async downloads.
 */
export function usePrefetchQuestions(
  questions: QuestionItem[] | undefined | null,
  currentIndex: number,
  activeSubject?: string,
  options?: PrefetchOptions
): void {
  const backward = options?.backward ?? 2;
  const forward = options?.forward ?? 5;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (
      !enabled ||
      !questions ||
      questions.length === 0 ||
      currentIndex < 0 ||
      typeof window === 'undefined'
    ) {
      return;
    }

    // Sliding Window: 2 questions backward, 5 questions forward
    const startIdx = Math.max(0, currentIndex - backward);
    const endIdx = Math.min(questions.length - 1, currentIndex + forward);

    const urlsToPrefetch: string[] = [];

    // Helper to queue an un-cached URL
    const queueUrl = (url: string | null | undefined) => {
      if (url && !prefetchedUrlCache.has(url)) {
        prefetchedUrlCache.add(url);
        urlsToPrefetch.push(url);
      }
    };

    // Forward questions first (users typically browse forward)
    for (let i = currentIndex + 1; i <= endIdx; i++) {
      const q = questions[i];
      if (q) {
        queueUrl(resolveQuestionImageUrl(q, activeSubject));
        queueUrl(resolveMarkSchemeImageUrl(q, activeSubject));
      }
    }

    // Backward questions next
    for (let i = currentIndex - 1; i >= startIdx; i--) {
      const q = questions[i];
      if (q) {
        queueUrl(resolveQuestionImageUrl(q, activeSubject));
        queueUrl(resolveMarkSchemeImageUrl(q, activeSubject));
      }
    }

    if (urlsToPrefetch.length === 0) return;

    // Use requestIdleCallback or cooperative timer so prefetching never competes with active view
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | null = null;
    let timerId: number | null = null;

    const performPrefetch = () => {
      urlsToPrefetch.forEach((url) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          // Use low fetchPriority so the active question's high-priority download isn't choked
          (img as any).fetchPriority = 'low';
          img.decoding = 'async';
          img.src = url;
        } catch {
          // Failures in speculative prefetching are non-critical
        }
      });
    };

    if (typeof win.requestIdleCallback === 'function') {
      idleId = win.requestIdleCallback(performPrefetch, { timeout: 2000 });
    } else {
      timerId = window.setTimeout(performPrefetch, 120);
    }

    return () => {
      if (idleId !== null && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [questions, currentIndex, activeSubject, backward, forward, enabled]);
}

export default usePrefetchQuestions;
