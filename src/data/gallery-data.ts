import catastropheImg from "@/assets/catastrophe.jpg";
import assetMgmtImg from "@/assets/asset-management.jpg";
import constructionImg from "@/assets/construction.jpg";
import governmentImg from "@/assets/government.jpg";
import realEstateImg from "@/assets/real-estate.jpg";

import wildfireBeforeImg from "@/assets/wildfire-before.webp";
import wildfireAfterImg from "@/assets/wildfire-after.webp";
import constructionBeforeImg from "@/assets/construction-before.webp";
import constructionAfterImg from "@/assets/construction-after.webp";
import constructionSite1Img from "@/assets/construction-site-1.webp";
import utilitiesBeforeImg from "@/assets/utilities-before.webp";
import utilitiesAfterImg from "@/assets/utilities-after.webp";
import foliageBeforeImg from "@/assets/foliage-before.webp";
import foliageAfterImg from "@/assets/foliage-after.webp";
import skylineBeforeImg from "@/assets/skyline-before.webp";
import skylineAfterImg from "@/assets/skyline-after.webp";
import solarPanelsImg from "@/assets/solar-panels.webp";
import splatVancouverThumb from "@/assets/splat-vancouver-thumb.jpg";
import splatVancouverThumbVideo from "@/assets/splat-vancouver-thumb.mp4";
import splatPropertyThumb from "@/assets/splat-property-thumb.jpg";
import splatPropertyThumbVideo from "@/assets/splat-property-thumb.mp4";
import orthoThumb from "@/assets/ortho-thumb.jpg";
import orthoThumbVideo from "@/assets/ortho-thumb.mp4";
import waterPumpStationImg from "@/assets/water-pump-station.jpg";
import railTransitStationImg from "@/assets/rail-transit-station.jpg";
import roadSignGantryImg from "@/assets/road-sign-gantry.jpg";
import parkWaterfrontImg from "@/assets/park-waterfront.jpg";

export type MediaType = "image" | "video" | "before_after" | "orthomosaic_map" | "splat_embed" | "image_carousel";
export type ImageType = "orthomosaic" | "oblique" | "splat" | "api";

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
  // Keeps a folder off the home page's "Use cases" grid even once it has
  // content — for niche/background folders that shouldn't compete with the
  // curated highest-value tiles, while still being reachable directly
  // (/use-case/:id), through product-type pages, and industry filtering.
  hideFromHome?: boolean;
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
        tags: ["Before & After", "Catastrophe", "Local Government"],
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
        id: "am-pump-station",
        type: "image",
        imageType: "oblique",
        title: "Sapperton Pump Station",
        thumbnail: waterPumpStationImg,
        src: waterPumpStationImg,
        industry: "Utilities",
        tags: ["Asset inspection", "Local Government"],
      },
      {
        id: "am-rail-transit-station",
        type: "image",
        imageType: "oblique",
        title: "New Westminster SkyTrain Station",
        thumbnail: railTransitStationImg,
        src: railTransitStationImg,
        industry: "Local Government",
        tags: ["Asset inspection", "Utilities"],
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
        tags: ["Before & After", "Progress tracking", "Local Government"],
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
      {
        id: "gov-pump-station",
        type: "image",
        imageType: "oblique",
        title: "Sapperton Pump Station",
        thumbnail: waterPumpStationImg,
        src: waterPumpStationImg,
        industry: "Utilities",
        tags: ["Asset inspection", "Local Government"],
      },
      {
        id: "gov-rail-transit-station",
        type: "image",
        imageType: "oblique",
        title: "New Westminster SkyTrain Station",
        thumbnail: railTransitStationImg,
        src: railTransitStationImg,
        industry: "Local Government",
        tags: ["Asset inspection", "Utilities"],
      },
      {
        id: "gov-sign-gantry",
        type: "image",
        imageType: "oblique",
        title: "Highway Sign Gantry – Winter Park, FL",
        thumbnail: roadSignGantryImg,
        src: roadSignGantryImg,
        industry: "Local Government",
        tags: ["Asset inspection"],
      },
      {
        id: "gov-park-waterfront",
        type: "image",
        imageType: "oblique",
        title: "New Brighton Park Waterfront",
        thumbnail: parkWaterfrontImg,
        src: parkWaterfrontImg,
        industry: "Local Government",
        tags: ["Site monitoring"],
      },
    ],
  },
  {
    id: "real-estate",
    title: "Real Estate – Property Intelligence",
    subtitle: "Premium property perspectives",
    coverImage: realEstateImg,
    items: [],
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
    ],
  },
  {
    id: "bridge-inspection",
    title: "Bridge Inspection",
    subtitle: "Structural condition monitoring from above",
    coverImage: constructionSite1Img,
    items: [],
  },
  {
    id: "road-traffic-infrastructure",
    title: "Road & Traffic Infrastructure",
    subtitle: "Highways, signage, and public works monitoring",
    coverImage: roadSignGantryImg,
    items: [
      {
        id: "road-sign-gantry",
        type: "image",
        imageType: "oblique",
        title: "Highway Sign Gantry – Winter Park, FL",
        thumbnail: roadSignGantryImg,
        src: roadSignGantryImg,
        industry: "Local Government",
        tags: ["Asset inspection"],
      },
    ],
  },
  {
    id: "parks-recreation",
    title: "Parks & Recreation",
    subtitle: "Municipal green space and amenity monitoring",
    coverImage: parkWaterfrontImg,
    items: [
      {
        id: "park-waterfront",
        type: "image",
        imageType: "oblique",
        title: "New Brighton Park Waterfront",
        thumbnail: parkWaterfrontImg,
        src: parkWaterfrontImg,
        industry: "Local Government",
        tags: ["Site monitoring"],
      },
    ],
  },
  // The following are placeholder folders with no seeded imagery yet — kept
  // empty until real captures exist. Index.tsx already hides any use case
  // with zero matching entries, so these stay off the home page until items
  // are added here.
  {
    id: "finance-loan-verification",
    title: "Construction Loan Draw Verification",
    subtitle: "Milestone imagery for lender fund releases",
    coverImage: constructionSite1Img,
    items: [],
  },
  {
    id: "finance-portfolio-surveillance",
    title: "Institutional Real Estate Portfolio Surveillance",
    subtitle: "Condition monitoring across property portfolios",
    coverImage: constructionSite1Img,
    items: [],
  },
  {
    id: "finance-project-due-diligence",
    title: "Renewable Project Finance Due Diligence",
    subtitle: "Progress verification for project-financed renewables",
    coverImage: constructionSite1Img,
    items: [],
  },
  {
    id: "utilities-corridor-inspection",
    title: "Transmission & Distribution Corridor Inspection",
    subtitle: "Vegetation encroachment & right-of-way monitoring",
    coverImage: constructionSite1Img,
    items: [],
  },
  {
    id: "utilities-renewable-assets",
    title: "Wind & Solar Farm Asset Monitoring",
    subtitle: "Utility-scale generation site inspection",
    coverImage: solarPanelsImg,
    items: [],
  },
  {
    id: "utilities-tower-infrastructure",
    title: "Telecom & Tower Infrastructure",
    subtitle: "Cell and utility tower inspection",
    coverImage: constructionSite1Img,
    items: [],
  },
  {
    id: "utilities-storm-response",
    title: "Storm Damage & Outage Assessment",
    subtitle: "Rapid post-storm imagery for restoration crews",
    coverImage: constructionSite1Img,
    items: [],
  },
  {
    // Admin uploads (via /admin) land here by default — see useMediaOverrides,
    // which slots media_uploads rows into whichever base use case's `id`
    // matches their use_case_id ("uploads" unless reassigned).
    id: "uploads",
    title: "Uploads",
    subtitle: "Admin-uploaded imagery",
    coverImage: constructionSite1Img,
    hideFromHome: true,
    items: [],
  },
];

export function getUseCase(id: string): UseCase | undefined {
  return useCases.find((uc) => uc.id === id);
}
