import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCases as baseUseCases, type MediaItem, type UseCase } from "@/data/gallery-data";

export interface MediaOverride {
  media_id: string;
  title: string | null;
  category: string | null;
  tags: string[];
  industry: string | null;
  imagery_type: string | null;
  use_case: string | null;
}

export interface MediaUpload {
  id: string;
  use_case_id: string;
  media_type: "image" | "video";
  storage_path: string;
  thumbnail_path: string | null;
  preview_path: string | null;
  title: string | null;
  category: string | null;
  tags: string[];
  industry: string | null;
  imagery_type: string | null;
  use_case: string | null;
}

export interface FolderSetting {
  folder_id: string;
  hidden: boolean;
}

export interface CustomFolder {
  id: string;
  title: string;
  subtitle: string | null;
}

interface OverridesContextValue {
  overrides: Record<string, MediaOverride>;
  useCases: UseCase[];
  uploads: MediaUpload[];
  folderSettings: Record<string, FolderSetting>;
  loading: boolean;
  refresh: () => Promise<void>;
  // Admin-created folders (see custom_folders table) that don't exist in the
  // static gallery-data.ts seed. Slugifies the title into an id, unique
  // against every existing base + custom folder id, and returns it.
  createFolder: (title: string, subtitle?: string) => Promise<string>;
}

const OverridesContext = createContext<OverridesContextValue | null>(null);

const DIRECTION_ORDER = ["north", "east", "south", "west", "above"];
const getDirection = (item: MediaItem) => item.tags?.find((t) => DIRECTION_ORDER.includes(t));

// 5-View API captures are uploaded as separate same-titled rows, one per
// direction. Bundle any that share a title into a single image_carousel
// item so they're browsed together (N/E/S/W/Above) wherever this folder's
// items are displayed — not just on the dedicated 5-View API product page —
// even standalone items with no siblings are left as plain images.
function groupApiViews(items: MediaItem[]): MediaItem[] {
  const groups = new Map<string, MediaItem[]>();
  const passthrough: MediaItem[] = [];
  for (const item of items) {
    if (item.imageType === "api" && item.title) {
      if (!groups.has(item.title)) groups.set(item.title, []);
      groups.get(item.title)!.push(item);
    } else {
      passthrough.push(item);
    }
  }
  const grouped: MediaItem[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      grouped.push(group[0]);
      continue;
    }
    const sorted = [...group].sort((a, b) => {
      const ai = DIRECTION_ORDER.indexOf(getDirection(a) ?? "");
      const bi = DIRECTION_ORDER.indexOf(getDirection(b) ?? "");
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const cover = sorted.find((it) => getDirection(it) === "above") ?? sorted[0];
    grouped.push({
      ...cover,
      id: `api-group-${cover.title.toLowerCase().replace(/\s+/g, "-")}`,
      type: "image_carousel",
      images: sorted.map((it) => {
        const dir = getDirection(it);
        return { src: it.src ?? it.thumbnail, title: dir ? dir[0].toUpperCase() + dir.slice(1) : it.title };
      }),
    });
  }
  return [...passthrough, ...grouped];
}

const PAIR_TAG_PREFIX = "before-after-pair:";
const ROLE_BEFORE = "role:before";
const ROLE_AFTER = "role:after";

// Before/after comparisons are uploaded as two separate rows sharing a
// `before-after-pair:<id>` tag plus a `role:before`/`role:after` tag.
// Merge each complete pair into a single before_after item; an incomplete
// pair (e.g. only one side uploaded so far) is left as plain images.
function groupBeforeAfterPairs(items: MediaItem[]): MediaItem[] {
  const groups = new Map<string, MediaItem[]>();
  const passthrough: MediaItem[] = [];
  for (const item of items) {
    const pairTag = item.tags?.find((t) => t.startsWith(PAIR_TAG_PREFIX));
    if (pairTag) {
      const key = pairTag.slice(PAIR_TAG_PREFIX.length);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    } else {
      passthrough.push(item);
    }
  }
  const grouped: MediaItem[] = [];
  const cleanTags = (it: MediaItem) => (it.tags ?? []).filter((t) => !t.startsWith(PAIR_TAG_PREFIX) && t !== ROLE_BEFORE && t !== ROLE_AFTER);
  for (const group of groups.values()) {
    const before = group.find((it) => it.tags?.includes(ROLE_BEFORE));
    const after = group.find((it) => it.tags?.includes(ROLE_AFTER));
    if (before && after) {
      grouped.push({
        ...before,
        id: `before-after-${before.id}`,
        type: "before_after",
        beforeSrc: before.src,
        afterSrc: after.src,
        thumbnail: before.thumbnail,
        tags: Array.from(new Set([...cleanTags(before), ...cleanTags(after)])),
      });
    } else {
      grouped.push(...group.map((it) => ({ ...it, tags: cleanTags(it) })));
    }
  }
  return [...passthrough, ...grouped];
}

function applyOverride(item: MediaItem, ov?: MediaOverride): MediaItem {
  if (!ov) return item;
  return {
    ...item,
    title: ov.title ?? item.title,
    category: ov.category ?? item.category,
    tags: ov.tags ?? [],
    industry: ov.industry ?? item.industry,
    imageryType: ov.imagery_type ?? item.imageryType,
    // Keep slider items in their original use-case folders — don't regroup before/after
    useCase: item.type === "before_after" ? item.useCase : (ov.use_case ?? item.useCase),
  };
}

export const MediaOverridesProvider = ({ children }: { children: ReactNode }) => {
  const [overrides, setOverrides] = useState<Record<string, MediaOverride>>({});
  const [uploads, setUploads] = useState<MediaUpload[]>([]);
  const [uploadItems, setUploadItems] = useState<MediaItem[]>([]);
  const [folderSettings, setFolderSettings] = useState<Record<string, FolderSetting>>({});
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const signedUrl = async (path: string) => {
    try {
      // First try to get a signed URL
      const { data, error } = await supabase.storage
        .from("media-uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      
      if (data?.signedUrl) return data.signedUrl;

      // Fallback to public URL
      const { data: publicData } = supabase.storage.from("media-uploads").getPublicUrl(path);
      return publicData?.publicUrl ?? "";
    } catch (err) {
      console.error("Error generating URL:", err);
      return "";
    }
  };

  const refresh = async () => {
    const [ovRes, upRes, folderRes, customFolderRes] = await Promise.all([
      supabase.from("media_overrides").select("media_id,title,category,tags,industry,imagery_type,use_case"),
      supabase
        .from("media_uploads")
        .select("id,use_case_id,media_type,storage_path,thumbnail_path,preview_path,title,category,tags,industry,imagery_type,use_case")
        .order("created_at", { ascending: false }),
      supabase.from("folder_settings").select("folder_id,hidden"),
      supabase.from("custom_folders").select("id,title,subtitle").order("created_at", { ascending: true }),
    ]);
    if (!ovRes.error && ovRes.data) {
      const map: Record<string, MediaOverride> = {};
      for (const row of ovRes.data) map[row.media_id] = row as MediaOverride;
      setOverrides(map);
    }
    if (!customFolderRes.error && customFolderRes.data) {
      setCustomFolders(customFolderRes.data as CustomFolder[]);
    }
    if (!folderRes.error && folderRes.data) {
      const map: Record<string, FolderSetting> = {};
      for (const row of folderRes.data as FolderSetting[]) map[row.folder_id] = row;
      setFolderSettings(map);
    }
    if (!upRes.error && upRes.data) {
      const rows = upRes.data as MediaUpload[];
      setUploads(rows);
      const items = await Promise.all(
        rows.map(async (u): Promise<MediaItem> => {
          const url = await signedUrl(u.storage_path);
          const thumb = u.thumbnail_path ? await signedUrl(u.thumbnail_path) : url;
          const previewVideo =
            u.media_type === "video"
              ? u.preview_path
                ? await signedUrl(u.preview_path)
                : url
              : undefined;
          const it = u.imagery_type;
          const imageType =
            it === "Gaussian splat"
              ? "splat"
              : it === "Orthomosaic" || it === "Orthomosiac"
                ? "orthomosaic"
                : it === "5-View API"
                  ? "api"
                  : "oblique";
          return {
            id: `upload-${u.id}`,
            type: u.media_type,
            imageType,
            title: u.title ?? undefined,
            category: u.category ?? undefined,
            thumbnail: thumb,
            thumbnailVideo: previewVideo,
            src: u.media_type === "image" ? url : undefined,
            videoSrc: u.media_type === "video" ? url : undefined,
            tags: u.tags ?? [],
            industry: u.industry ?? undefined,
            imageryType: u.imagery_type ?? undefined,
            useCase: u.use_case ?? undefined,
          };
        }),
      );
      setUploadItems(items);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const useCases = useMemo<UseCase[]>(() => {
    const byUseCase: Record<string, MediaItem[]> = {};
    for (const it of uploadItems) {
      const key = uploads.find((u) => `upload-${u.id}` === it.id)?.use_case_id ?? "uploads";
      (byUseCase[key] ||= []).push(it);
    }
    // Admin-created folders (custom_folders table) start empty and sit
    // alongside the static gallery-data.ts seed — they only need a cover once
    // an upload lands in them, which the tile-cover logic on the home page
    // already derives from the first item's thumbnail.
    const allBaseUseCases: UseCase[] = [
      ...baseUseCases,
      ...customFolders.map((cf) => ({
        id: cf.id,
        title: cf.title,
        subtitle: cf.subtitle ?? undefined,
        coverImage: "",
        items: [],
      })),
    ];
    return allBaseUseCases.map((uc) => ({
      ...uc,
      // A folder can be hidden either in code (permanent, e.g. Uploads) or
      // live via the Admin panel's Folders toggle — either one hides it.
      hideFromHome: uc.hideFromHome || !!folderSettings[uc.id]?.hidden,
      items: groupApiViews(groupBeforeAfterPairs([
        ...uc.items.map((it) => applyOverride(it, overrides[it.id])),
        ...(byUseCase[uc.id] ?? []),
      ])),
    }));
  }, [overrides, uploadItems, uploads, folderSettings, customFolders]);

  const createFolder = async (title: string, subtitle?: string) => {
    const existingIds = new Set(useCases.map((uc) => uc.id));
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "") || "folder";
    let id = slug;
    for (let n = 2; existingIds.has(id); n++) id = `${slug}-${n}`;
    const { error } = await supabase.from("custom_folders").insert({ id, title: title.trim(), subtitle: subtitle?.trim() || null });
    if (error) throw error;
    await refresh();
    return id;
  };

  return (
    <OverridesContext.Provider value={{ overrides, useCases, uploads, folderSettings, loading, refresh, createFolder }}>
      {children}
    </OverridesContext.Provider>
  );
};

export function useMediaOverrides() {
  const ctx = useContext(OverridesContext);
  if (!ctx) throw new Error("useMediaOverrides must be used inside MediaOverridesProvider");
  return ctx;
}
