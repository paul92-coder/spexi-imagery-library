import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearchParams, Link } from "react-router-dom";
import { Box, Map as MapIcon, Globe2, Compass, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import LightboxViewer from "@/components/LightboxViewer";
import Thumbnail from "@/components/Thumbnail";
import { type MediaItem, type UseCase } from "@/data/gallery-data";
import { useMediaOverrides } from "@/hooks/useMediaOverrides";
import { cn } from "@/lib/utils";
import droneBg from "@/assets/drone-bg.jpg";
import { HERO_VIDEO_URL } from "@/data/media-cdn";
import apiHeroNorth from "@/assets/api-hero-north.jpg";
import apiHeroEast from "@/assets/api-hero-east.jpg";
import apiHeroSouth from "@/assets/api-hero-south.jpg";
import apiHeroWest from "@/assets/api-hero-west.jpg";
import apiHeroAbove from "@/assets/api-hero-above.jpg";
import productCardSplat from "@/assets/product-card-splat.jpg";
import productCardOrtho from "@/assets/product-card-ortho.jpg";
import productCardPanorama from "@/assets/product-card-panorama.jpg";

const INDUSTRIES = [
  "All",
  "Construction, Engineering, Architecture",
  "Local Government",
  "Utilities",
  "Insurance",
  "Finance",
  "Commercial Real Estate",
  "Spatial / Physical AI",
] as const;
type Industry = (typeof INDUSTRIES)[number];

// Set once a same-location image set (one upload per product type, all
// sharing this title) exists — see `imageType` per product below. Left
// blank, the cards fall back to the plain icon-only design.
const PRODUCT_CARD_LOCATION_TITLE = "";

const PRODUCT_TYPES = [
  { id: "ortho" as const, label: "Orthomosaics", description: "Survey-grade geo-referenced maps", icon: MapIcon, imageType: "orthomosaic" as const },
  { id: "panorama" as const, label: "360° Panoramas", description: "Immersive aerial perspectives", icon: Globe2, imageType: "oblique" as const },
  { id: "splat" as const, label: "Gaussian Splats", description: "Photoreal 3D digital twins", icon: Box, imageType: "splat" as const },
  { id: "api" as const, label: "5-View API", description: "Aerial context as an API", icon: Compass, imageType: "api" as const },
];

// Manually-set hero images for a product card, taking priority over the
// PRODUCT_CARD_LOCATION_TITLE lookup above (e.g. one-off photos supplied
// directly rather than uploaded through the admin panel).
const STATIC_PRODUCT_HERO: Partial<Record<(typeof PRODUCT_TYPES)[number]["id"], string>> = {
  splat: productCardSplat,
  ortho: productCardOrtho,
  panorama: productCardPanorama,
};

const HEXAGON_CLIP_PATH = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

const BEFORE_AFTER_GROUP = "before-after";

// Before/after items normally get pulled out of their own use case and into
// the cross-use-case "Before & After" shelf below, appearing there only.
// Anything listed here also stays in its own use case's folder — e.g. the
// wildfire comparison shows both under "Catastrophe" and in the shelf.
const BEFORE_AFTER_KEEP_IN_USE_CASE = new Set(["cat-3"]);

type Entry = { item: MediaItem; useCase: UseCase };

const Index = () => {
  const { useCases: allUseCases, loading } = useMediaOverrides();
  const [industry, setIndustry] = useState<Industry>("All");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeGroup = searchParams.get("group");
  const [lightboxItems, setLightboxItems] = useState<MediaItem[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const location = useLocation();

  // Folder drill-in is reflected in the URL (?group=) and pushed onto browser
  // history, so the back button steps back out of a folder instead of
  // leaving the page entirely.
  const openGroup = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("group", id);
      return next;
    });
  };
  const closeGroup = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("group");
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const reset = () => {
      setIndustry("All");
      closeGroup();
      setLightboxItems(null);
      setLightboxIndex(null);
    };
    window.addEventListener("spexi:reset-home", reset);
    return () => window.removeEventListener("spexi:reset-home", reset);
  }, []);

  useEffect(() => {
    if (location.hash === "#use-cases" || location.state?.scrollTarget === "use-cases") {
      requestAnimationFrame(() => {
        const el = document.getElementById("use-cases");
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: Math.max(0, top), behavior: "instant" as ScrollBehavior });
      });
    }
  }, [location.hash, location.key, location.state]);

  // Flatten every item across use cases, tagged with its parent use case,
  // filtered by the selected industry.
  const filteredEntries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    allUseCases.forEach((uc) => {
      uc.items.forEach((item) => {
        const matches = industry === "All" || item.industry === industry || (item.tags || []).includes(industry);
        if (matches) out.push({ item, useCase: uc });
      });
    });
    return out;
  }, [industry, allUseCases]);

  // Looks up the shared-location image set for the "Browse by Product"
  // cards, keyed by each product's imageType. Empty until
  // PRODUCT_CARD_LOCATION_TITLE is set.
  const productCardImages = useMemo(() => {
    const map: Partial<Record<string, MediaItem>> = {};
    if (!PRODUCT_CARD_LOCATION_TITLE) return map;
    allUseCases.forEach((uc) =>
      uc.items.forEach((item) => {
        if (item.title === PRODUCT_CARD_LOCATION_TITLE && item.imageType) map[item.imageType] = item;
      }),
    );
    return map;
  }, [allUseCases]);

  // Before/after comparisons get their own cross-use-case group, mirroring
  // how the original site surfaces them as a single "Before & After" shelf
  // regardless of which use case they came from.
  const beforeAfterEntries = useMemo(() => {
    const entries = filteredEntries.filter((e) => e.item.type === "before_after");
    // One-off: lead with a non-catastrophe comparison so this shelf's cover
    // photo doesn't read as another disaster scene next to the Catastrophe
    // folder tile.
    return [...entries].sort((a, b) => Number(a.useCase.id === "catastrophe") - Number(b.useCase.id === "catastrophe"));
  }, [filteredEntries]);

  const useCaseGroups = useMemo(() => {
    return allUseCases
      .map((uc) => ({
        useCase: uc,
        entries: filteredEntries.filter(
          (e) =>
            e.useCase.id === uc.id &&
            (e.item.type !== "before_after" || BEFORE_AFTER_KEEP_IN_USE_CASE.has(e.item.id)),
        ),
      }))
      .filter((g) => g.entries.length > 0 && !g.useCase.hideFromHome);
  }, [filteredEntries, allUseCases]);

  const topTiles = useMemo(() => {
    const tiles: { id: string; title: string; subtitle?: string; entries: Entry[] }[] = [];
    if (beforeAfterEntries.length > 0) {
      tiles.push({ id: BEFORE_AFTER_GROUP, title: "Before & After", subtitle: "Change over time, side by side", entries: beforeAfterEntries });
    }
    useCaseGroups.forEach((g) => tiles.push({ id: g.useCase.id, title: g.useCase.title, subtitle: g.useCase.subtitle, entries: g.entries }));

    // Each tile's cover is its first entry's thumbnail. Pick the first entry
    // per tile whose thumbnail isn't already claimed by an earlier tile, so
    // folders don't repeat the same cover photo across the home page.
    const usedThumbnails = new Set<string>();
    return tiles.map((tile) => {
      const cover = (tile.entries.find((e) => !usedThumbnails.has(e.item.thumbnail)) ?? tile.entries[0]).item;
      usedThumbnails.add(cover.thumbnail);
      return { ...tile, cover };
    });
  }, [beforeAfterEntries, useCaseGroups]);

  const activeTile = activeGroup ? topTiles.find((t) => t.id === activeGroup) : null;
  const effectiveItems = lightboxItems ?? activeTile?.entries.map((e) => e.item) ?? [];
  const activeItem = lightboxIndex !== null ? effectiveItems[lightboxIndex] : null;

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: `url(${droneBg})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/85 to-background"
      />
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-20 sm:px-6 sm:pt-24">
        {/* Hero */}
        <section className="relative -mx-4 sm:-mx-6">
          <video
            src={HERO_VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40" />
          <div className="relative z-10 px-4 pt-20 pb-16 sm:px-6 sm:pt-24 sm:pb-20">
            <div className="max-w-5xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Spexi Image Gallery</p>
              <h1 className="mt-6 font-heading text-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground break-words sm:text-7xl lg:text-8xl">
                <span className="block">The World,</span>
                <span className="block bg-gradient-to-br from-primary/90 via-primary to-primary/70 bg-clip-text text-transparent">
                  Standardized.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-xl">
                Explore standardized drone imagery.
              </p>
            </div>
            
              <a href="https://spexi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105"
            >
              Request Access
            </a>
          </div>
        </section>

        <section className="mt-16 grid gap-10 border-t border-border/60 pt-12 md:grid-cols-3 md:gap-12">
          <WorkflowStep step="01" title="Subscribe to recurring change" />
          <WorkflowStep step="02" title="Task collections" />
          <WorkflowStep step="03" title="Build world models" />
        </section>

        <section className="mt-16 border-t border-border/60 pt-12">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Browse by Product
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">Explore imagery by type</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCT_TYPES.map((pt) => {
              const heroItem = productCardImages[pt.imageType];
              return (
                <Link
                  key={pt.id}
                  to={`/product-type/${pt.id}`}
                  className="group relative block overflow-hidden rounded-xl bg-card ring-1 ring-border transition-all hover:-translate-y-1 hover:ring-foreground/30"
                >
                  {pt.id === "api" ? (
                    <MiniApiCross />
                  ) : pt.id === "ortho" && STATIC_PRODUCT_HERO.ortho ? (
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
                      <div className="aspect-square h-[85%]">
                        <img
                          src={STATIC_PRODUCT_HERO.ortho}
                          alt={pt.label}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          style={{ clipPath: HEXAGON_CLIP_PATH }}
                        />
                      </div>
                    </div>
                  ) : STATIC_PRODUCT_HERO[pt.id] ? (
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={STATIC_PRODUCT_HERO[pt.id]}
                        alt={pt.label}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    heroItem && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <Thumbnail item={heroItem} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    )
                  )}
                  <div className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                      <pt.icon size={24} />
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">{pt.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{pt.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <div id="use-cases" className="scroll-mt-24 mt-16 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Use cases</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Explore standardized imagery across industries.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {INDUSTRIES.map((ind) => {
            const active = industry === ind;
            return (
              <button
                key={ind}
                onClick={() => { setIndustry(ind); closeGroup(); setLightboxItems(null); setLightboxIndex(null); }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30",
                )}
              >
                {ind}
              </button>
            );
          })}
        </div>

        {activeTile && (
          <button
            onClick={() => { closeGroup(); setLightboxItems(null); setLightboxIndex(null); }}
            className="mt-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back to all use cases
          </button>
        )}

        {loading ? (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="block">
                <div className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
                <div className="mt-3 h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : activeTile ? (
          <div className="mt-6">
            <h3 className="font-heading text-2xl font-semibold text-foreground">{activeTile.title}</h3>
            {activeTile.subtitle && <p className="mt-1 text-sm text-muted-foreground">{activeTile.subtitle}</p>}
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeTile.entries.map((entry, i) => (
                <button
                  key={entry.item.id}
                  onClick={() => { setLightboxItems(null); setLightboxIndex(i); }}
                  className="group block animate-fade-in text-left opacity-0 transition-all duration-500 ease-out hover:-translate-y-1"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted ring-1 ring-border transition-all group-hover:ring-foreground/30">
                    <Thumbnail item={entry.item} priority={i < 4} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="font-heading text-base font-semibold text-foreground">{entry.item.title}</h3>
                    {entry.item.type === "image_carousel" && (
                      <span className="text-xs font-medium text-muted-foreground">{entry.item.images?.length ?? 1}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : topTiles.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">No imagery available for this selection yet.</p>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topTiles.map((tile, i) => (
              <button
                key={tile.id}
                onClick={() => { openGroup(tile.id); setLightboxIndex(null); setLightboxItems(null); }}
                className="group block animate-fade-in text-left opacity-0 transition-all duration-500 ease-out hover:-translate-y-1"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted ring-1 ring-border transition-all group-hover:ring-foreground/30">
                  <Thumbnail item={tile.cover} priority={i < 4} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <h3 className="font-heading text-base font-semibold text-foreground">{tile.title}</h3>
                  <span className="text-xs font-medium text-muted-foreground">{tile.entries.length}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <section className="mt-20 rounded-2xl bg-card p-10 text-center ring-1 ring-border sm:p-16">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to integrate aerial imagery?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Get standardized captures from our verified pilot network and drop them straight into your spatial workflow.
          </p>
          
            <a href="https://spexi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105"
          >
            Request Access
          </a>
        </section>
      </main>

      {activeItem && lightboxIndex !== null && (
        <LightboxViewer
          items={effectiveItems}
          currentIndex={lightboxIndex}
          useCaseId={activeTile?.id ?? "use-case"}
          onClose={() => { setLightboxIndex(null); setLightboxItems(null); }}
        />
      )}
    </div>
  );
};

export default Index;

// A small N/E/S/W/Above cross used as the "5-View API" product card's hero
// image, using one real captured location instead of a single flat photo.
function MiniApiCross() {
  return (
    <div className="aspect-[4/3] overflow-hidden bg-muted p-2">
      <div className="grid h-full grid-cols-3 grid-rows-3 gap-1">
        <div />
        <img src={apiHeroNorth} alt="North" className="h-full w-full rounded object-cover" />
        <div />
        <img src={apiHeroWest} alt="West" className="h-full w-full rounded object-cover" />
        <img src={apiHeroAbove} alt="Above" className="h-full w-full rounded object-cover ring-1 ring-primary/40" />
        <img src={apiHeroEast} alt="East" className="h-full w-full rounded object-cover" />
        <div />
        <img src={apiHeroSouth} alt="South" className="h-full w-full rounded object-cover" />
        <div />
      </div>
    </div>
  );
}

function WorkflowStep({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex gap-5">
      <span className="text-3xl font-extrabold text-primary/40">{step}</span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}
