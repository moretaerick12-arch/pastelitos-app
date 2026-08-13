"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap } from "react-leaflet";
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

const userLocationIcon = L.divIcon({
  html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface MapInnerProps {
  markers: MapMarker[];
  className?: string;
  zoom?: number;
  onClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
}

function MapEvents({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function CenterMapControl({ userLocation }: { userLocation: [number, number] | null }) {
  const map = useMap();
  
  if (!userLocation) return null;
  
  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          map.flyTo(userLocation, 16);
        }}
        className="bg-white hover:bg-slate-50 text-slate-800 font-semibold py-2 px-4 rounded-xl shadow-lg border border-slate-200 transition-colors flex items-center gap-2"
      >
        <span>📍</span> Centrar en mí
      </button>
    </div>
  );
}

export default function MapInner({ markers, className = "h-[400px] w-full rounded-xl z-0", zoom = 13, onClick, onMarkerClick }: MapInnerProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    // Apply icon fix globally once loaded
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    // Start geolocation tracking
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error watching position", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  // Center map on the first marker, or use a default center (e.g. Santo Domingo)
  const defaultCenter: [number, number] = markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [18.4861, -69.9312]; // Santo Domingo coordinates

  const routeCoordinates = markers.map(m => [m.lat, m.lng] as [number, number]);

  return (
    <div className={className + " relative"}>
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
        
        {routeCoordinates.length > 1 && (
          <Polyline positions={routeCoordinates} color="#f59e0b" weight={4} dashArray="10, 10" />
        )}

        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]}
            icon={marker.color || marker.number ? createCustomIcon(marker.number, marker.color) : defaultIcon}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) onMarkerClick(marker.id);
              }
            }}
          >
            <Popup>
              <div className="font-sans">
                <p className="font-semibold text-gray-900 m-0">{marker.title}</p>
                {marker.subtitle && <p className="text-sm text-gray-500 mt-1 mb-0">{marker.subtitle}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={1000} />
        )}
        
        <CenterMapControl userLocation={userLocation} />
      </MapContainer>
    </div>
  );
}
