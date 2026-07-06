import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Layers, Zap, Globe2, Sparkles, Box, Map as MapIcon, Compass, MapPin, Code2, Workflow, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Thumbnail from "@/components/Thumbnail";
import LightboxViewer from "@/components/LightboxViewer";
import { type MediaItem, type UseCase } from "@/data/gallery-data";
import { useMediaOverrides } from "@/hooks/useMediaOverrides";
import { PANORAMA_HERO_VIDEO_URL } from "@/data/media-cdn";
import { cn } from "@/lib/utils";

type ProductType = "splat" | "ortho" | "panorama" | "api";

const DIRECTION_LABELS: Record<string, string> = {
  north: "North",
  east: "East",
  south: "South",
  west: "West",
  above: "Above",
};
const getDirection = (item: MediaItem) => item.tags?.find((t) => t in DIRECTION_LABELS);

// Picks the location (grouped by title) with the most direction-tagged
// images, so the hero sample grid shows a real, consistent 5-view set
// once one exists, instead of mixing images from different locations.
const pickHeroLocation = (entries: { item: MediaItem; useCase: UseCase }[]) => {
  const groups = new Map<string, MediaItem[]>();
  for (const { item } of entries) {
    const key = item.title || "Untitled location";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  let best: MediaItem[] = [];
  for (const items of groups.values()) {
    if (items.length > best.length) best = items;
  }
  return best;
};

interface ProductConfig {
  badge: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  features: { title: string; body: string; icon: React.ReactNode }[];
  match: (i: MediaItem) => boolean;
}

const PRODUCTS: Record<ProductType, ProductConfig> = {
  splat: {
    badge: "Spexi Gaussian Splats",
    title: "Photoreal 3D, built from the sky.",
    subtitle:
      "Orbit, fly through, and measure entire sites in interactive 3D. Spexi Gaussian Splats turn a single capture into a photoreal digital twin your team can explore from any angle — no specialized hardware required.",
    icon: <Box size={12} />,
    features: [
      { title: "Interactive", body: "Orbit, pan, and zoom in real time.", icon: <Sparkles size={14} /> },
      { title: "Photoreal", body: "Lighting and materials preserved.", icon: <Layers size={14} /> },
      { title: "Web-ready", body: "Embed anywhere with a single link.", icon: <Globe2 size={14} /> },
      { title: "Scalable", body: "From a single site to a full portfolio.", icon: <Zap size={14} /> },
    ],
    match: (i) => i.imageType === "splat",
  },
  ortho: {
    badge: "Spexi Orthomosaics",
    title: "Survey-grade maps, on your schedule.",
    subtitle:
      "Geo-referenced, high-resolution orthomosaic maps you can pan, zoom, and measure on. Spexi pilots capture and stitch them so your team gets a clean basemap without the field work.",
    icon: <MapIcon size={12} />,
    features: [
      { title: "Geo-accurate", body: "Aligned to real-world coordinates.", icon: <Compass size={14} /> },
      { title: "High resolution", body: "Inspect detail down to the pixel.", icon: <Layers size={14} /> },
      { title: "Interactive", body: "Pan and zoom like any web map.", icon: <Globe2 size={14} /> },
      { title: "Repeatable", body: "Re-fly anytime for change detection.", icon: <Zap size={14} /> },
    ],
    match: (i) => i.imageType === "orthomosaic",
  },
  panorama: {
    badge: "Spexi 360° Panoramas",
    title: "Every angle, from a single point.",
    subtitle:
      "Immersive 360° aerial panoramas that let your team look in any direction from a precise location. Perfect for site context, situational awareness, and stakeholder walkthroughs.",
    icon: <Globe2 size={12} />,
    features: [
      { title: "Immersive", body: "Look in any direction from above.", icon: <Sparkles size={14} /> },
      { title: "High clarity", body: "Crisp detail across the full sphere.", icon: <Layers size={14} /> },
      { title: "Shareable", body: "Send a link, get instant context.", icon: <Globe2 size={14} /> },
      { title: "Repeatable", body: "Same vantage, every visit.", icon: <Zap size={14} /> },
    ],
    match: (i) => i.imageType === "oblique",
  },
  api: {
    badge: "Spexi 5-View API",
    title: "Aerial context, as an API.",
    subtitle:
      "Drop coordinates into your stack and get back five calibrated perspectives of any address — wired directly into your product, your underwriting flow, or your field ops dashboard.",
    icon: <Compass size={12} />,
    features: [
      { title: "REST + JSON", body: "One endpoint. Bearer auth. Predictable schema.", icon: <Code2 size={14} /> },
      { title: "Address or lat/lng", body: "Resolve either input to the nearest capture.", icon: <MapPin size={14} /> },
      { title: "Drop-in workflow", body: "Plug straight into existing pipelines.", icon: <Workflow size={14} /> },
      { title: "Portfolio-ready", body: "Batch coordinates for entire books of business.", icon: <Layers size={14} /> },
    ],
    match: (i) => i.imageType === "api",
  },
};

const ProductTypePage = () => {
  const { type } = useParams<{ type: string }>();
  if (!type || !(type in PRODUCTS)) return <Navigate to="/" replace />;
  return <ProductTypePageInner type={type as ProductType} cfg={PRODUCTS[type as ProductType]} />;
};

const ProductTypePageInner = ({ type, cfg }: { type: ProductType; cfg: ProductConfig }) => {
  const { useCases: allUseCases, loading } = useMediaOverrides();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const folder = searchParams.get("folder");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const prevFolderRef = useRef<string | null>(null);

  // Folder drill-in is reflected in the URL (?folder=) and pushed onto
  // browser history, so the back button steps back out of a folder instead
  // of leaving the page entirely.
  const openFolder = (name: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("folder", name);
      return next;
    });
  };
  const closeFolder = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("folder");
      return next;
    }, { replace: true });
  };

  const scrollToSectionTop = (id: string, offset = 88) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "instant" as ScrollBehavior });
    });
  };

  useEffect(() => {
    if (folder === null && prevFolderRef.current !== null) {
      scrollToSectionTop("browse-section");
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
    prevFolderRef.current = folder;
  }, [type, folder]);

  useEffect(() => {
    if (!folder && location.hash === "#browse-section") scrollToSectionTop("browse-section");
  }, [folder, location.hash, location.key]);

  const matchingEntries = useMemo(() => {
    const out: { item: MediaItem; useCase: UseCase }[] = [];
    allUseCases.forEach((uc) => uc.items.forEach((item) => { if (cfg.match(item)) out.push({ item, useCase: uc }); }));
    return out;
  }, [cfg, allUseCases]);

  const folders = useMemo(() => {
    type EntryT = { item: MediaItem; useCase: UseCase };
    const groups: Map<string, EntryT[]> = new Map();
    for (const entry of matchingEntries) {
      const key = type === "api" ? entry.item.title || "Untitled location" : entry.useCase.title;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    }
    return Array.from(groups.entries()).map(([name, entries]) => ({ name, entries }));
  }, [matchingEntries, type]);

  const folderItems = useMemo(() => {
    if (!folder) {
      if (type !== "api" && folders.length === 1) return folders[0].entries.map((e) => e.item);
      return [];
    }
    return (folders.find((f) => f.name === folder)?.entries || []).map((e) => e.item);
  }, [folder, folders, type]);

  const showItemsInline = !folder && type !== "api" && folders.length === 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[1500px] px-4 pt-24 pb-16 sm:px-6">
        {!folder && (
          <>
            <div className="mt-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
              <div className="max-w-xl">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {cfg.icon} {cfg.badge}
                </span>
                <h1 className="mt-4 font-heading text-3xl font-bold leading-[1.05] tracking-tight text-foreground break-words sm:text-5xl lg:text-6xl">
                  {cfg.title}
                </h1>
                <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">{cfg.subtitle}</p>

                <div className="mt-8 grid grid-cols-2 gap-3 max-w-3xl">
                  {cfg.features.map((f, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card/40 p-3.5 backdrop-blur-sm transition-colors hover:border-primary/40">
                      <div className="flex items-center gap-2 text-primary">
                        {f.icon}
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">{f.title}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              {type === "api" && <ApiSampleGrid entries={matchingEntries} />}
              {type !== "api" && <HeroShowcase entries={matchingEntries} type={type} />}
            </div>

            <div className="mt-12 flex flex-col items-center justify-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Browse</span>
              <div className="animate-bounce">
                <ChevronDown size={20} className="text-muted-foreground" />
              </div>
            </div>

            {type === "api" && <ApiDetails />}
          </>
        )}

        {folder ? (
          <button
            onClick={() => { closeFolder(); setLightboxIndex(null); }}
            className="mt-16 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back to {type === "api" ? "all locations" : "all use cases"}
          </button>
        ) : (
          <Link
            to="/#use-cases"
            state={{ scrollTarget: "use-cases" }}
            className="mt-16 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back to Library
          </Link>
        )}

        <div id="browse-section" className="scroll-mt-24 mt-4 flex items-end justify-between">
          <h2 className="font-heading text-2xl font-semibold text-foreground">
            {folder ? (
              <>
                <button onClick={() => { closeFolder(); setLightboxIndex(null); }} className="text-muted-foreground hover:text-foreground">
                  {type === "api" ? "All locations" : "All use cases"}
                </button>
                <span className="text-muted-foreground"> / </span>
                {folder}
              </>
            ) : type === "api" ? "Browse by location" : showItemsInline ? folders[0].name : "Browse by use case"}
          </h2>
          {!folder && !showItemsInline && (
            <span className="text-xs text-muted-foreground">{folders.length} {folders.length === 1 ? "folder" : "folders"}</span>
          )}
        </div>

        {loading ? (
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : !folder && !showItemsInline ? (
          folders.length === 0 ? (
            <p className="mt-16 text-center text-muted-foreground">No imagery uploaded yet.</p>
          ) : (
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((f, i) => {
                const cover = f.entries[0]?.item;
                return (
                  <button
                    key={f.name}
                    onClick={() => { openFolder(f.name); setLightboxIndex(null); }}
                    className="group block animate-fade-in text-left opacity-0 transition-all hover:-translate-y-1"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-all group-hover:ring-foreground/30">
                      {cover && <Thumbnail item={cover} priority={i === 0} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 px-1">
                      <h3 className="font-heading text-sm font-semibold text-foreground">{f.name}</h3>
                      <span className="text-xs font-medium text-muted-foreground">
                        {f.entries.reduce((sum, e) => sum + (e.item.type === "image_carousel" ? (e.item.images?.length ?? 1) : 1), 0)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : folderItems.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">No imagery in this folder yet.</p>
        ) : (
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {folderItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setLightboxIndex(i)}
                className="group block animate-fade-in text-left opacity-0 transition-all hover:-translate-y-1"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-all group-hover:ring-foreground/30">
                  <Thumbnail item={item} priority={i === 0} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                {item.title && (
                  <div className="mt-3 px-1 text-sm font-medium text-foreground">
                    {item.title}
                    {type === "api" && getDirection(item) && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        · {DIRECTION_LABELS[getDirection(item)!]}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {lightboxIndex !== null && folderItems[lightboxIndex] && (
        <LightboxViewer
          items={folderItems}
          currentIndex={lightboxIndex}
          useCaseId={type}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};

export default ProductTypePage;

const HOW_TO_USE = [
  { step: "01", title: "Authenticate", body: "Generate an API key from your Spexi workspace and include it as a bearer token." },
  { step: "02", title: "Send coordinates", body: "POST a lat/lng or street address. We resolve it to the nearest verified capture." },
  { step: "03", title: "Receive five views", body: "Get back signed URLs for north, east, south, west and above — ready to render." },
];

const INDUSTRIES_LIST = [
  "Insurance",
  "Commercial Real Estate",
  "Local Government",
  "Utilities",
  "Construction, Engineering & Architecture",
  "Finance",
  "Spatial / Physical AI",
];

function ApiSampleGrid({ entries }: { entries: { item: MediaItem; useCase: UseCase }[] }) {
  const heroItems = useMemo(() => pickHeroLocation(entries), [entries]);
  const byDirection: Partial<Record<string, MediaItem>> = {};
  for (const item of heroItems) {
    const dir = getDirection(item);
    if (dir && !byDirection[dir]) byDirection[dir] = item;
  }
  const hasAny = Object.keys(byDirection).length > 0;

  return (
    <div className="relative mt-8 lg:mt-0">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-primary/5 blur-2xl" />
      <div className="relative rounded-2xl border border-border bg-card/40 p-4 backdrop-blur-sm sm:p-5">
        <div className="grid grid-cols-3 grid-rows-3 gap-2 sm:gap-3" style={{ aspectRatio: "1/1" }}>
          <div />
          <SampleTile label="North" item={byDirection.north} />
          <div />
          <SampleTile label="West" item={byDirection.west} />
          <SampleTile label="Above" item={byDirection.above} highlight />
          <SampleTile label="East" item={byDirection.east} />
          <div />
          <SampleTile label="South" item={byDirection.south} />
          <div />
        </div>
        {!hasAny && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sample tiles shown — live captures populate this grid once a location has been requested.
          </p>
        )}
      </div>
    </div>
  );
}

function ApiDetails() {
  return (
    <section className="mt-16 space-y-12">
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sample response</span>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">One request. Five calibrated angles.</h3>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Every response returns the same five perspectives so your UI, models, and analysts always know what
          they're looking at — no matter where in the country the capture came from.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-card/60 p-4 font-mono text-xs text-foreground/90 backdrop-blur-sm">
{`POST /v1/5-view
{ "lat": 25.7741, "lng": -80.1936 }

→ { north, east, south, west, above }`}
        </pre>
      </div>

      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">How to use</span>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">From coordinates to imagery in three steps.</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {HOW_TO_USE.map((s) => (
            <div key={s.step} className="rounded-xl border border-border bg-card/40 p-5 backdrop-blur-sm">
              <span className="font-mono text-xs text-primary">{s.step}</span>
              <h4 className="mt-2 font-heading text-base font-semibold text-foreground">{s.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Built for</span>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">Teams that need verified ground truth.</h3>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Used by product, underwriting, and operations teams across:</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {INDUSTRIES_LIST.map((label) => (
            <span key={label} className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground">
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroShowcase({ entries, type }: { entries: { item: MediaItem; useCase: UseCase }[]; type: ProductType }) {
  if (type === "panorama") {
    return (
      <div className="relative mt-8 lg:mt-0">
        <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-primary/5 blur-2xl" />
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-3 backdrop-blur-sm">
          <div className="overflow-hidden rounded-xl bg-muted ring-1 ring-border" style={{ aspectRatio: "4/3" }}>
            <video src={PANORAMA_HERO_VIDEO_URL} autoPlay loop muted playsInline preload="metadata" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    );
  }
  const hero = entries[0]?.item;
  const thumbs = entries.slice(1, 5).map((e) => e.item);
  if (!hero) return null;
  return (
    <div className="relative mt-8 lg:mt-0">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-primary/5 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-3 backdrop-blur-sm">
        <div className="overflow-hidden rounded-xl bg-muted ring-1 ring-border" style={{ aspectRatio: "4/3" }}>
          <Thumbnail item={hero} priority className="h-full w-full object-cover" />
        </div>
        {thumbs.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {thumbs.map((it) => (
              <div key={it.id} className="aspect-square overflow-hidden rounded-md bg-muted ring-1 ring-border">
                <Thumbnail item={it} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SampleTile({ label, item, highlight }: { label: string; item?: MediaItem; highlight?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-muted ring-1 ring-border aspect-square", highlight && "ring-primary/50")}>
      {item ? (
        <Thumbnail item={item} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No {label.toLowerCase()}</div>
      )}
      <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground shadow-md">
        {label}
      </span>
    </div>
  );
}
