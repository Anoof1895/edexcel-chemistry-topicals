import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileQuestion,
  Maximize2,
  X,
  Pencil,
  PenLine,
  Highlighter,
  Eraser,
  Trash2,
  Type,
  Undo2
} from 'lucide-react';
import { getFullImageUrl, getLocalImageUrl } from '../utils/imageUrl';

// Module-scoped in-memory cache for annotations across view mode toggles / remounts
// Kept purely in RAM; zero localStorage, sessionStorage, or backend persistence
const inMemoryDrawingCache = new Map<string, HTMLCanvasElement>();

export interface TextAnnotation {
  id: string;
  text: string;
  xPercent: number; // 0 to 100 (% of image width)
  yPercent: number; // 0 to 100 (% of image height)
  fontSize: number; // base font size in px
}

const inMemoryTextCache = new Map<string, TextAnnotation[]>();

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'text';
type BrushSizeTier = 'fine' | 'medium' | 'bold';

const SIZE_CONFIG: Record<BrushSizeTier, {
  label: string;
  penWidth: number;
  highlighterWidth: number;
  eraserWidth: number;
  fontSize: number;
  dotClass: string;
}> = {
  fine: {
    label: 'Fine',
    penWidth: 2,
    highlighterWidth: 12,
    eraserWidth: 14,
    fontSize: 13,
    dotClass: 'w-1.5 h-1.5',
  },
  medium: {
    label: 'Medium',
    penWidth: 4,
    highlighterWidth: 20,
    eraserWidth: 22,
    fontSize: 16,
    dotClass: 'w-2.5 h-2.5',
  },
  bold: {
    label: 'Bold',
    penWidth: 7,
    highlighterWidth: 30,
    eraserWidth: 32,
    fontSize: 20,
    dotClass: 'w-3.5 h-3.5',
  },
};

const HIGHLIGHTER_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><polygon points='4,2 14,2 10,18 0,18' fill='rgba(255,235,59,0.3)' stroke='%23facc15' stroke-width='1.5' stroke-dasharray='2,2'/></svg>") 2 2, default`;

const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='%23f43f5e' stroke-width='2' stroke-dasharray='3 2'/%3E%3Ccircle cx='12' cy='12' r='1.5' fill='%23f43f5e'/%3E%3C/svg%3E") 12 12, crosshair`;

interface ImageCanvasProps {
  src: string | null;
  title: string;
  badgeText?: string;
  badgeColor?: 'cyan' | 'emerald' | 'indigo' | 'amber' | 'purple';
  extraBadge?: React.ReactNode;
  placeholderTitle?: string;
  placeholderMessage?: string;
  children?: React.ReactNode;
  enableAnnotation?: boolean;
  questionId?: string;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  src,
  title,
  badgeText,
  badgeColor = 'cyan',
  extraBadge,
  placeholderTitle = 'No image available',
  placeholderMessage = 'Mark scheme for this question is not available in the sample paper.',
  children,
  enableAnnotation = false,
  questionId,
}) => {
  const [zoom, setZoom] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1.2);
  const containerRef = useRef<HTMLDivElement>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const cdnSrc = getFullImageUrl(src);
  const localSrc = getLocalImageUrl(src);
  const resolvedSrc = useLocalFallback ? localSrc : cdnSrc;

  // Annotation Tooling State
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [brushSize, setBrushSize] = useState<BrushSizeTier>('fine');
  const brushSizeRef = useRef<BrushSizeTier>(brushSize);
  brushSizeRef.current = brushSize;

  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>(() => {
    const cacheKey = questionId || src;
    return cacheKey && inMemoryTextCache.has(cacheKey) ? inMemoryTextCache.get(cacheKey)! : [];
  });
  const [editingItem, setEditingItem] = useState<TextAnnotation | null>(null);
  const editingItemRef = useRef<TextAnnotation | null>(null);
  editingItemRef.current = editingItem;
  const [editingInLightbox, setEditingInLightbox] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightboxImgRef = useRef<HTMLImageElement>(null);
  const lightboxCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const prevQuestionIdRef = useRef<string | undefined>(questionId);
  const strokeHistoryRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);

  const handleImageError = () => {
    if (!useLocalFallback && localSrc && localSrc !== cdnSrc) {
      setUseLocalFallback(true);
    } else {
      setHasError(true);
    }
  };

  // Restore drawing from in-memory cache
  const restoreFromCache = useCallback((targetCanvas: HTMLCanvasElement | null) => {
    if (!targetCanvas) return;
    const cacheKey = questionId || src;
    if (!cacheKey) return;
    const offscreen = inMemoryDrawingCache.get(cacheKey);
    if (!offscreen || offscreen.width === 0 || offscreen.height === 0) return;

    if (targetCanvas.width !== offscreen.width || targetCanvas.height !== offscreen.height) {
      targetCanvas.width = offscreen.width;
      targetCanvas.height = offscreen.height;
    }
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(offscreen, 0, 0);
  }, [questionId, src]);

  // Synchronize drawn bitmap to in-memory offscreen cache and other canvas (main or lightbox)
  const syncDrawingCanvases = useCallback((sourceCanvas: HTMLCanvasElement) => {
    const cacheKey = questionId || src;
    if (!cacheKey || sourceCanvas.width === 0 || sourceCanvas.height === 0) return;

    let offscreen = inMemoryDrawingCache.get(cacheKey);
    if (!offscreen) {
      offscreen = document.createElement('canvas');
      inMemoryDrawingCache.set(cacheKey, offscreen);
    }
    if (offscreen.width !== sourceCanvas.width || offscreen.height !== sourceCanvas.height) {
      offscreen.width = sourceCanvas.width;
      offscreen.height = sourceCanvas.height;
    }
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.drawImage(sourceCanvas, 0, 0);
    }

    const otherCanvas = sourceCanvas === canvasRef.current ? lightboxCanvasRef.current : canvasRef.current;
    if (otherCanvas) {
      if (otherCanvas.width !== sourceCanvas.width || otherCanvas.height !== sourceCanvas.height) {
        otherCanvas.width = sourceCanvas.width;
        otherCanvas.height = sourceCanvas.height;
      }
      const otherCtx = otherCanvas.getContext('2d');
      if (otherCtx) {
        otherCtx.clearRect(0, 0, otherCanvas.width, otherCanvas.height);
        otherCtx.drawImage(sourceCanvas, 0, 0);
      }
    }
  }, [questionId, src]);

  // Undo last drawn stroke
  const handleUndo = useCallback(() => {
    if (strokeHistoryRef.current.length === 0) return;
    const previousSnapshot = strokeHistoryRef.current.pop();
    if (!previousSnapshot) return;

    setCanUndo(strokeHistoryRef.current.length > 0);

    const activeCanvas = isLightboxOpen ? lightboxCanvasRef.current : canvasRef.current;
    if (activeCanvas) {
      const ctx = activeCanvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(previousSnapshot, 0, 0);
        syncDrawingCanvases(activeCanvas);
      }
    }
  }, [isLightboxOpen, syncDrawingCanvases]);

  // Commit and save text annotation
  const commitEditingText = useCallback(() => {
    const current = editingItemRef.current;
    if (!current) return;

    const trimmed = current.text.trim();
    const cacheKey = questionId || src;

    if (trimmed.length === 0) {
      setTextAnnotations((prev) => {
        const next = prev.filter((item) => item.id !== current.id);
        if (cacheKey) inMemoryTextCache.set(cacheKey, next);
        return next;
      });
    } else {
      setTextAnnotations((prev) => {
        const idx = prev.findIndex((item) => item.id === current.id);
        let next: TextAnnotation[];
        if (idx >= 0) {
          next = prev.map((item) => (item.id === current.id ? { ...current, text: current.text } : item));
        } else {
          next = [...prev, { ...current, text: current.text }];
        }
        if (cacheKey) inMemoryTextCache.set(cacheKey, next);
        return next;
      });
    }

    setEditingItem(null);
    editingItemRef.current = null;
  }, [questionId, src]);

  const deleteAnnotation = useCallback((id: string) => {
    if (editingItemRef.current?.id === id) {
      setEditingItem(null);
      editingItemRef.current = null;
    }
    setTextAnnotations((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const cacheKey = questionId || src;
      if (cacheKey) inMemoryTextCache.set(cacheKey, next);
      return next;
    });
  }, [questionId, src]);

  const startEditing = useCallback((item: TextAnnotation, isLightbox: boolean) => {
    if (editingItemRef.current && editingItemRef.current.id !== item.id) {
      commitEditingText();
    }
    const copy = { ...item };
    editingItemRef.current = copy;
    setEditingInLightbox(isLightbox);
    setEditingItem(copy);
  }, [commitEditingText]);

  const handleCanvasClickForText = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    isLightbox: boolean
  ) => {
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    if (editingItemRef.current) {
      commitEditingText();
    }

    // Relative percentage coordinates within the canvas/image bounds
    const xPercent = Math.max(0, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    const config = SIZE_CONFIG[brushSizeRef.current];

    const newItem: TextAnnotation = {
      id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: '',
      xPercent,
      yPercent,
      fontSize: config.fontSize,
    };
    editingItemRef.current = newItem;
    setEditingInLightbox(isLightbox);
    setEditingItem(newItem);
  }, [commitEditingText]);

  const switchTool = (tool: ToolType) => {
    if (editingItemRef.current) {
      commitEditingText();
    }
    setCurrentTool(tool);
  };

  const toggleAnnotating = () => {
    if (isAnnotating && editingItemRef.current) {
      commitEditingText();
    }
    setIsAnnotating((prev) => !prev);
  };

  const handleBrushSizeChange = (tier: BrushSizeTier) => {
    setBrushSize(tier);
    if (editingItemRef.current) {
      const updated = {
        ...editingItemRef.current,
        fontSize: SIZE_CONFIG[tier].fontSize,
      };
      editingItemRef.current = updated;
      setEditingItem(updated);
    }
  };

  // Sync main canvas buffer width & height to natural image dimensions
  const syncCanvasDimensions = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const w = img.naturalWidth || img.clientWidth;
    const h = img.naturalHeight || img.clientHeight;
    if (w > 0 && h > 0) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      restoreFromCache(canvas);
    }
  }, [restoreFromCache]);

  const handleClearCanvas = () => {
    setEditingItem(null);
    editingItemRef.current = null;
    setTextAnnotations([]);
    strokeHistoryRef.current = [];
    setCanUndo(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    if (lightboxCanvasRef.current) {
      const ctx = lightboxCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, lightboxCanvasRef.current.width, lightboxCanvasRef.current.height);
      }
    }
    const cacheKey = questionId || src;
    if (cacheKey) {
      inMemoryDrawingCache.delete(cacheKey);
      inMemoryTextCache.delete(cacheKey);
    }
  };

  // Only clear annotations when navigating to a different question (questionId change)
  useEffect(() => {
    if (prevQuestionIdRef.current && prevQuestionIdRef.current !== questionId) {
      inMemoryDrawingCache.delete(prevQuestionIdRef.current);
      inMemoryTextCache.delete(prevQuestionIdRef.current);
      strokeHistoryRef.current = [];
      setCanUndo(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      if (lightboxCanvasRef.current) {
        const ctx = lightboxCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, lightboxCanvasRef.current.width, lightboxCanvasRef.current.height);
        }
      }
      setTextAnnotations([]);
      setEditingItem(null);
      editingItemRef.current = null;
    }
    prevQuestionIdRef.current = questionId;
    syncCanvasDimensions();

    const cacheKey = questionId || src;
    if (cacheKey && inMemoryTextCache.has(cacheKey)) {
      setTextAnnotations(inMemoryTextCache.get(cacheKey) || []);
    } else {
      setTextAnnotations([]);
    }
  }, [questionId, src, syncCanvasDimensions]);

  // Auto-focus active text annotation input
  useEffect(() => {
    if (editingItem && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editingItem]);

  useEffect(() => {
    setHasError(false);
    setUseLocalFallback(false);
    setZoom(1);
    syncCanvasDimensions();
  }, [src, syncCanvasDimensions]);

  const handleImageLoad = () => {
    syncCanvasDimensions();
  };

  const handleLightboxImageLoad = () => {
    const img = lightboxImgRef.current;
    const canvas = lightboxCanvasRef.current;
    if (!img || !canvas) return;

    const w = img.naturalWidth || img.clientWidth;
    const h = img.naturalHeight || img.clientHeight;
    if (w > 0 && h > 0) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      restoreFromCache(canvas);
    }
  };

  const openLightbox = () => {
    if (editingItemRef.current) {
      commitEditingText();
    }
    setLightboxZoom(1.2);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    if (editingItemRef.current) {
      commitEditingText();
    }
    setIsLightboxOpen(false);
  };

  useEffect(() => {
    if (isLightboxOpen) {
      const timer = setTimeout(() => {
        handleLightboxImageLoad();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLightboxOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen && !editingItemRef.current) {
        closeLightbox();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (!editingItemRef.current && isAnnotating && strokeHistoryRef.current.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, isAnnotating, handleUndo]);

  // Map mouse or touch coordinate to high-res canvas coordinate
  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return null;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scale: scaleX,
    };
  };

  const startDrawing = (coords: { x: number; y: number; scale: number }, canvas: HTMLCanvasElement) => {
    if (currentTool === 'text') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Snapshot current canvas state before stroke begins for Undo
    try {
      if (canvas.width > 0 && canvas.height > 0) {
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        strokeHistoryRef.current.push(snapshot);
        if (strokeHistoryRef.current.length > 20) {
          strokeHistoryRef.current.shift();
        }
        setCanUndo(true);
      }
    } catch {
      // Ignore potential security/taint issues with external images
    }

    isDrawingRef.current = true;
    lastPosRef.current = { x: coords.x, y: coords.y };

    const config = SIZE_CONFIG[brushSizeRef.current];

    ctx.save();
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = config.eraserWidth * coords.scale;
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    } else if (currentTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = config.highlighterWidth * coords.scale;
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.35)';
      ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
    } else {
      // Pen: Cyan #00E5FF
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = config.penWidth * coords.scale;
      ctx.strokeStyle = '#00E5FF';
      ctx.fillStyle = '#00E5FF';
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Immediate point stamp
    ctx.beginPath();
    const radius = Math.max(1, ctx.lineWidth / 2);
    ctx.arc(coords.x, coords.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawMove = (coords: { x: number; y: number; scale: number }, canvas: HTMLCanvasElement) => {
    if (!isDrawingRef.current || !lastPosRef.current || currentTool === 'text') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = SIZE_CONFIG[brushSizeRef.current];

    ctx.save();
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = config.eraserWidth * coords.scale;
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    } else if (currentTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = config.highlighterWidth * coords.scale;
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.35)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = config.penWidth * coords.scale;
      ctx.strokeStyle = '#00E5FF';
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.restore();

    lastPosRef.current = { x: coords.x, y: coords.y };
  };

  const stopDrawing = (canvas: HTMLCanvasElement | null) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      if (canvas) {
        syncDrawingCanvases(canvas);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, isLightbox: boolean) => {
    if (!isAnnotating) return;
    if (currentTool === 'text') {
      e.preventDefault();
      handleCanvasClickForText(e, isLightbox);
      return;
    }
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const coords = getCanvasCoords(e, canvas);
    if (coords) startDrawing(coords, canvas);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>, isLightbox: boolean) => {
    if (!isAnnotating || !isDrawingRef.current || currentTool === 'text') return;
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const coords = getCanvasCoords(e, canvas);
    if (coords) drawMove(coords, canvas);
  };

  const handleMouseUp = (isLightbox: boolean) => {
    if (!isAnnotating) return;
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    stopDrawing(canvas);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>, isLightbox: boolean) => {
    if (!isAnnotating) return;
    if (currentTool === 'text') {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleCanvasClickForText(e, isLightbox);
      }
      return;
    }
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      const coords = getCanvasCoords(e, canvas);
      if (coords) startDrawing(coords, canvas);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>, isLightbox: boolean) => {
    if (!isAnnotating || !isDrawingRef.current || currentTool === 'text') return;
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      const coords = getCanvasCoords(e, canvas);
      if (coords) drawMove(coords, canvas);
    }
  };

  const handleTouchEnd = (isLightbox: boolean) => {
    if (!isAnnotating) return;
    const canvas = isLightbox ? lightboxCanvasRef.current : canvasRef.current;
    stopDrawing(canvas);
  };

  const getCanvasCursor = () => {
    if (!isAnnotating) return 'default';
    if (currentTool === 'pen') return 'default';
    if (currentTool === 'text') return 'text';
    if (currentTool === 'highlighter') return HIGHLIGHTER_CURSOR;
    if (currentTool === 'eraser') return ERASER_CURSOR;
    return 'default';
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const getBadgeClass = () => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'indigo':
        return 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      case 'amber':
        return 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'purple':
        return 'bg-purple-500/15 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
      default:
        return 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
    }
  };

  // Shared Floating Annotation Toolbar Renderer
  const renderAnnotationToolbar = () => (
    <div className="flex items-center gap-1 sm:gap-1.5 bg-white/95 dark:bg-dark-900/95 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200/90 dark:border-dark-700 shadow-md shadow-slate-900/5 select-none transition-all flex-wrap justify-center sm:flex-nowrap">
      {/* Toggle Annotate: On/Off */}
      <button
        type="button"
        onClick={toggleAnnotating}
        title={isAnnotating ? 'Turn off annotation' : 'Turn on annotation overlay'}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
          isAnnotating
            ? 'bg-cyan-500 text-white shadow-sm'
            : 'bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-750'
        }`}
      >
        <PenLine className="w-3.5 h-3.5" />
        <span>{isAnnotating ? 'Annotating' : 'Annotate'}</span>
      </button>

      {isAnnotating && (
        <>
          <div className="w-px h-4 bg-slate-200 dark:bg-dark-700 mx-0.5" />

          {/* Pen */}
          <button
            type="button"
            onClick={() => switchTool('pen')}
            title={`Pen (${SIZE_CONFIG[brushSize].penWidth}px Cyan)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              currentTool === 'pen'
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-sm inline-block" />
            <span>Pen</span>
          </button>

          {/* Highlighter */}
          <button
            type="button"
            onClick={() => switchTool('highlighter')}
            title={`Highlighter (${SIZE_CONFIG[brushSize].highlighterWidth}px Yellow)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              currentTool === 'highlighter'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            <span>Highlight</span>
          </button>

          {/* Text Tool */}
          <button
            type="button"
            onClick={() => switchTool('text')}
            title={`Text (${SIZE_CONFIG[brushSize].fontSize}px Font)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              currentTool === 'text'
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-cyan-500" />
            <span>Text</span>
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => switchTool('eraser')}
            title={`Eraser (${SIZE_CONFIG[brushSize].eraserWidth}px)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              currentTool === 'eraser'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <Eraser className="w-3.5 h-3.5 text-rose-500" />
            <span>Eraser</span>
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-dark-700 mx-0.5" />

          {/* 3-Tier Size Picker */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-800/80 p-0.5 rounded-full border border-slate-200/80 dark:border-dark-750">
            {(['fine', 'medium', 'bold'] as const).map((tier) => {
              const isSelected = brushSize === tier;
              const config = SIZE_CONFIG[tier];
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handleBrushSizeChange(tier)}
                  title={`${config.label} (${config.penWidth}px Pen / ${config.fontSize}px Font)`}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-dark-700 shadow-sm border border-slate-300 dark:border-dark-600 scale-105'
                      : 'hover:bg-slate-200/60 dark:hover:bg-dark-700/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span
                    className={`rounded-full transition-colors ${
                      isSelected
                        ? currentTool === 'eraser'
                          ? 'bg-rose-500'
                          : currentTool === 'highlighter'
                            ? 'bg-amber-400'
                            : 'bg-cyan-500'
                        : 'bg-slate-500 dark:bg-slate-400'
                    } ${config.dotClass}`}
                  />
                </button>
              );
            })}
          </div>

          <div className="w-px h-4 bg-slate-200 dark:bg-dark-700 mx-0.5" />

          {/* Undo Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo drawing stroke (Ctrl+Z)"
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              canUndo
                ? 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800'
                : 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClearCanvas}
            title="Clear all annotations on this question"
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </>
      )}
    </div>
  );

  // Shared Text Annotations & Auto-Expanding Inline Input Renderer
  const renderTextAnnotations = (isLightbox: boolean) => {
    if (!enableAnnotation) return null;

    return (
      <>
        {textAnnotations.map((item) => {
          if (editingItem?.id === item.id) return null;
          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                if (isAnnotating) {
                  if (currentTool === 'eraser') {
                    deleteAnnotation(item.id);
                  } else {
                    startEditing(item, isLightbox);
                  }
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (isAnnotating) {
                  startEditing(item, isLightbox);
                }
              }}
              className={`absolute z-20 font-sans text-cyan-400 select-none whitespace-pre leading-tight transition-all ${
                isAnnotating
                  ? currentTool === 'eraser'
                    ? 'cursor-pointer hover:line-through hover:opacity-60'
                    : 'cursor-pointer hover:border-b hover:border-cyan-400/60'
                  : 'pointer-events-none'
              }`}
              style={{
                left: `${item.xPercent}%`,
                top: `${item.yPercent}%`,
                fontSize: `${item.fontSize}px`,
              }}
              title={
                isAnnotating
                  ? currentTool === 'eraser'
                    ? 'Click to delete note'
                    : 'Click or double-click to edit note'
                  : undefined
              }
            >
              {item.text}
            </div>
          );
        })}

        {/* Dynamic Auto-Expanding Inline Input while Typing */}
        {isAnnotating && editingItem && editingInLightbox === isLightbox && (
          <input
            ref={inputRef}
            type="text"
            value={editingItem.text}
            onChange={(e) => {
              const newText = e.target.value;
              setEditingItem((prev) => (prev ? { ...prev, text: newText } : null));
              if (editingItemRef.current) {
                editingItemRef.current.text = newText;
              }
            }}
            onBlur={commitEditingText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEditingText();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                commitEditingText();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="Type note..."
            autoFocus
            className="absolute z-30 bg-transparent text-cyan-400 border-b border-cyan-400/80 outline-none p-0 m-0 font-sans shadow-none whitespace-pre text-base placeholder-cyan-400/40"
            style={{
              left: `${editingItem.xPercent}%`,
              top: `${editingItem.yPercent}%`,
              fontSize: `${editingItem.fontSize}px`,
              width: `${Math.max(8, editingItem.text.length + 1)}ch`,
              maxWidth: '90%',
            }}
          />
        )}
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full min-h-[300px] bg-slate-100/60 dark:bg-dark-950/60 overflow-hidden border-r border-slate-200 dark:border-dark-800 last:border-r-0 transition-colors">
      {/* Canvas Header */}
      <div className="h-11 px-3 sm:px-4 border-b border-slate-200 dark:border-dark-800 bg-white/80 dark:bg-dark-900/60 backdrop-blur-sm flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden flex-wrap sm:flex-nowrap">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{title}</span>
          {badgeText && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${getBadgeClass()}`}>
              {badgeText}
            </span>
          )}
          {extraBadge}
        </div>

        {/* Zoom & Lightbox Controls */}
        {src && !hasError && (
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-dark-800/80 rounded-lg p-0.5 border border-slate-200 dark:border-dark-750 shrink-0">
            {enableAnnotation && (
              <>
                <button
                  type="button"
                  onClick={toggleAnnotating}
                  title={isAnnotating ? 'Turn off annotation overlay' : 'Draw / annotate on question'}
                  className={`p-1 sm:p-1.5 rounded transition-colors ${
                    isAnnotating
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-slate-200 dark:bg-dark-700 mx-0.5" />
              </>
            )}
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom out"
              className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 px-1 select-none min-w-[2.5rem] sm:min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom in"
              className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-dark-700 mx-0.5" />
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-dark-700 mx-0.5" />
            <button
              type="button"
              onClick={openLightbox}
              title="Full-screen Lightbox (inspect intricate mechanisms & graphs)"
              className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-dark-700 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Canvas Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-auto p-2 sm:p-4 flex items-start justify-center bg-slate-100/40 dark:bg-dark-950/40 relative"
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      >
        {!src || hasError ? (
          <div className="m-auto flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-dark-850 border border-slate-300 dark:border-dark-750 flex items-center justify-center text-slate-500 mb-3">
              <FileQuestion className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{placeholderTitle}</h4>
            <p className="text-xs text-slate-500">{placeholderMessage}</p>
          </div>
        ) : (
          <div className="flex flex-col justify-start items-center pt-2 pb-12 w-full max-w-full">
            {/* Minimal Floating Annotation Controls */}
            {enableAnnotation && (
              <div className="sticky top-2 z-20 mb-3 flex items-center justify-center pointer-events-auto">
                {renderAnnotationToolbar()}
              </div>
            )}

            <div 
              className={`relative max-w-full transition-transform duration-100 ease-out origin-top shadow-sm dark:shadow-xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white ${
                !isAnnotating ? 'cursor-pointer' : ''
              }`}
              style={{ transform: `scale(${zoom})` }}
              onClick={() => {
                if (!isAnnotating && zoom === 1) {
                  openLightbox();
                }
              }}
              title={!isAnnotating ? "Click or tap to inspect in full-screen lightbox" : undefined}
            >
              <img
                ref={imgRef}
                src={resolvedSrc}
                alt={title}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="w-full max-w-full h-auto object-contain block select-none pointer-events-none"
              />
              {enableAnnotation && (
                <canvas
                  ref={canvasRef}
                  onMouseDown={(e) => handleMouseDown(e, false)}
                  onMouseMove={(e) => handleMouseMove(e, false)}
                  onMouseUp={() => handleMouseUp(false)}
                  onMouseLeave={() => handleMouseUp(false)}
                  onTouchStart={(e) => handleTouchStart(e, false)}
                  onTouchMove={(e) => handleTouchMove(e, false)}
                  onTouchEnd={() => handleTouchEnd(false)}
                  onTouchCancel={() => handleTouchEnd(false)}
                  className={`absolute inset-0 w-full h-full ${
                    isAnnotating ? 'pointer-events-auto touch-none' : 'pointer-events-none'
                  }`}
                  style={{
                    cursor: getCanvasCursor(),
                  }}
                />
              )}

              {/* Re-Editable Text Annotations Overlay */}
              {renderTextAnnotations(false)}
            </div>
            {children}
          </div>
        )}
      </div>

      {/* Full-Screen Lightbox Modal */}
      {isLightboxOpen && src && !hasError && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col animate-in fade-in duration-150"
          onClick={closeLightbox}
        >
          {/* Lightbox Header */}
          <div 
            className="h-14 px-4 sm:px-6 border-b border-dark-800 bg-dark-900/90 flex items-center justify-between shrink-0 select-none"
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
                onClick={closeLightbox}
                className="w-10 h-10 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                title="Close lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Body / Viewport */}
          <div 
            className="flex-1 overflow-auto p-3 sm:p-6 flex flex-col items-center justify-start cursor-zoom-out"
            onClick={closeLightbox}
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
          >
            {/* Annotation Toolbar in Lightbox */}
            {enableAnnotation && (
              <div 
                className="sticky top-2 z-30 mb-3 flex items-center justify-center pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {renderAnnotationToolbar()}
              </div>
            )}

            <div 
              className="bg-white rounded-xl shadow-2xl p-2 max-w-5xl transition-transform duration-100 ease-out origin-top cursor-default"
              style={{ transform: `scale(${lightboxZoom})` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative max-w-full overflow-hidden rounded-lg">
                <img
                  ref={lightboxImgRef}
                  src={resolvedSrc}
                  alt={title}
                  onLoad={handleLightboxImageLoad}
                  className="w-full max-w-full h-auto object-contain block select-none pointer-events-none"
                />
                {enableAnnotation && (
                  <canvas
                    ref={lightboxCanvasRef}
                    onMouseDown={(e) => handleMouseDown(e, true)}
                    onMouseMove={(e) => handleMouseMove(e, true)}
                    onMouseUp={() => handleMouseUp(true)}
                    onMouseLeave={() => handleMouseUp(true)}
                    onTouchStart={(e) => handleTouchStart(e, true)}
                    onTouchMove={(e) => handleTouchMove(e, true)}
                    onTouchEnd={() => handleTouchEnd(true)}
                    onTouchCancel={() => handleTouchEnd(true)}
                    className={`absolute inset-0 w-full h-full ${
                      isAnnotating ? 'pointer-events-auto touch-none' : 'pointer-events-none'
                    }`}
                    style={{
                      cursor: getCanvasCursor(),
                    }}
                  />
                )}
                {renderTextAnnotations(true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCanvas;
