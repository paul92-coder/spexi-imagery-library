import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { X, LogOut, Upload, Trash2, Eye, EyeOff } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useMediaOverrides } from "@/hooks/useMediaOverrides";
import { useCases as baseUseCases, type MediaItem } from "@/data/gallery-data";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Row {
  mediaId: string;
  useCaseTitle: string;
  baseTitle?: string;
  baseCategory?: string;
  title: string;
  category: string;
  tags: string[];
  industry: string;
  imageryType: string;
  folderId: string;
  thumbnail: string;
  dirty: boolean;
  saving: boolean;
  isUpload?: boolean;
  uploadId?: string;
  storagePath?: string;
}

const INDUSTRY_OPTIONS = [
  "Construction, Engineering, Architecture",
  "Local Government",
  "Utilities",
  "Insurance",
  "Finance",
  "Commercial Real Estate",
  "Spatial / Physical AI",
  "Other",
];

// An item matches multiple industries by storing one as the primary
// `industry` column and the rest as plain tags (see Index.tsx's filter,
// which matches on either). These helpers keep that in sync with a
// multi-select UI instead of admins hand-managing tags for it.
const getSelectedIndustries = (row: { industry: string; tags: string[] }) => {
  const selected = new Set<string>();
  if (row.industry) selected.add(row.industry);
  row.tags.forEach((t) => { if (INDUSTRY_OPTIONS.includes(t)) selected.add(t); });
  return selected;
};

const toggleIndustry = (row: { industry: string; tags: string[] }, value: string) => {
  const selected = getSelectedIndustries(row);
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  const list = Array.from(selected);
  return {
    industry: list[0] ?? "",
    tags: [...row.tags.filter((t) => !INDUSTRY_OPTIONS.includes(t)), ...list.slice(1)],
  };
};

const IMAGERY_TYPE_OPTIONS = [
  "360 degree panorama",
  "Orthomosaic",
  "Gaussian splat",
  "Oblique",
  "5-View API",
];

const DIRECTION_TAGS = ["north", "east", "south", "west", "above"] as const;

// The home-page folder an item lives in — distinct from the free-text
// "Use case" tag below, which is just a purpose label (e.g. "Progress
// tracking") and doesn't affect where an item is displayed.
const FOLDER_OPTIONS = baseUseCases.map((uc) => ({ id: uc.id, title: uc.title }));

type FolderId = "splat" | "ortho" | "panorama" | "api" | "other";
const FOLDERS: { id: FolderId; label: string; match: (r: Row) => boolean }[] = [
  { id: "splat", label: "Gaussian Splats", match: (r) => r.imageryType === "Gaussian splat" },
  { id: "ortho", label: "Orthomosaics", match: (r) => r.imageryType === "Orthomosaic" || r.imageryType === "Orthomosiac" },
  { id: "panorama", label: "360° Panoramas / Oblique", match: (r) => r.imageryType === "360 degree panorama" || r.imageryType === "Oblique" },
  { id: "api", label: "Spexi 5-View API", match: (r) => r.imageryType === "5-View API" },
  { id: "other", label: "Uncategorized", match: () => true },
];

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { overrides, uploads, folderSettings, refresh } = useMediaOverrides();
  const [rows, setRows] = useState<Row[]>([]);
  const [tagDraft, setTagDraft] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<FolderId | "all">("all");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Upload form state
  const [upFiles, setUpFiles] = useState<File[]>([]);
  const [upFolder, setUpFolder] = useState<string>("uploads");
  const [upIndustries, setUpIndustries] = useState<string[]>([]);
  const [upImageryType, setUpImageryType] = useState<string>("Oblique");
  const [upTitle, setUpTitle] = useState("");
  const [upCategory, setUpCategory] = useState("");
  const [upTags, setUpTags] = useState("");
  const [upFileTags, setUpFileTags] = useState<Record<number, string[]>>({});
  const [upIsBeforeAfter, setUpIsBeforeAfter] = useState(false);
  const [upBeforeAfterRoles, setUpBeforeAfterRoles] = useState<Record<number, "before" | "after">>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const beforeAfterValid =
    !upIsBeforeAfter ||
    (upFiles.length === 2 &&
      Object.keys(upBeforeAfterRoles).length === 2 &&
      new Set(Object.values(upBeforeAfterRoles)).size === 2);

  // Build rows from base data + current overrides
  useEffect(() => {
    const next: Row[] = [];
    baseUseCases.forEach((uc) => {
      uc.items.forEach((item: MediaItem) => {
        const ov = overrides[item.id];
        next.push({
          mediaId: item.id,
          useCaseTitle: uc.title,
          baseTitle: item.title,
          baseCategory: item.category,
          title: ov?.title ?? item.title ?? "",
          category: ov?.category ?? item.category ?? "",
          tags: ov?.tags ?? [],
          industry: ov?.industry ?? "",
          imageryType: ov?.imagery_type ?? "",
          folderId: uc.id,
          thumbnail: item.thumbnail,
          dirty: false,
          saving: false,
        });
      });
    });
    uploads.forEach((u) => {
      next.push({
        mediaId: `upload-${u.id}`,
        useCaseTitle: "Uploads",
        title: u.title ?? "",
        category: u.category ?? "",
        tags: u.tags ?? [],
        industry: u.industry ?? "",
        imageryType: u.imagery_type ?? "",
        folderId: u.use_case_id,
        thumbnail: u.media_type === "video" ? "" : (signedUrls[u.storage_path] ?? ""),
        dirty: false,
        saving: false,
        isUpload: true,
        uploadId: u.id,
        storagePath: u.storage_path,
      });
    });
    setRows(next);
  }, [overrides, uploads, signedUrls]);

  // Fetch signed URLs for upload thumbnails (bucket is private)
  useEffect(() => {
    const missing = uploads
      .filter((u) => u.media_type !== "video" && !signedUrls[u.storage_path])
      .map((u) => u.storage_path);
    if (missing.length === 0) return;
    (async () => {
      const { data, error } = await supabase.storage
        .from("media-uploads")
        .createSignedUrls(missing, 60 * 60);
      if (error || !data) return;
      setSignedUrls((prev) => {
        const next = { ...prev };
        data.forEach((d) => { if (d.path && d.signedUrl) next[d.path] = d.signedUrl; });
        return next;
      });
    })();
  }, [uploads, signedUrls]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows;
    if (activeFolder !== "all") {
      if (activeFolder === "other") {
        const matchedIds = new Set<string>();
        FOLDERS.filter((f) => f.id !== "other").forEach((f) => {
          rows.forEach((r) => { if (f.match(r)) matchedIds.add(r.mediaId); });
        });
        out = rows.filter((r) => !matchedIds.has(r.mediaId));
      } else {
        const folder = FOLDERS.find((f) => f.id === activeFolder)!;
        out = rows.filter((r) => folder.match(r));
      }
    }
    if (q) {
      out = out.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.useCaseTitle.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return out;
  }, [rows, search, activeFolder]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    const matched = new Set<string>();
    FOLDERS.filter((f) => f.id !== "other").forEach((f) => {
      const ids = rows.filter((r) => f.match(r));
      counts[f.id] = ids.length;
      ids.forEach((r) => matched.add(r.mediaId));
    });
    counts.other = rows.filter((r) => !matched.has(r.mediaId)).length;
    return counts;
  }, [rows]);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/admin/login" replace />;

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.mediaId === id ? { ...r, ...patch, dirty: true } : r)));
  };

  // Immediately persist a direction tag toggle so the 5-View layout updates without a manual Save
  const setDirection = async (row: Row, dir: typeof DIRECTION_TAGS[number] | null) => {
    const cleaned = row.tags.filter((t) => !DIRECTION_TAGS.includes(t as typeof DIRECTION_TAGS[number]));
    const nextTags = dir ? [...cleaned, dir] : cleaned;
    // When a direction is selected, force imagery type to 5-View API so the item lands in the right folder.
    const nextImageryType = dir ? "5-View API" : row.imageryType;
    setRows((rs) =>
      rs.map((r) =>
        r.mediaId === row.mediaId ? { ...r, tags: nextTags, imageryType: nextImageryType, saving: true } : r,
      ),
    );
    const fields = {
      title: row.title || null,
      category: row.category || null,
      tags: nextTags,
      industry: row.industry || null,
      imagery_type: nextImageryType || null,
    };
    const { error } = row.isUpload && row.uploadId
      ? await supabase
          .from("media_uploads")
          .update({ tags: nextTags, imagery_type: nextImageryType || null })
          .eq("id", row.uploadId)
      : await supabase.from("media_overrides").upsert({ media_id: row.mediaId, ...fields }, { onConflict: "media_id" });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      setRows((rs) => rs.map((r) => (r.mediaId === row.mediaId ? { ...r, saving: false } : r)));
      return;
    }
    await refresh();
  };

  // Toggle whether a folder shows up on the home page grid. Upserts into
  // folder_settings, which useMediaOverrides merges with any hideFromHome
  // set in code (e.g. Uploads) — either one hides it.
  const [savingFolderId, setSavingFolderId] = useState<string | null>(null);
  const setFolderHidden = async (folderId: string, hidden: boolean) => {
    setSavingFolderId(folderId);
    const { error } = await supabase.from("folder_settings").upsert({ folder_id: folderId, hidden }, { onConflict: "folder_id" });
    setSavingFolderId(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    await refresh();
  };

  // Immediately persist which home-page folder an upload lives in.
  const setFolder = async (row: Row, folderId: string) => {
    if (!row.isUpload || !row.uploadId) return;
    setRows((rs) => rs.map((r) => (r.mediaId === row.mediaId ? { ...r, folderId, saving: true } : r)));
    const { error } = await supabase.from("media_uploads").update({ use_case_id: folderId }).eq("id", row.uploadId);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      setRows((rs) => rs.map((r) => (r.mediaId === row.mediaId ? { ...r, saving: false } : r)));
      return;
    }
    await refresh();
  };

  // Immediately persist a toggled industry (multi-select via primary
  // industry column + overflow tags — see toggleIndustry above).
  const setIndustry = async (row: Row, value: string) => {
    const next = toggleIndustry(row, value);
    setRows((rs) => rs.map((r) => (r.mediaId === row.mediaId ? { ...r, ...next, saving: true } : r)));
    const fields = {
      title: row.title || null,
      category: row.category || null,
      tags: next.tags,
      industry: next.industry || null,
      imagery_type: row.imageryType || null,
    };
    const { error } = row.isUpload && row.uploadId
      ? await supabase.from("media_uploads").update({ tags: next.tags, industry: next.industry || null }).eq("id", row.uploadId)
      : await supabase.from("media_overrides").upsert({ media_id: row.mediaId, ...fields }, { onConflict: "media_id" });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      setRows((rs) => rs.map((r) => (r.mediaId === row.mediaId ? { ...r, saving: false } : r)));
      return;
    }
    await refresh();
  };

  const saveRow = async (id: string, overrides?: Partial<Row>) => {
    const base = rows.find((r) => r.mediaId === id);
    if (!base) return;
    const row = { ...base, ...overrides } as Row;
    setRows((rs) => rs.map((r) => (r.mediaId === id ? { ...r, saving: true } : r)));
    const fields = {
      title: row.title || null,
      category: row.category || null,
      tags: row.tags,
      industry: row.industry || null,
      imagery_type: row.imageryType || null,
    };
    const { error } = row.isUpload && row.uploadId
      ? await supabase.from("media_uploads").update(fields).eq("id", row.uploadId)
      : await supabase.from("media_overrides").upsert({ media_id: id, ...fields }, { onConflict: "media_id" });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      setRows((rs) => rs.map((r) => (r.mediaId === id ? { ...r, saving: false } : r)));
      return;
    }
    setRows((rs) => rs.map((r) => (r.mediaId === id ? { ...r, dirty: false, saving: false } : r)));
    await refresh();
  };

  const deleteRow = async (row: Row) => {
    if (!row.isUpload || !row.uploadId || !row.storagePath) return;
    if (!confirm(`Delete "${row.title || row.storagePath.split("/").pop()}"?`)) return;
    await supabase.storage.from("media-uploads").remove([row.storagePath]);
    const { error } = await supabase.from("media_uploads").delete().eq("id", row.uploadId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    await refresh();
  };

  const addTag = (id: string) => {
    const t = (tagDraft[id] || "").trim();
    if (!t) return;
    const row = rows.find((r) => r.mediaId === id);
    if (!row || row.tags.includes(t)) return;
    updateRow(id, { tags: [...row.tags, t] });
    setTagDraft((d) => ({ ...d, [id]: "" }));
  };

  const removeTag = (id: string, tag: string) => {
    const row = rows.find((r) => r.mediaId === id);
    if (!row) return;
    updateRow(id, { tags: row.tags.filter((t) => t !== tag) });
  };

  const handleUpload = async () => {
    if (upFiles.length === 0 || !beforeAfterValid) return;
    setUploading(true);
    setUploadProgress("");
    const globalTags = upTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const pairId = upIsBeforeAfter ? crypto.randomUUID() : null;
    try {
      for (let i = 0; i < upFiles.length; i++) {
        const file = upFiles[i];
        setUploadProgress(`Uploading ${i + 1} of ${upFiles.length}: ${file.name}`);
        const isVideo = file.type.startsWith("video/");
        const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("media-uploads")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const fileTags = upFileTags[i] || [];
        const pairTags = pairId ? [`before-after-pair:${pairId}`, `role:${upBeforeAfterRoles[i]}`] : [];
        const { error: insErr } = await supabase.from("media_uploads").insert({
          use_case_id: upFolder,
          media_type: isVideo ? "video" : "image",
          storage_path: path,
          title: upTitle || null,
          category: upCategory || null,
          tags: [...globalTags, ...fileTags, ...upIndustries.slice(1), ...pairTags],
          industry: upIndustries[0] || null,
          imagery_type: upImageryType,
          created_by: user!.id,
        });
        if (insErr) throw insErr;
      }
      toast({ title: `Uploaded ${upFiles.length} file${upFiles.length === 1 ? "" : "s"}` });
      setUpFiles([]);
      setUpFileTags({});
      setUpIsBeforeAfter(false);
      setUpBeforeAfterRoles({});
      setUpTitle("");
      setUpCategory("");
      setUpTags("");
      setUpIndustries([]);
      setUpImageryType("Oblique");
      setUpFolder("uploads");
      setUploadProgress("");
      await refresh();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteUpload = async (id: string, storagePath: string) => {
    if (!confirm("Delete this upload?")) return;
    await supabase.storage.from("media-uploads").remove([storagePath]);
    const { error } = await supabase.from("media_uploads").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-28 pb-20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Edit titles, categories, and tags. Changes are public." : "Awaiting admin access — ask an existing admin to grant your account permission."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut size={14} /> Sign out</Button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">View site</Link>
          </div>
        </div>

        {!isAdmin ? null : (
          <>
            <section className="mt-8 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Upload size={16} className="text-primary" />
                <h2 className="font-heading text-sm font-semibold text-foreground">Upload new media</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => { setUpFiles(Array.from(e.target.files ?? [])); setUpBeforeAfterRoles({}); }}
                  className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                />
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Folder</label>
                  <select
                    value={upFolder}
                    onChange={(e) => setUpFolder(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {FOLDER_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Image type</label>
                  <select
                    value={upImageryType}
                    onChange={(e) => setUpImageryType(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option>360 degree panorama</option>
                    <option>Orthomosaic</option>
                    <option>Gaussian splat</option>
                    <option>Oblique</option>
                  <option>5-View API</option>
                  </select>
                </div>
                <Input placeholder="Title (optional)" value={upTitle} onChange={(e) => setUpTitle(e.target.value)} />
                <Input placeholder="Category (optional)" value={upCategory} onChange={(e) => setUpCategory(e.target.value)} />
                <Input placeholder="Tags (comma-separated)" value={upTags} onChange={(e) => setUpTags(e.target.value)} />
                <Button onClick={handleUpload} disabled={upFiles.length === 0 || uploading || !beforeAfterValid}>
                  {uploading ? "Uploading…" : `Upload${upFiles.length > 1 ? ` ${upFiles.length} files` : ""}`}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Industries:</span>
                {INDUSTRY_OPTIONS.map((o) => {
                  const active = upIndustries.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setUpIndustries((prev) => (active ? prev.filter((i) => i !== o) : [...prev, o]))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={upIsBeforeAfter}
                  onChange={(e) => { setUpIsBeforeAfter(e.target.checked); setUpBeforeAfterRoles({}); }}
                />
                Upload as a Before/After comparison (select exactly 2 images, then mark which is which below)
              </label>
              {upIsBeforeAfter && upFiles.length !== 2 && (
                <p className="mt-1 text-xs text-destructive">Select exactly 2 images to upload as a pair.</p>
              )}
              {upFiles.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1.5">{upFiles.length} file{upFiles.length === 1 ? "" : "s"} selected</div>
                  <div className="space-y-2">
                    {upFiles.map((f, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">
                        <span className="truncate max-w-[180px] text-muted-foreground">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setUpFiles((files) => files.filter((_, idx) => idx !== i));
                            const shiftIndices = <T,>(prev: Record<number, T>) => {
                              const next: Record<number, T> = {};
                              Object.entries(prev).forEach(([k, v]) => {
                                const idx = Number(k);
                                if (idx < i) next[idx] = v;
                                else if (idx > i) next[idx - 1] = v;
                              });
                              return next;
                            };
                            setUpFileTags(shiftIndices);
                            setUpBeforeAfterRoles(shiftIndices);
                          }}
                          className="hover:text-foreground"
                        >
                          <X size={12} />
                        </button>
                        {upIsBeforeAfter && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Role:</span>
                            {(["before", "after"] as const).map((role) => {
                              const active = upBeforeAfterRoles[i] === role;
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => setUpBeforeAfterRoles((prev) => ({ ...prev, [i]: role }))}
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[11px] capitalize transition-colors",
                                    active
                                      ? "border-primary bg-primary/15 text-primary"
                                      : "border-border text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {role}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {upImageryType === "5-View API" && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Direction:</span>
                            {DIRECTION_TAGS.map((d) => {
                              const active = upFileTags[i]?.includes(d) ?? false;
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => {
                                    setUpFileTags((prev) => {
                                      const current = prev[i] || [];
                                      const cleaned = current.filter((t) => !DIRECTION_TAGS.includes(t as typeof DIRECTION_TAGS[number]));
                                      const next = active ? cleaned : [...cleaned, d];
                                      return { ...prev, [i]: next };
                                    });
                                  }}
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[11px] capitalize transition-colors",
                                    active
                                      ? "border-primary bg-primary/15 text-primary"
                                      : "border-border text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {d}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {uploadProgress && <div className="text-xs text-primary mt-1.5">{uploadProgress}</div>}
                </div>
              )}
              {uploads.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-2">{uploads.length} upload{uploads.length === 1 ? "" : "s"}</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {uploads.map((u) => (
                      <div key={u.id} className="flex items-center justify-between gap-2 rounded border border-border bg-background/40 px-2 py-1.5 text-xs">
                        <div className="min-w-0">
                          <div className="truncate text-foreground">{u.title || u.storage_path.split("/").pop()}</div>
                          <div className="truncate text-muted-foreground">{u.media_type}{u.industry ? ` · ${u.industry}` : ""}{u.imagery_type ? ` · ${u.imagery_type}` : ""}</div>
                        </div>
                        <button onClick={() => deleteUpload(u.id, u.storage_path)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-primary" />
                <h2 className="font-heading text-sm font-semibold text-foreground">Folders</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Hide a folder from the home page grid without deleting its content — it stays reachable via its own page and product-type/industry filters.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {FOLDER_OPTIONS.map((f) => {
                  const baseUc = baseUseCases.find((uc) => uc.id === f.id);
                  const codeHidden = !!baseUc?.hideFromHome;
                  const hidden = codeHidden || !!folderSettings[f.id]?.hidden;
                  return (
                    <div key={f.id} className="flex items-center justify-between gap-2 rounded border border-border bg-background/40 px-3 py-2 text-xs">
                      <span className="truncate text-foreground">{f.title}</span>
                      <button
                        type="button"
                        disabled={codeHidden || savingFolderId === f.id}
                        onClick={() => setFolderHidden(f.id, !hidden)}
                        title={codeHidden ? "Hidden in code — can't be toggled here" : hidden ? "Show on home page" : "Hide from home page"}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
                          hidden
                            ? "border-border text-muted-foreground"
                            : "border-primary bg-primary/15 text-primary",
                          codeHidden && "opacity-50",
                        )}
                      >
                        {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                        {hidden ? "Hidden" : "Visible"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="mt-8">
              <Input
                placeholder="Search by title, category, tag…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFolder("all")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  activeFolder === "all"
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                All <span className="opacity-60">({folderCounts.all ?? 0})</span>
              </button>
              {FOLDERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    activeFolder === f.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label} <span className="opacity-60">({folderCounts[f.id] ?? 0})</span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {filtered.map((r) => (
                <div key={r.mediaId} className="grid grid-cols-[80px_1fr_auto] gap-4 rounded-lg border border-border bg-card p-3">
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt="" className="h-16 w-20 rounded object-cover" />
                  ) : (
                    <div className="h-16 w-20 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground uppercase">
                      {r.isUpload ? "Upload" : "—"}
                    </div>
                  )}
                  <div className="space-y-2 min-w-0">
                    <div className="text-xs text-muted-foreground">
                      {r.useCaseTitle} · <span className="font-mono">{r.mediaId}</span>
                      {r.isUpload && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">Uploaded</span>}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={r.title}
                        placeholder="Title"
                        onChange={(e) => updateRow(r.mediaId, { title: e.target.value })}
                        onBlur={() => { if (r.dirty) saveRow(r.mediaId); }}
                      />
                      <Input
                        value={r.category}
                        placeholder="Category (optional)"
                        onChange={(e) => updateRow(r.mediaId, { category: e.target.value })}
                        onBlur={() => { if (r.dirty) saveRow(r.mediaId); }}
                      />
                    </div>
                    <div>
                      <select
                        value={r.imageryType}
                        onChange={(e) => { const v = e.target.value; updateRow(r.mediaId, { imageryType: v }); saveRow(r.mediaId, { imageryType: v }); }}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="">Image type…</option>
                        {IMAGERY_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    {r.isUpload && (
                      <div>
                        <select
                          value={r.folderId}
                          onChange={(e) => setFolder(r, e.target.value)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {FOLDER_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Industries:</span>
                      {INDUSTRY_OPTIONS.map((o) => {
                        const active = getSelectedIndustries(r).has(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            disabled={r.saving}
                            onClick={() => setIndustry(r, o)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                              active
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                          {t}
                          <button onClick={() => removeTag(r.mediaId, t)} className="hover:text-foreground">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      <input
                        value={tagDraft[r.mediaId] || ""}
                        onChange={(e) => setTagDraft((d) => ({ ...d, [r.mediaId]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(r.mediaId); } }}
                        placeholder="add tag…"
                        className="bg-transparent text-xs outline-none border-b border-border focus:border-primary px-1 py-0.5 w-24"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Direction:</span>
                      {DIRECTION_TAGS.map((d) => {
                        const active = r.tags.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={r.saving}
                            onClick={() => setDirection(r, active ? null : d)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors font-medium",
                              active
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-card text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" disabled={!r.dirty || r.saving} onClick={() => saveRow(r.mediaId)}>
                      {r.saving ? "…" : "Save"}
                    </Button>
                    {r.isUpload && (
                      <button
                        onClick={() => deleteRow(r)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete upload"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;