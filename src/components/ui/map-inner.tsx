"use client";

import { useEffect, useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
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

const createCustomIcon = (
  number?: number, 
  colorClass: string = "bg-amber-500", 
  isSelected: boolean = false,
  isVisited: boolean = false
) => {
  let innerHtml = "";
  
  if (isVisited) {
    innerHtml = `
      <div class="relative flex items-center justify-center">
        ${isSelected ? '<span class="absolute -inset-1.5 rounded-full bg-emerald-400 opacity-60 animate-ping"></span>' : ''}
        <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-lg border-2 ${isSelected ? 'border-white ring-4 ring-emerald-400/80 scale-110' : 'border-white'} text-sm transition-transform">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      </div>
    `;
  } else if (isSelected) {
    innerHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute -inset-2 rounded-full bg-amber-400 opacity-60 animate-ping"></span>
        <div class="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-black shadow-xl border-2 border-white ring-4 ring-indigo-500 scale-110 text-sm transition-transform">
          ${number || ''}
        </div>
      </div>
    `;
  } else {
    innerHtml = `
      <div class="w-8 h-8 rounded-full ${colorClass} text-white flex items-center justify-center font-bold shadow-md border-2 border-white text-sm hover:scale-110 transition-transform">
        ${number || ''}
      </div>
    `;
  }

  return L.divIcon({
    html: innerHtml,
    className: 'custom-map-marker-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const userLocationIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center w-8 h-8">
      <span class="absolute w-8 h-8 bg-blue-500 rounded-full opacity-40 animate-ping"></span>
      <span class="absolute w-5 h-5 bg-blue-400/50 rounded-full"></span>
      <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
    </div>
  `,
  className: 'user-location-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface MapInnerProps {
  markers: MapMarker[];
  className?: string;
  zoom?: number;
  selectedMarkerId?: string | null;
  onClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
  osrmRoute?: [number, number][];
  centerOnUserTrigger?: number;
  fitBoundsTrigger?: number;
  mapType?: 'streets' | 'satellite';
}

function MapEvents({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({
  selectedMarkerId,
  markers,
  userLocation,
  centerOnUserTrigger,
  fitBoundsTrigger
}: {
  selectedMarkerId?: string | null;
  markers: MapMarker[];
  userLocation: [number, number] | null;
  centerOnUserTrigger?: number;
  fitBoundsTrigger?: number;
}) {
  const map = useMap();
  const initialFitRef = useRef(false);
  const lastSelectedIdRef = useRef<string | null>(null);

  // Initial bounds fit: only once on mount when markers are first loaded
  useEffect(() => {
    if (!initialFitRef.current && markers.length > 0) {
      try {
        const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        initialFitRef.current = true;
      } catch (e) {
        console.warn("initial fitBounds failed:", e);
      }
    }
  }, [markers.length > 0, map]);

  // Fit bounds triggered explicitly by button click
  useEffect(() => {
    if (fitBoundsTrigger && fitBoundsTrigger > 0 && markers.length > 0) {
      try {
        const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
        if (userLocation) {
          bounds.extend(userLocation);
        }
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
      } catch (e) {
        console.warn("fitBounds trigger failed:", e);
      }
    }
  }, [fitBoundsTrigger]);

  // Fly to user location triggered explicitly by "Centrar en mí" button click
  useEffect(() => {
    if (centerOnUserTrigger && centerOnUserTrigger > 0 && userLocation) {
      map.flyTo(userLocation, 16, { duration: 0.8 });
    }
  }, [centerOnUserTrigger]);

  // Pan ONLY when selectedMarkerId genuinely changes to a different marker
  useEffect(() => {
    if (selectedMarkerId && selectedMarkerId !== lastSelectedIdRef.current) {
      const selected = markers.find(m => m.id === selectedMarkerId);
      if (selected) {
        map.panTo([selected.lat, selected.lng], { animate: true, duration: 0.6 });
        lastSelectedIdRef.current = selectedMarkerId;
      }
    } else if (!selectedMarkerId) {
      lastSelectedIdRef.current = null;
    }
  }, [selectedMarkerId]);

  return null;
}

export default function MapInner({ 
  markers, 
  className = "h-[450px] w-full rounded-xl z-0", 
  zoom = 14, 
  selectedMarkerId,
  onClick, 
  onMarkerClick, 
  osrmRoute,
  centerOnUserTrigger,
  fitBoundsTrigger,
  mapType = 'streets'
}: MapInnerProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    } catch (e) {
      console.warn("Leaflet icon merge warning:", e);
    }

    // Start geolocation tracking
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocation watch warning:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  // Center map on selected marker, or first marker, or Santo Domingo
  const defaultCenter: [number, number] = markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [18.4861, -69.9312]; // Santo Domingo default

  const routeCoordinates = markers.map(m => [m.lat, m.lng] as [number, number]);

  return (
    <div className={`relative ${className}`} style={{ minHeight: "420px", height: "100%", width: "100%" }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", minHeight: "420px", zIndex: 0 }}
        className="rounded-2xl overflow-hidden"
      >
        {mapType === 'satellite' ? (
          <TileLayer
            key="satellite-layer"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            key="streets-layer"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}
        
        <MapEvents onClick={onClick} />
        
        <MapController 
          selectedMarkerId={selectedMarkerId}
          markers={markers}
          userLocation={userLocation}
          centerOnUserTrigger={centerOnUserTrigger}
          fitBoundsTrigger={fitBoundsTrigger}
        />

        {/* Polylines: OSRM driving route or fallback dash polyline */}
        {osrmRoute && osrmRoute.length > 1 ? (
          <>
            <Polyline positions={osrmRoute} color="#d97706" weight={7} opacity={0.6} />
            <Polyline positions={osrmRoute} color="#f59e0b" weight={4} opacity={0.9} />
          </>
        ) : routeCoordinates.length > 1 ? (
          <Polyline positions={routeCoordinates} color="#f59e0b" weight={3} dashArray="8, 8" opacity={0.8} />
        ) : null}

        {/* Markers */}
        {markers.map((marker) => {
          const isSelected = selectedMarkerId === marker.id;
          const isVisited = !!marker.visited;
          const icon = createCustomIcon(
            marker.number, 
            marker.color || (isVisited ? "bg-emerald-600" : "bg-amber-500"), 
            isSelected, 
            isVisited
          );

          return (
            <Marker 
              key={marker.id} 
              position={[marker.lat, marker.lng]}
              icon={icon}
              zIndexOffset={isSelected ? 1000 : (marker.number ? 500 - marker.number : 100)}
              eventHandlers={{
                click: (e) => {
                  if (onMarkerClick) {
                    onMarkerClick(marker.id);
                  }
                }
              }}
            >
              <Popup className="delivery-client-popup">
                <div className="p-1 min-w-[160px] font-sans">
                  <div className="flex items-center gap-1.5 mb-1">
                    {marker.number && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                        {marker.number}
                      </span>
                    )}
                    <p className="font-bold text-slate-900 text-sm leading-tight m-0 truncate">
                      {marker.title}
                    </p>
                  </div>
                  {marker.subtitle && (
                    <p className="text-xs text-slate-500 m-0 line-clamp-2">
                      {marker.subtitle}
                    </p>
                  )}
                  {marker.balance !== undefined && marker.balance > 0 && (
                    <div className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      Deuda: RD$ {marker.balance.toLocaleString('es-DO')}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Repartidor Live GPS Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={2000}>
            <Popup>
              <div className="text-xs font-semibold text-blue-700 py-1">
                📍 Tu ubicación actual
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
