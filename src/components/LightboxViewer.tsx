import { useState, useCallback, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Share2, ZoomIn, ZoomOut } from "lucide-react";
import type { MediaItem } from "@/data/gallery-data";
import BeforeAfterSlider from "./BeforeAfterSlider";
import OrthomosaicMap from "./OrthomosaicMap";

interface LightboxViewerProps {
  items: MediaItem[];
  currentIndex: number;
  useCaseId: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const LightboxViewer = ({ items, currentIndex, useCaseId, onClose, onNavigate }: LightboxViewerProps) => {
  const item = items[currentIndex];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => { resetZoom(); setCarouselIndex(0); }, [currentIndex, resetZoom]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < items.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, items.length, onClose, onNavigate]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/use-case/${useCaseId}/${item.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [useCaseId, item.id]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 5));
  const handleZoomOut = () => { setZoom((z) => { const nz = Math.max(z - 0.5, 1); if (nz === 1) setPan({ x: 0, y: 0 }); return nz; }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 || item.type === "before_after") return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan((p) => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { dragging.current = false; };

  const typeBadge =
    item.type === "before_after"
      ? "Before / After"
      : item.type === "video"
      ? "Video"
      : item.type === "orthomosaic_map"
      ? "Interactive Orthomosaic"
      : item.type === "splat_embed"
      ? "3D Gaussian Splat"
      : item.type === "image_carousel"
      ? `Photo ${carouselIndex + 1} of ${item.images?.length ?? 0}`
      : "Image";

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted">
            <X size={18} />
          </button>
          <div>
            {item.title && <h3 className="font-heading text-sm font-medium text-foreground">{item.title}</h3>}
            <span className="text-xs text-muted-foreground">{typeBadge} · {currentIndex + 1} of {items.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {item.type === "image" && (
            <>
              <button onClick={handleZoomOut} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ZoomOut size={18} /></button>
              <button onClick={handleZoomIn} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ZoomIn size={18} /></button>
            </>
          )}
          <button onClick={handleShare} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Share2 size={16} />
            <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
          </button>
          <button onClick={toggleFullscreen} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 && item.type === "image" ? (dragging.current ? "grabbing" : "grab") : "default" }}
      >
        {item.type === "image" && item.src && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-4 pb-2 pt-4">
            <div className="flex flex-1 items-center justify-center overflow-hidden w-full">
              <img
                src={item.src}
                alt={item.title || ""}
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
                draggable={false}
              />
            </div>
            {items.length > 1 && items.every((it) => it.type === "image") && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {items.map((it, i) => (
                  <button
                    key={it.id}
                    onClick={(e) => { e.stopPropagation(); onNavigate(i); }}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                      i === currentIndex ? "border-foreground opacity-100" : "border-transparent opacity-60 hover:opacity-90"
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  >
                    <img src={it.thumbnail} alt={it.title || ""} className="h-full w-full object-cover" draggable={false} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {item.type === "image_carousel" && item.images && item.images.length > 0 && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-4 pb-2 pt-4">
            <div className="relative flex flex-1 items-center justify-center overflow-hidden w-full"
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
              style={{ cursor: zoom > 1 ? (dragging.current ? "grabbing" : "grab") : "default" }}
            >
              <img
                src={item.images[carouselIndex].src}
                alt={item.images[carouselIndex].title || item.title || ""}
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
                draggable={false}
              />
              {item.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex((i) => (i - 1 + item.images!.length) % item.images!.length); resetZoom(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-foreground backdrop-blur transition-colors hover:bg-muted"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex((i) => (i + 1) % item.images!.length); resetZoom(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-foreground backdrop-blur transition-colors hover:bg-muted"
                    aria-label="Next image"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>
            {item.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {item.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex(i); resetZoom(); }}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                      i === carouselIndex ? "border-foreground opacity-100" : "border-transparent opacity-60 hover:opacity-90"
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  >
                    <img
                      src={img.src}
                      alt={img.title || ""}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {item.type === "video" && item.videoSrc && (
          <video
            src={item.videoSrc}
            poster={item.thumbnail}
            controls
            autoPlay
            loop
            playsInline
            className="max-h-full max-w-full object-contain"
          />
        )}
        {item.type === "before_after" && item.beforeSrc && item.afterSrc && (
          <div className="h-full w-full">
            <BeforeAfterSlider beforeSrc={item.beforeSrc} afterSrc={item.afterSrc} title={item.title} />
          </div>
        )}
        {item.type === "orthomosaic_map" && item.tileUrl && item.mapCenter && (
          <div className="h-full w-full">
            <OrthomosaicMap
              tileUrl={item.tileUrl}
              center={item.mapCenter}
              zoom={item.mapZoom}
              bounds={item.mapBounds}
              attribution={item.mapAttribution}
            />
          </div>
        )}
        {item.type === "splat_embed" && item.embedUrl && (
          <div className="h-full w-full">
            <iframe
              src={item.embedUrl}
              title={item.title || "Gaussian Splat Viewer"}
              className="h-full w-full border-0"
              allow="fullscreen; xr-spatial-tracking; autoplay"
              allowFullScreen
            />
          </div>
        )}

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-foreground backdrop-blur transition-colors hover:bg-muted sm:left-6"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {currentIndex < items.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-foreground backdrop-blur transition-colors hover:bg-muted sm:right-6"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LightboxViewer;
