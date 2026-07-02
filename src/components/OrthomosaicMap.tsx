import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface OrthomosaicMapProps {
  tileUrl: string;
  center: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  attribution?: string;
  bounds?: [[number, number], [number, number]];
}

const OrthomosaicMap = ({
  tileUrl,
  center,
  zoom = 16,
  minZoom = 3,
  maxZoom = 20,
  attribution = "© Spexi",
  bounds,
}: OrthomosaicMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      minZoom,
      maxZoom,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    // Dark base layer (CartoDB Dark Matter) — fits the app's dark theme
    const baseLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      }
    ).addTo(map);

    // Satellite/imagery alternative
    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 19,
      }
    );

    // The orthomosaic overlay
    const ortho = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 22,
      opacity: 1,
    }).addTo(map);

    L.control
      .layers(
        { Dark: baseLayer, Satellite: satelliteLayer },
        { Orthomosaic: ortho },
        { collapsed: false, position: "topright" }
      )
      .addTo(map);

    if (bounds) {
      L.rectangle(bounds, {
        color: "#ec4899",
        weight: 2,
        fillOpacity: 0,
        dashArray: "4 4",
      }).addTo(map);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    // Resize fix when mounted inside a flex/absolute container
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [tileUrl, center, zoom, minZoom, maxZoom, attribution, bounds]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" style={{ background: "#0a0a0a" }} />
    </div>
  );
};

export default OrthomosaicMap;