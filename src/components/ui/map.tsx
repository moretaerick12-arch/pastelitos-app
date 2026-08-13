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
}

interface MapProps {
  markers: MapMarker[];
  className?: string;
  zoom?: number;
  onClick?: (lat: number, lng: number) => void;
}

export function Map({ markers, className, zoom = 13, onClick }: MapProps) {
  return <MapInner markers={markers} className={className} zoom={zoom} onClick={onClick} />;
}
