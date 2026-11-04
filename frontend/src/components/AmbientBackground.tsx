import React, { useEffect, useRef } from 'react';

export const AmbientBackground: React.FC = () => {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;

    const handlePointerMove = (e: PointerEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = `${e.clientX}px`;
        const y = `${e.clientY}px`;
        document.documentElement.style.setProperty('--global-mouse-x', x);
        document.documentElement.style.setProperty('--global-mouse-y', y);
        if (spotlightRef.current) {
          spotlightRef.current.style.setProperty('--cursor-x', x);
          spotlightRef.current.style.setProperty('--cursor-y', y);
        }
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={spotlightRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-100/70 dark:bg-transparent transition-colors"
    >
      {/* Subtle passive grid/dot matrix background */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.07)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px] opacity-45 dark:opacity-35" />

      {/* Cursor-illuminated dot/grid pattern within the active spotlight radius */}
      <div
        className="absolute inset-0 opacity-60 dark:opacity-85"
        style={{
          backgroundImage:
            'radial-gradient(rgba(var(--subject-glow-rgb, 6, 182, 212), 0.5) 1.25px, transparent 1.25px)',
          backgroundSize: '24px 24px',
          WebkitMaskImage:
            'radial-gradient(380px circle at var(--global-mouse-x, 50vw) var(--global-mouse-y, 50vh), rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)',
          maskImage:
            'radial-gradient(380px circle at var(--global-mouse-x, 50vw) var(--global-mouse-y, 50vh), rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)',
        }}
      />

      {/* Global GPU-accelerated ambient radial cursor glow */}
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          background:
            'radial-gradient(650px circle at var(--global-mouse-x, 50vw) var(--global-mouse-y, 50vh), rgba(var(--subject-glow-rgb, 6, 182, 212), 0.10), transparent 75%)',
        }}
      />
    </div>
  );
};

export default AmbientBackground;
