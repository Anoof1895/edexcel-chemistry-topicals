import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileQuestion,
  Maximize2,
  X
} from 'lucide-react';
import { getFullImageUrl } from '../utils/imageUrl';

interface ImageCanvasProps {
  src: string | null;
  title: string;
  badgeText?: string;
  badgeColor?: 'cyan' | 'emerald' | 'indigo' | 'amber' | 'purple';
  extraBadge?: React.ReactNode;
  placeholderTitle?: string;
  placeholderMessage?: string;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  src,
  title,
  badgeText,
  badgeColor = 'cyan',
  extraBadge,
  placeholderTitle = 'No image available',
  placeholderMessage = 'Mark scheme for this question is not available in the sample paper.'
}) => {
  const [zoom, setZoom] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1.2);
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedSrc = getFullImageUrl(src);

  useEffect(() => {
    setHasError(false);
    setZoom(1);
  }, [src]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const getBadgeClass = () => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'indigo':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'purple':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full min-h-[300px] bg-dark-950/60 overflow-hidden border-r border-dark-800 last:border-r-0">
      {/* Canvas Header */}
      <div className="h-11 px-3 sm:px-4 border-b border-dark-800 bg-dark-900/60 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden flex-wrap sm:flex-nowrap">
          <span className="text-xs font-semibold text-slate-200 truncate">{title}</span>
          {badgeText && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${getBadgeClass()}`}>
              {badgeText}
            </span>
          )}
          {extraBadge}
        </div>

        {/* Zoom & Lightbox Controls */}
        {src && !hasError && (
          <div className="flex items-center gap-0.5 sm:gap-1 bg-dark-800/80 rounded-lg p-0.5 border border-dark-750 shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom out"
              className="p-1 sm:p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1 select-none min-w-[2.5rem] sm:min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom in"
              className="p-1 sm:p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-dark-700 mx-0.5" />
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="p-1 sm:p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-dark-700 mx-0.5" />
            <button
              type="button"
              onClick={() => {
                setLightboxZoom(1.2);
                setIsLightboxOpen(true);
              }}
              title="Full-screen Lightbox (inspect intricate mechanisms & graphs)"
              className="p-1 sm:p-1.5 rounded hover:bg-dark-700 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Canvas Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-auto p-2 sm:p-4 flex items-start justify-center bg-dark-950/40 relative"
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      >
        {!src || hasError ? (
          <div className="m-auto flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-dark-850 border border-dark-750 flex items-center justify-center text-slate-500 mb-3">
              <FileQuestion className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300 mb-1">{placeholderTitle}</h4>
            <p className="text-xs text-slate-500">{placeholderMessage}</p>
          </div>
        ) : (
          <div className="w-full max-w-full flex items-start justify-center">
            <div 
              className="max-w-full transition-transform duration-100 ease-out origin-top shadow-xl rounded-lg overflow-hidden border border-slate-700/50 bg-white cursor-pointer"
              style={{ transform: `scale(${zoom})` }}
              onClick={() => {
                if (zoom === 1) {
                  setLightboxZoom(1.2);
                  setIsLightboxOpen(true);
                }
              }}
              title="Click or tap to inspect in full-screen lightbox"
            >
              <img
                src={resolvedSrc}
                alt={title}
                onError={() => setHasError(true)}
                className="w-full max-w-full h-auto object-contain block select-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Lightbox Modal */}
      {isLightboxOpen && src && !hasError && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col animate-in fade-in duration-150"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Header */}
          <div 
            className="h-14 px-4 sm:px-6 border-b border-dark-800 bg-dark-900/90 flex items-center justify-between shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
              <span className="text-sm font-bold text-white truncate">{title}</span>
              {badgeText && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${getBadgeClass()}`}>
                  {badgeText}
                </span>
              )}
              <span className="text-xs text-slate-400 hidden sm:inline">• High-Resolution View</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Lightbox Zoom Controls */}
              <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1 border border-dark-750">
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.max(prev - 0.25, 0.5))}
                  title="Zoom Out"
                  className="p-1.5 rounded hover:bg-dark-700 text-slate-300"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-300 px-1.5 min-w-[3rem] text-center">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.min(prev + 0.25, 3.5))}
                  title="Zoom In"
                  className="p-1.5 rounded hover:bg-dark-700 text-slate-300"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(1)}
                  title="Reset 100%"
                  className="p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-slate-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Close Button (44px target) */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="w-10 h-10 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                title="Close lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Container */}
          <div 
            className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center cursor-zoom-out"
            onClick={() => setIsLightboxOpen(false)}
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl p-2 max-w-5xl transition-transform duration-100 ease-out origin-center cursor-default"
              style={{ transform: `scale(${lightboxZoom})` }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={resolvedSrc}
                alt={title}
                className="w-full max-w-full h-auto object-contain block select-none rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCanvas;
