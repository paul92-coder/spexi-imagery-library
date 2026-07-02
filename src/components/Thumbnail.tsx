import type { MediaItem } from "@/data/gallery-data";

interface ThumbnailProps {
  item: MediaItem;
  className?: string;
  priority?: boolean;
}

// Renders the right preview for any media type: looping muted video for
// items that have one (works on mobile with playsInline), otherwise a
// lazy-loaded image. `className` is honored consistently in both branches —
// the original component silently dropped it for the image branch.
const Thumbnail = ({ item, className, priority = false }: ThumbnailProps) => {
  if (item.thumbnailVideo) {
    return (
      <video
        src={item.thumbnailVideo}
        poster={item.thumbnail}
        autoPlay
        muted
        loop
        playsInline
        preload={priority ? "auto" : "metadata"}
        className={className}
      />
    );
  }

  return (
    <img
      src={item.thumbnail}
      alt={item.title || ""}
      className={className}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
};

export default Thumbnail;
