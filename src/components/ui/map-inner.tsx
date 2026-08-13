"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { MapMarker } from "./map";

// Default icon fallback
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const createCustomIcon = (number?: number, colorClass: string = "bg-amber-500") => {
  return L.divIcon({
    html: `<div class='${colorClass} text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-md border-2 border-white text-sm'>${number || ''}</div>`,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface MapInnerProps {
  markers: MapMarker[];
  className?: string;
  zoom?: number;
  onClick?: (lat: number, lng: number) => void;
}

function MapEvents({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapInner({ markers, className = "h-[400px] w-full rounded-xl z-0", zoom = 13, onClick }: MapInnerProps) {
  useEffect(() => {
    // Apply icon fix globally once loaded
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  // Center map on the first marker, or use a default center (e.g. Santo Domingo)
  const defaultCenter: [number, number] = markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [18.4861, -69.9312]; // Santo Domingo coordinates

  return (
    <div className={className}>
      <MapContainer 
        center={defaultCenter} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        className="rounded-xl overflow-hidden"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onClick={onClick} />
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]}
            icon={marker.color || marker.number ? createCustomIcon(marker.number, marker.color) : defaultIcon}
          >
            <Popup>
              <div className="font-sans">
                <p className="font-semibold text-gray-900 m-0">{marker.title}</p>
                {marker.subtitle && <p className="text-sm text-gray-500 mt-1 mb-0">{marker.subtitle}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
