"use client";

import dynamic from "next/dynamic";


const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-card-dark rounded-xl animate-skeleton min-h-[300px] flex items-center justify-center">
      <span className="text-secondary-400">Loading map...</span>
    </div>
  ),
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  color?: string;
  number?: number;
  visited?: boolean;
  balance?: number;
  phone?: string;
}

interface MapProps {
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

export function Map({ 
  markers, 
  className, 
  zoom = 13, 
  selectedMarkerId,
  onClick, 
  onMarkerClick, 
  osrmRoute,
  centerOnUserTrigger,
  fitBoundsTrigger,
  mapType = 'streets'
}: MapProps) {
  return (
    <MapInner 
      markers={markers} 
      className={className} 
      zoom={zoom} 
      selectedMarkerId={selectedMarkerId}
      onClick={onClick} 
      onMarkerClick={onMarkerClick} 
      osrmRoute={osrmRoute} 
      centerOnUserTrigger={centerOnUserTrigger}
      fitBoundsTrigger={fitBoundsTrigger}
      mapType={mapType}
    />
  );
}
