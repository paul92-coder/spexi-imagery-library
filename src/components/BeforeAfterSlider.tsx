import { useState, useRef, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  title?: string;
}

const BeforeAfterSlider = ({ beforeSrc, afterSrc, title }: BeforeAfterSliderProps) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-col-resize select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After (full background) */}
      <img src={afterSrc} alt={`${title || "After"}`} className="absolute inset-0 h-full w-full object-contain" />
      
      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img src={beforeSrc} alt={`${title || "Before"}`} className="h-full w-full object-contain" style={{ width: containerRef.current?.offsetWidth || '100%', maxWidth: 'none' }} />
      </div>

      {/* Slider line */}
      <div className="absolute top-0 bottom-0 z-10" style={{ left: `${position}%`, transform: 'translateX(-50%)' }}>
        <div className="h-full w-0.5 bg-foreground/80" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground/80 bg-background/60 backdrop-blur-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
            <path d="M18 8l4 4-4 4M6 8l-4 4 4 4" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-4 left-4 z-10 rounded bg-background/60 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">Before</span>
      <span className="absolute top-4 right-4 z-10 rounded bg-background/60 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">After</span>
    </div>
  );
};

export default BeforeAfterSlider;
