// Two hero/background videos were uploaded through Lovable's own asset host
// rather than committed to the repo, so they aren't part of the exported
// codebase. They're still publicly served from the live site, so the
// rebuild links to them directly rather than re-uploading multi-hundred-MB
// video files into this prototype. See the rebuild notes for how these
// would be handled in a real migration (own storage/CDN, compressed
// renditions, poster frames).
export const HERO_VIDEO_URL =
  "https://spexi-showcase-gallery.lovable.app/__l5e/assets-v1/57a3bae3-d1b3-4385-8404-e5b9ccdc1390/SF_3D_14s.mp4";

export const PANORAMA_HERO_VIDEO_URL =
  "https://spexi-showcase-gallery.lovable.app/__l5e/assets-v1/a5c1adae-c480-47c5-82cf-968e3f403bc4/panorama-hero.mp4";
