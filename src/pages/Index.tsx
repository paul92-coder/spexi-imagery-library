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
import { NianticLogo, EsriLogo, SkywatchLogo } from "@/components/PartnerLogos";

const INDUSTRIES = [
  "All",
  "Construction, Engineering, Architecture",
  "Local Government",
  "Utilities",
  "Insurance",
  "Finance",
  "Commercial Real Estate",
  "Spatial / Physical AI",
  "Other",
] as const;
type Industry = (typeof INDUSTRIES)[number];

const PRODUCT_TYPES = [
  { id: "ortho" as const, label: "Orthomosaics", description: "Survey-grade geo-referenced maps", icon: MapIcon },
  { id: "panorama" as const, label: "360° Panoramas", description: "Immersive aerial perspectives", icon: Globe2 },
  { id: "splat" as const, label: "Gaussian Splats", description: "Photoreal 3D digital twins", icon: Box },
  { id: "api" as const, label: "5-View API", description: "Aerial context as an API", icon: Compass },
];

const BEFORE_AFTER_GROUP = "before-after";

// Before/after items normally get pulled into the cross-use-case "Before &
// After" shelf below. Anything listed here stays in its own use case's
// folder instead — e.g. the wildfire comparison stays under "Catastrophe"
// alongside the flooding photos rather than moving to the shelf.
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
  const beforeAfterEntries = useMemo(
    () =>
      filteredEntries.filter(
        (e) => e.item.type === "before_after" && !BEFORE_AFTER_KEEP_IN_USE_CASE.has(e.item.id),
      ),
    [filteredEntries],
  );

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
      .filter((g) => g.entries.length > 0);
  }, [filteredEntries, allUseCases]);

  const topTiles = useMemo(() => {
    const tiles: { id: string; title: string; subtitle?: string; entries: Entry[] }[] = [];
    if (beforeAfterEntries.length > 0) {
      tiles.push({ id: BEFORE_AFTER_GROUP, title: "Before & After", subtitle: "Change over time, side by side", entries: beforeAfterEntries });
    }
    useCaseGroups.forEach((g) => tiles.push({ id: g.useCase.id, title: g.useCase.title, subtitle: g.useCase.subtitle, entries: g.entries }));
    return tiles;
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
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Spexi Imagery Library</p>
              <h1 className="mt-6 font-heading text-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground break-words sm:text-7xl lg:text-8xl">
                <span className="block">The World,</span>
                <span className="block bg-gradient-to-br from-primary/90 via-primary to-primary/70 bg-clip-text text-transparent">
                  Standardized.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-xl">
                Standardized aerial imagery captured by a verified pilot network. High-fidelity orthomosaics, 360°
                panoramas, 5-View API responses, and Gaussian splats — ready to drop into any spatial workflow.
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

        <section className="relative z-10 mt-12">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            In Collaboration With
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <div className="flex h-10 items-center text-muted-foreground transition-colors hover:text-foreground">
              <NianticLogo className="h-6 w-auto" />
            </div>
            <div className="flex h-10 items-center text-muted-foreground transition-colors hover:text-foreground">
              <EsriLogo className="h-6 w-auto" />
            </div>
            <div className="flex h-10 items-center text-muted-foreground transition-colors hover:text-foreground">
              <SkywatchLogo className="h-6 w-auto" />
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-10 border-t border-border/60 pt-12 md:grid-cols-3 md:gap-12">
          <WorkflowStep step="01" title="Request imagery" body="Order a capture through the Spexi platform." />
          <WorkflowStep step="02" title="Captured by pilot network" body="Verified pilots fly to a standardized spec — every time, everywhere." />
          <WorkflowStep step="03" title="Integrated into your GIS systems" body="Receive orthomosaics, 360° panoramas, 5-View API responses, and Gaussian splats — ready to drop into any spatial workflow." />
        </section>

        <section className="mt-16 border-t border-border/60 pt-12">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Browse by Product
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">Explore imagery by type</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCT_TYPES.map((pt) => (
              <Link
                key={pt.id}
                to={`/product-type/${pt.id}`}
                className="group relative block overflow-hidden rounded-xl bg-card ring-1 ring-border transition-all hover:-translate-y-1 hover:ring-foreground/30"
              >
                <div className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <pt.icon size={24} />
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">{pt.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pt.description}</p>
                </div>
              </Link>
            ))}
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
                  <Thumbnail item={tile.entries[0].item} priority={i < 4} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
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
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}
    </div>
  );
};

export default Index;

function WorkflowStep({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="flex gap-5">
      <span className="text-3xl font-extrabold text-primary/40">{step}</span>
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
