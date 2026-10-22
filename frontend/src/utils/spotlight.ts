import type React from 'react';

export interface SpotlightPreset {
  spotlightColor: string;
  borderGlowColor: string;
  ambientGlowColor: string;
}

export const SUBJECT_SPOTLIGHT_PRESETS: Record<string, SpotlightPreset> = {
  chemistry: {
    spotlightColor: 'rgba(6, 182, 212, 0.12)',
    borderGlowColor: 'rgba(34, 211, 238, 0.45)',
    ambientGlowColor: 'rgba(6, 182, 212, 0.09)',
  },
  physics: {
    spotlightColor: 'rgba(99, 102, 241, 0.12)',
    borderGlowColor: 'rgba(129, 140, 248, 0.45)',
    ambientGlowColor: 'rgba(99, 102, 241, 0.09)',
  },
  mathematics: {
    spotlightColor: 'rgba(245, 158, 11, 0.12)',
    borderGlowColor: 'rgba(251, 191, 36, 0.45)',
    ambientGlowColor: 'rgba(245, 158, 11, 0.09)',
  },
  math: {
    spotlightColor: 'rgba(245, 158, 11, 0.12)',
    borderGlowColor: 'rgba(251, 191, 36, 0.45)',
    ambientGlowColor: 'rgba(245, 158, 11, 0.09)',
  },
  cyan: {
    spotlightColor: 'rgba(6, 182, 212, 0.12)',
    borderGlowColor: 'rgba(34, 211, 238, 0.45)',
    ambientGlowColor: 'rgba(6, 182, 212, 0.09)',
  },
  indigo: {
    spotlightColor: 'rgba(99, 102, 241, 0.12)',
    borderGlowColor: 'rgba(129, 140, 248, 0.45)',
    ambientGlowColor: 'rgba(99, 102, 241, 0.09)',
  },
  amber: {
    spotlightColor: 'rgba(245, 158, 11, 0.12)',
    borderGlowColor: 'rgba(251, 191, 36, 0.45)',
    ambientGlowColor: 'rgba(245, 158, 11, 0.09)',
  },
};

export function getSubjectSpotlightPreset(key?: string): SpotlightPreset {
  const normalized = (key || 'chemistry').toLowerCase();
  return SUBJECT_SPOTLIGHT_PRESETS[normalized] || SUBJECT_SPOTLIGHT_PRESETS.chemistry;
}

export function getSubjectSpotlightStyle(
  key?: string,
  spotlightSize?: number
): React.CSSProperties {
  const preset = getSubjectSpotlightPreset(key);
  const style: Record<string, string> = {
    '--spotlight-color': preset.spotlightColor,
    '--border-glow-color': preset.borderGlowColor,
  };
  if (spotlightSize) {
    style['--spotlight-size'] = `${spotlightSize}px`;
  }
  return style as React.CSSProperties;
}

// Module-level passive scroll sync so stationary cursors during scroll stay locked to the hovered element
let lastClientX = -999;
let lastClientY = -999;
const activeTargets = new Set<HTMLElement>();
let scrollListenerAttached = false;

function ensureScrollSyncListener() {
  if (scrollListenerAttached || typeof window === 'undefined') return;
  scrollListenerAttached = true;

  window.addEventListener(
    'scroll',
    () => {
      if (activeTargets.size === 0 || lastClientX < 0 || lastClientY < 0) return;
      activeTargets.forEach((el) => {
        if (!el.isConnected) {
          activeTargets.delete(el);
          return;
        }
        const rect = el.getBoundingClientRect();
        const x = lastClientX - rect.left;
        const y = lastClientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
      });
    },
    { capture: true, passive: true }
  );
}

export function registerSpotlightTarget(el: HTMLElement, clientX: number, clientY: number) {
  ensureScrollSyncListener();
  lastClientX = clientX;
  lastClientY = clientY;
  activeTargets.add(el);
}

export function unregisterSpotlightTarget(el: HTMLElement) {
  activeTargets.delete(el);
}

/**
 * Lightweight zero-rerender pointer move handler for `.spotlight-surface` elements.
 * Mutates `--mouse-x` and `--mouse-y` directly on the target element's style.
 */
export function handleSpotlightMove(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  el.style.setProperty('--mouse-x', `${x}px`);
  el.style.setProperty('--mouse-y', `${y}px`);
  registerSpotlightTarget(el, e.clientX, e.clientY);
}

export function handleSpotlightLeave(e: React.PointerEvent<HTMLElement>) {
  unregisterSpotlightTarget(e.currentTarget);
}
