import React, { useRef, useCallback } from 'react';
import { registerSpotlightTarget, unregisterSpotlightTarget } from '../utils/spotlight';

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  borderGlowColor?: string;
  enableTilt?: boolean;
  spotlightSize?: number;
  borderRadiusClassName?: string;
  children: React.ReactNode;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  spotlightColor = 'rgba(255, 255, 255, 0.06)',
  borderGlowColor = 'rgba(255, 255, 255, 0.28)',
  enableTilt = false,
  spotlightSize = 420,
  borderRadiusClassName = 'rounded-2xl',
  className = '',
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...rest
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(e);
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = cardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);
      el.style.setProperty('--spotlight-opacity', '1');
      registerSpotlightTarget(el, e.clientX, e.clientY);

      if (enableTilt && rect.width > 0 && rect.height > 0) {
        const normX = (x / rect.width - 0.5) * 2;
        const normY = (y / rect.height - 0.5) * 2;
        const tiltX = (-normY * 2.4).toFixed(2);
        const tiltY = (normX * 2.4).toFixed(2);
        el.style.setProperty('--tilt-x', `${tiltX}deg`);
        el.style.setProperty('--tilt-y', `${tiltY}deg`);
      }
    },
    [enableTilt, onPointerMove]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(e);
      const el = cardRef.current;
      if (!el) return;
      el.style.setProperty('--spotlight-opacity', '0');
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
      unregisterSpotlightTarget(el);
    },
    [onPointerLeave]
  );

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          '--mouse-x': '-999px',
          '--mouse-y': '-999px',
          '--spotlight-opacity': '0',
          '--tilt-x': '0deg',
          '--tilt-y': '0deg',
          '--spotlight-color': spotlightColor,
          '--border-glow-color': borderGlowColor,
          transform: enableTilt
            ? 'perspective(1100px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))'
            : undefined,
          transition: enableTilt
            ? 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), border-color 260ms ease, box-shadow 260ms ease'
            : 'border-color 260ms ease, box-shadow 260ms ease',
          willChange: enableTilt ? 'transform' : undefined,
          ...style,
        } as React.CSSProperties
      }
      className={`group relative overflow-hidden ${borderRadiusClassName} bg-zinc-900/55 backdrop-blur-xl border border-white/[0.07] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.1)] ${className}`}
      {...rest}
    >
      {/* Dynamic Radial Surface Spotlight */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-0 ${borderRadiusClassName} transition-opacity duration-300`}
        style={{
          opacity: 'var(--spotlight-opacity, 0)',
          background: `radial-gradient(${spotlightSize}px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), var(--spotlight-color), transparent 45%)`,
        }}
      />

      {/* Dynamic 1px Illuminated Border Mask */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 ${borderRadiusClassName} transition-opacity duration-300`}
        style={{
          opacity: 'var(--spotlight-opacity, 0)',
          padding: '1px',
          background: `radial-gradient(${Math.round(
            spotlightSize * 0.72
          )}px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), var(--border-glow-color), transparent 45%)`,
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
  );
};
