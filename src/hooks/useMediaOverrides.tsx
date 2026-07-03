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

interface OverridesContextValue {
  overrides: Record<string, MediaOverride>;
  useCases: UseCase[];
  uploads: MediaUpload[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const OverridesContext = createContext<OverridesContextValue | null>(null);

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
    const [ovRes, upRes] = await Promise.all([
      supabase.from("media_overrides").select("media_id,title,category,tags,industry,imagery_type,use_case"),
      supabase
        .from("media_uploads")
        .select("id,use_case_id,media_type,storage_path,thumbnail_path,preview_path,title,category,tags,industry,imagery_type,use_case")
        .order("created_at", { ascending: false }),
    ]);
    if (!ovRes.error && ovRes.data) {
      const map: Record<string, MediaOverride> = {};
      for (const row of ovRes.data) map[row.media_id] = row as MediaOverride;
      setOverrides(map);
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
    return baseUseCases.map((uc) => ({
      ...uc,
      items: [
        ...uc.items.map((it) => applyOverride(it, overrides[it.id])),
        ...(byUseCase[uc.id] ?? []),
      ],
    }));
  }, [overrides, uploadItems, uploads]);

  return (
    <OverridesContext.Provider value={{ overrides, useCases, uploads, loading, refresh }}>
      {children}
    </OverridesContext.Provider>
  );
};

export function useMediaOverrides() {
  const ctx = useContext(OverridesContext);
  if (!ctx) throw new Error("useMediaOverrides must be used inside MediaOverridesProvider");
  return ctx;
}
