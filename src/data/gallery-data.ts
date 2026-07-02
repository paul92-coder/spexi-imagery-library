import catastropheImg from "@/assets/catastrophe.jpg";
import assetMgmtImg from "@/assets/asset-management.jpg";
import constructionImg from "@/assets/construction.jpg";
import governmentImg from "@/assets/government.jpg";
import realEstateImg from "@/assets/real-estate.jpg";

import wildfireBeforeImg from "@/assets/wildfire-before.webp";
import wildfireAfterImg from "@/assets/wildfire-after.webp";
import floodingImg from "@/assets/flooding.webp";
import flooding2Img from "@/assets/flooding-2.webp";
import flooding3Img from "@/assets/flooding-3.webp";
import constructionBeforeImg from "@/assets/construction-before.webp";
import constructionAfterImg from "@/assets/construction-after.webp";
import constructionSite1Img from "@/assets/construction-site-1.webp";
import constructionSite2Img from "@/assets/construction-site-2.webp";
import utilitiesBeforeImg from "@/assets/utilities-before.webp";
import utilitiesAfterImg from "@/assets/utilities-after.webp";
import foliageBeforeImg from "@/assets/foliage-before.webp";
import foliageAfterImg from "@/assets/foliage-after.webp";
import skylineBeforeImg from "@/assets/skyline-before.webp";
import skylineAfterImg from "@/assets/skyline-after.webp";
import assetMgmt1Img from "@/assets/asset-mgmt-1.webp";
import assetMgmt2Img from "@/assets/asset-mgmt-2.webp";
import assetMgmt3Img from "@/assets/asset-mgmt-3.webp";
import waterTreatmentImg from "@/assets/water-treatment.webp";
import solarPanelsImg from "@/assets/solar-panels.webp";
import realEstate1Img from "@/assets/real-estate-1.webp";
import realEstate2Img from "@/assets/real-estate-2.webp";
import realEstate3Img from "@/assets/real-estate-3.webp";
import splatVancouverThumb from "@/assets/splat-vancouver-thumb.jpg";
import splatVancouverThumbVideo from "@/assets/splat-vancouver-thumb.mp4";
import splatPropertyThumb from "@/assets/splat-property-thumb.jpg";
import splatPropertyThumbVideo from "@/assets/splat-property-thumb.mp4";
import chalkwellThumb from "@/assets/chalkwell-thumb.jpg";
import chalkwellThumbVideo from "@/assets/chalkwell-thumb.mp4";
import chalkwellVideo from "@/assets/chalkwell.mp4";
import orthoThumb from "@/assets/ortho-thumb.jpg";
import orthoThumbVideo from "@/assets/ortho-thumb.mp4";

export type MediaType = "image" | "video" | "before_after" | "orthomosaic_map" | "splat_embed" | "image_carousel";
export type ImageType = "orthomosaic" | "oblique" | "splat";

export interface MediaItem {
  id: string;
  type: MediaType;
  imageType?: ImageType;
  title?: string;
  category?: string;
  thumbnail: string;
  thumbnailVideo?: string;
  src?: string;
  videoSrc?: string;
  beforeSrc?: string;
  afterSrc?: string;
  images?: { src: string; title?: string }[];
  tileUrl?: string;
  mapCenter?: [number, number];
  mapZoom?: number;
  mapBounds?: [[number, number], [number, number]];
  mapAttribution?: string;
  embedUrl?: string;
  tags?: string[];
  industry?: string;
  imageryType?: string;
  // Set by admin overrides at runtime (see useMediaOverrides) to move an
  // item into a differently-named use-case bucket without editing this file.
  useCase?: string;
}

export interface UseCase {
  id: string;
  title: string;
  subtitle?: string;
  coverImage: string;
  items: MediaItem[];
}

// NOTE ON DATA: in the live Lovable/Supabase build, industry + tag metadata is
// entered by an admin and stored in a `media_overrides` table, then merged
// onto this static seed at runtime. That table wasn't reachable from this
// environment, so the industry/tag values below are a representative
// re-creation (based on what each asset actually depicts) rather than a
// pull of the live production values — see the rebuild notes for details.
export const useCases: UseCase[] = [
  {
    id: "catastrophe",
    title: "Catastrophe",
    subtitle: "Post-event damage assessment",
    coverImage: catastropheImg,
    items: [
      {
        id: "cat-3",
        type: "before_after",
        imageType: "oblique",
        title: "Wildfire – Feb vs. June 2025",
        thumbnail: wildfireBeforeImg,
        beforeSrc: wildfireBeforeImg,
        afterSrc: wildfireAfterImg,
        industry: "Insurance",
        tags: ["Before & After", "Catastrophe"],
      },
      {
        id: "cat-flood-overview",
        type: "image_carousel",
        imageType: "oblique",
        title: "Abbotsford Flood – Dec 2025",
        thumbnail: floodingImg,
        images: [
          { src: floodingImg, title: "Abbotsford Flood – Dec 2025" },
          { src: flooding2Img, title: "Abbotsford Flood 2 – Dec 2025" },
          { src: flooding3Img, title: "Abbotsford Flood 3 – Dec 2025" },
        ],
        industry: "Insurance",
        tags: ["Catastrophe"],
      },
    ],
  },
  {
    id: "asset-management",
    title: "Facilities Monitoring & Asset Management",
    subtitle: "Infrastructure inspection & monitoring",
    coverImage: assetMgmtImg,
    items: [
      {
        id: "am-overview",
        type: "image_carousel",
        imageType: "oblique",
        title: "Substation Asset Management",
        thumbnail: assetMgmt1Img,
        images: [
          { src: assetMgmt1Img, title: "Substation Inspection" },
          { src: assetMgmt2Img, title: "Equipment Yard Overview" },
          { src: assetMgmt3Img, title: "Fleet & Storage Facility" },
          { src: solarPanelsImg, title: "Solar Panel Array" },
        ],
        industry: "Utilities",
        tags: ["Asset Management", "Asset inspection"],
      },
      {
        id: "am-water",
        type: "image",
        imageType: "oblique",
        title: "Water Treatment Plant",
        thumbnail: waterTreatmentImg,
        src: waterTreatmentImg,
        industry: "Utilities",
        tags: ["Asset inspection"],
      },
    ],
  },
  {
    id: "construction",
    title: "Construction Monitoring",
    subtitle: "Track progress from above",
    coverImage: constructionImg,
    items: [
      {
        id: "con-3",
        type: "before_after",
        imageType: "oblique",
        title: "Construction Progress – Sep 10 vs. Sep 30, 2024",
        thumbnail: constructionBeforeImg,
        beforeSrc: constructionBeforeImg,
        afterSrc: constructionAfterImg,
        industry: "Construction, Engineering, Architecture",
        tags: ["Before & After", "Progress tracking"],
      },
      {
        id: "con-overview",
        type: "image_carousel",
        imageType: "oblique",
        title: "Construction Site Overview",
        thumbnail: constructionSite1Img,
        images: [
          { src: constructionSite1Img, title: "Construction Site 1" },
          { src: constructionSite2Img, title: "Construction Site 2" },
        ],
        industry: "Construction, Engineering, Architecture",
        tags: ["Construction Site Overview", "Progress tracking"],
      },
    ],
  },
  {
    id: "government",
    title: "Government & Public Utilities",
    subtitle: "Infrastructure upkeep & planning",
    coverImage: governmentImg,
    items: [
      {
        id: "gov-3",
        type: "before_after",
        imageType: "oblique",
        title: "Public Utilities Change – Apr 12 vs. Apr 21, 2025",
        thumbnail: utilitiesBeforeImg,
        beforeSrc: utilitiesBeforeImg,
        afterSrc: utilitiesAfterImg,
        industry: "Local Government",
        tags: ["Before & After", "Progress tracking"],
      },
      {
        id: "gov-4",
        type: "before_after",
        imageType: "oblique",
        title: "Foliage Change – Apr 29, 2024 vs. Nov 26, 2025",
        thumbnail: foliageBeforeImg,
        beforeSrc: foliageBeforeImg,
        afterSrc: foliageAfterImg,
        industry: "Local Government",
        tags: ["Before & After"],
      },
      {
        id: "gov-6",
        type: "before_after",
        imageType: "oblique",
        title: "Construction Skyline Change – Sep 09, 2024 vs. Oct 08, 2025",
        thumbnail: skylineBeforeImg,
        beforeSrc: skylineBeforeImg,
        afterSrc: skylineAfterImg,
        industry: "Local Government",
        tags: ["Before & After", "Progress tracking"],
      },
    ],
  },
  {
    id: "real-estate",
    title: "Real Estate – Property Intelligence",
    subtitle: "Premium property perspectives",
    coverImage: realEstateImg,
    items: [
      {
        id: "re-1",
        type: "image",
        imageType: "oblique",
        title: "Waterfront Properties",
        thumbnail: realEstate1Img,
        src: realEstate1Img,
        industry: "Commercial Real Estate",
        tags: ["Property condition review"],
      },
      {
        id: "re-2",
        type: "image",
        imageType: "oblique",
        title: "Luxury Estate Development",
        thumbnail: realEstate2Img,
        src: realEstate2Img,
        industry: "Commercial Real Estate",
        tags: ["Property condition review"],
      },
      {
        id: "re-3",
        type: "image",
        imageType: "oblique",
        title: "Residential Neighborhood",
        thumbnail: realEstate3Img,
        src: realEstate3Img,
        industry: "Commercial Real Estate",
        tags: ["Residential Neighborhood"],
      },
    ],
  },
  {
    id: "orthomosaic",
    title: "Orthomosaic Maps",
    subtitle: "Geo-referenced interactive tile maps",
    coverImage: constructionSite1Img,
    items: [
      {
        id: "ortho-1",
        type: "orthomosaic_map",
        imageType: "orthomosaic",
        title: "Downtown Site – Interactive Orthomosaic",
        thumbnail: orthoThumb,
        thumbnailVideo: orthoThumbVideo,
        tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        mapCenter: [49.2827, -123.1207],
        mapZoom: 17,
        mapBounds: [
          [49.2795, -123.1255],
          [49.286, -123.116],
        ],
        mapAttribution: "© Spexi (demo tiles: Esri)",
        industry: "Local Government",
        tags: ["Downtown Site – Interactive Orthomosaic"],
      },
    ],
  },
  {
    id: "interactive-3d",
    title: "Interactive & 3D",
    subtitle: "Gaussian splats you can orbit and explore",
    coverImage: constructionSite1Img,
    items: [
      {
        id: "i3d-splat-1",
        type: "splat_embed",
        imageType: "splat",
        title: "Vancouver – 3D Gaussian Splat",
        thumbnail: splatVancouverThumb,
        thumbnailVideo: splatVancouverThumbVideo,
        embedUrl:
          "https://lumalabs.ai/embed/5ab4b5bb-e62a-4a9e-ae20-d374d96bb377?mode=sparkles&background=%23000000&color=%23ffffff&showTitle=false&loadBg=true&logoPosition=bottom-left&infoPosition=bottom-right&showMenu=false&autoplay=1",
        industry: "Spatial / Physical AI",
        tags: ["Training data", "Scene recognition"],
      },
      {
        id: "i3d-splat-2",
        type: "splat_embed",
        imageType: "splat",
        title: "London – 3D Gaussian Splat",
        thumbnail: splatPropertyThumb,
        thumbnailVideo: splatPropertyThumbVideo,
        embedUrl:
          "https://lumalabs.ai/embed/23706a92-f334-4f84-91e2-41ffa6723a9a?mode=sparkles&background=%23000000&color=%23ffffff&showTitle=false&loadBg=true&logoPosition=bottom-left&infoPosition=bottom-right&showMenu=false&autoplay=1",
        industry: "Spatial / Physical AI",
        tags: ["Training data", "Scene recognition"],
      },
      {
        id: "i3d-video-1",
        type: "video",
        imageType: "splat",
        title: "Chalkwell – 3D Flythrough",
        thumbnail: chalkwellThumb,
        thumbnailVideo: chalkwellThumbVideo,
        videoSrc: chalkwellVideo,
        industry: "Spatial / Physical AI",
        tags: ["Scene recognition"],
      },
    ],
  },
  {
    // Admin uploads (via /admin) land here by default — see useMediaOverrides,
    // which slots media_uploads rows into whichever base use case's `id`
    // matches their use_case_id ("uploads" unless reassigned).
    id: "uploads",
    title: "Uploads",
    subtitle: "Admin-uploaded imagery",
    coverImage: constructionSite1Img,
    items: [],
  },
];

export function getUseCase(id: string): UseCase | undefined {
  return useCases.find((uc) => uc.id === id);
}
