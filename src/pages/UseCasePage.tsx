import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import LightboxViewer from "@/components/LightboxViewer";
import Thumbnail from "@/components/Thumbnail";
import { useMediaOverrides } from "@/hooks/useMediaOverrides";

const typeBadge = (type: string) => {
  if (type === "before_after") return "Before & After";
  if (type === "video") return "▶";
  if (type === "orthomosaic_map") return "Interactive Map";
  if (type === "image_carousel") return "Gallery";
  return null;
};

const UseCasePage = () => {
  const { useCaseId, mediaId } = useParams();
  const navigate = useNavigate();
  const { useCases, loading } = useMediaOverrides();
  const useCase = useCases.find((uc) => uc.id === (useCaseId || ""));
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (mediaId && useCase) {
      const idx = useCase.items.findIndex((i) => i.id === mediaId);
      if (idx !== -1) setLightboxIndex(idx);
    }
  }, [mediaId, useCase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 pt-28 pb-20">
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg bg-card">
                <div className="aspect-[16/10] animate-pulse bg-muted" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!useCase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Use case not found.</p>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    navigate(`/use-case/${useCase.id}/${useCase.items[index].id}`, { replace: true });
  };
  const closeLightbox = () => {
    setLightboxIndex(null);
    navigate(`/use-case/${useCase.id}`, { replace: true });
  };
  const navigateLightbox = (index: number) => {
    setLightboxIndex(index);
    navigate(`/use-case/${useCase.id}/${useCase.items[index].id}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-28 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={16} />
          Back to Library
        </Link>
        <h1 className="mt-6 font-heading text-3xl font-bold text-foreground sm:text-4xl">{useCase.title}</h1>
        {useCase.subtitle && <p className="mt-2 text-muted-foreground">{useCase.subtitle}</p>}

        {useCase.items.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">No imagery in this use case yet.</p>
        ) : (
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {useCase.items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => openLightbox(i)}
                className="group relative animate-fade-in overflow-hidden rounded-lg bg-card opacity-0"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <Thumbnail item={item} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-background/0 transition-colors group-hover:bg-background/20" />
                </div>
                {item.title && (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <span className="text-sm font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{item.title}</span>
                    </div>
                  </>
                )}
                {typeBadge(item.type) && (
                  <span className="absolute top-3 right-3 rounded bg-background/60 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
                    {typeBadge(item.type)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {lightboxIndex !== null && (
        <LightboxViewer
          items={useCase.items}
          currentIndex={lightboxIndex}
          useCaseId={useCase.id}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      )}
    </div>
  );
};

export default UseCasePage;
