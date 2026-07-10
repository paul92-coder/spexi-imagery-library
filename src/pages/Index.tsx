import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearchParams, Link } from "react-router-dom";
import { Box, Map as MapIcon, Globe2, Compass, ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import Header from "@/components/Header";
import LightboxViewer from "@/components/LightboxViewer";
import Thumbnail from "@/components/Thumbnail";
import { type MediaItem, type UseCase } from "@/data/gallery-data";
import { useMediaOverrides } from "@/hooks/useMediaOverrides";
import { cn } from "@/lib/utils";
import droneBg from "@/assets/drone-bg.jpg";
import { HERO_VIDEO_URL } from "@/data/media-cdn";

const INDUSTRIES = [
  "All",
  "Construction, Engineering, Architecture",
  "Local Government",
  "Utilities",
  "Insurance",
  "Commercial Real Estate",
  "Spatial / Physical AI",
] as const;
type Industry = (typeof INDUSTRIES)[number];

// Static Images is the foundation every flight produces; the other three
// are downstream products generated from that same capture (see the "One
// flight, creates multiple data products" funnel section below).
const PRODUCT_TYPES = [
  { id: "api" as const, label: "Static Images", description: "Filtered static images from multiple angles and orientations.", icon: Compass, imageType: "api" as const },
  { id: "ortho" as const, label: "Orthomosaics", description: "Site-specific geo-referenced maps.", icon: MapIcon, imageType: "orthomosaic" as const },
  { id: "panorama" as const, label: "360° Panoramas", description: "Immersive aerial perspectives.", icon: Globe2, imageType: "oblique" as const },
  { id: "splat" as const, label: "Gaussian Splats", description: "Realistic, measurable world models.", icon: Box, imageType: "splat" as const },
];

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
              <h1 className="font-heading text-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground break-words sm:text-7xl lg:text-8xl">
                <span className="block">Spexi</span>
                <span className="block bg-gradient-to-br from-primary/90 via-primary to-primary/70 bg-clip-text text-transparent">
                  Image Gallery
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-xl">
                Explore standardized drone imagery.
              </p>
            </div>
            
              <a href="https://www.spexi.com/book-a-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105"
            >
              Request Access
            </a>
          </div>
        </section>

        <section className="mt-16 grid gap-10 border-t border-border/60 pt-12 md:grid-cols-3 md:gap-12">
          <WorkflowStep step="01" title="Subscribe to recurring change" icon={<Calendar size={26} strokeWidth={1.25} />} />
          <WorkflowStep step="02" title="Task collections" icon={<DroneIcon size={26} strokeWidth={1.25} />} />
          <WorkflowStep step="03" title="Build world models" icon={<MapIcon size={26} strokeWidth={1.25} />} />
        </section>

        <section className="mt-16 border-t border-border/60 pt-12">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            One flight, creates multiple data products
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Every capture starts as static images — and becomes orthomosaics, panoramas, and splats.
          </p>

          <div className="mt-10 flex flex-col items-center">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                <DroneIcon size={28} strokeWidth={1.25} />
              </div>
              <span className="text-xs font-semibold text-foreground">One flight</span>
              <span className="max-w-[10rem] text-center text-[11px] text-muted-foreground">Single autonomous capture</span>
            </div>

            <div className="h-6 w-px bg-primary/40" />

            <Link
              to={`/product-type/${PRODUCT_TYPES[0].id}`}
              className="group w-full max-w-xs rounded-2xl border border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 text-center shadow-[0_0_40px_-12px] shadow-primary/40 transition-transform hover:scale-[1.02]"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Foundation</span>
              <h3 className="mt-1.5 font-heading text-lg font-semibold text-foreground">{PRODUCT_TYPES[0].label}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{PRODUCT_TYPES[0].description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                View product
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <div className="h-6 w-px bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Becomes</span>
            <div className="h-6 w-px bg-border md:hidden" />

            {/* Branch connector: one line splitting into three, aligned to the
                card grid below via matching grid-cols-3 tracks (no JS measurement). */}
            <div className="mt-6 hidden w-full max-w-3xl md:block">
              <div className="h-px w-full bg-border" />
              <div className="grid grid-cols-3">
                {PRODUCT_TYPES.slice(1).map((pt) => (
                  <div key={pt.id} className="flex justify-center">
                    <div className="h-6 w-px bg-border" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-0 grid w-full max-w-xs grid-cols-1 gap-3 md:max-w-3xl md:grid-cols-3">
              {PRODUCT_TYPES.slice(1).map((pt) => (
                <Link
                  key={pt.id}
                  to={`/product-type/${pt.id}`}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-center transition-colors hover:border-primary/40 hover:bg-card/80"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <pt.icon size={18} />
                  </span>
                  <span className="block text-sm font-semibold text-foreground">{pt.label}</span>
                  <span className="block text-xs text-muted-foreground">{pt.description}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    View product
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div id="use-cases" className="scroll-mt-24 mt-16 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Use cases</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Explore standardized imagery across industries.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {INDUSTRIES.filter((ind) => ind !== "All").map((ind) => {
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
          
            <a href="https://www.spexi.com/book-a-demo"
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

function WorkflowStep({ step, title, icon }: { step: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-3xl font-extrabold text-primary/40">{step}</span>
      <span className="text-white/90">{icon}</span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

// Lucide doesn't ship a drone glyph in the pinned version here, so this
// hand-drawn line icon matches its 24x24 stroke style (body + 4 rotor arms).
function DroneIcon({ size = 24, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 9 4 4" />
      <path d="M15 9l5-5" />
      <path d="M9 15l-5 5" />
      <path d="M15 15l5 5" />
      <circle cx="3.5" cy="3.5" r="2" />
      <circle cx="20.5" cy="3.5" r="2" />
      <circle cx="3.5" cy="20.5" r="2" />
      <circle cx="20.5" cy="20.5" r="2" />
    </svg>
  );
}
