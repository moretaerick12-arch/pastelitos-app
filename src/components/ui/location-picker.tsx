'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Crosshair, Loader2, Check, Navigation, Trash2 } from 'lucide-react';
import { Map, MapMarker } from '@/components/ui/map';

interface LocationPickerProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  address?: string;
  onChange: (lat: number | null, lng: number | null, address?: string) => void;
  title?: string;
  className?: string;
  defaultCenter?: [number, number];
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPicker({
  lat,
  lng,
  address = '',
  onChange,
  title = 'Ubicación',
  className = '',
  defaultCenter = [18.4861, -69.9312] // Santo Domingo
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [gettingGPS, setGettingGPS] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search with Nominatim OpenStreetMap
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 3) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Search prioritizing Dominican Republic
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=do&limit=5`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'es' }
        });
        const data: SearchResult[] = await res.json();
        setSearchResults(data);
        setIsDropdownOpen(data.length > 0);
      } catch (err) {
        console.error('Error searching location:', err);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  // Select search result
  const handleSelectResult = (result: SearchResult) => {
    const selectedLat = parseFloat(result.lat);
    const selectedLng = parseFloat(result.lon);
    
    // Shorten long OSM address format
    const shortAddress = result.display_name.split(',').slice(0, 3).join(',').trim();
    
    onChange(selectedLat, selectedLng, shortAddress);
    setSearchQuery('');
    setSearchResults([]);
    setIsDropdownOpen(false);
  };

  // Get current device GPS location
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada por el navegador.');
      return;
    }

    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const curLat = pos.coords.latitude;
        const curLng = pos.coords.longitude;

        // Try reverse geocoding to suggest address if empty
        let suggestedAddress = address;
        try {
          const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${curLat}&lon=${curLng}`;
          const res = await fetch(revUrl, { headers: { 'Accept-Language': 'es' } });
          const data = await res.json();
          if (data && data.display_name && !address) {
            suggestedAddress = data.display_name.split(',').slice(0, 3).join(',').trim();
          }
        } catch (e) {
          console.warn('Reverse geocoding warning:', e);
        }

        onChange(curLat, curLng, suggestedAddress);
        setGettingGPS(false);
      },
      (err) => {
        setGettingGPS(false);
        alert('No se pudo obtener la ubicación GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Click on map to place pin
  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    let suggestedAddress = address;
    try {
      const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickedLat}&lon=${clickedLng}`;
      const res = await fetch(revUrl, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      if (data && data.display_name && !address) {
        suggestedAddress = data.display_name.split(',').slice(0, 3).join(',').trim();
      }
    } catch (e) {
      console.warn('Reverse geocoding on click warning:', e);
    }

    onChange(clickedLat, clickedLng, suggestedAddress);
  };

  const hasCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng));

  const markers: MapMarker[] = hasCoords ? [
    {
      id: 'picker-pin',
      lat: Number(lat),
      lng: Number(lng),
      title: title || 'Punto fijado',
      subtitle: address || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      color: 'bg-amber-500'
    }
  ] : [];

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {/* Top Search and GPS Action Bar */}
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center gap-2">
          {/* Address Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar dirección o lugar..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-8 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
            {searching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" />
            )}
          </div>

          {/* GPS Button */}
          <button
            type="button"
            onClick={handleGetGPS}
            disabled={gettingGPS}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 active:scale-95 transition-all shrink-0 disabled:opacity-50"
            title="Usar mi ubicación GPS actual"
          >
            {gettingGPS ? (
              <Loader2 size={14} className="animate-spin text-blue-600" />
            ) : (
              <Crosshair size={14} className="text-blue-600" />
            )}
            <span>GPS Actual</span>
          </button>
        </div>

        {/* Search Results Dropdown */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div className="absolute top-11 left-0 right-0 z-[2000] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
            {searchResults.map((res) => (
              <button
                key={res.place_id}
                type="button"
                onClick={() => handleSelectResult(res)}
                className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-900 border-b border-slate-100 last:border-0 flex items-start gap-2 transition-colors"
              >
                <MapPin size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="truncate">{res.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map View */}
      <div className="relative w-full h-[220px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
        <Map
          markers={markers}
          className="w-full h-full"
          zoom={hasCoords ? 16 : 13}
          onClick={handleMapClick}
        />

        {/* Tip Badge */}
        <div className="absolute top-2 left-2 z-[1000] bg-slate-900/80 backdrop-blur text-white text-[10px] font-semibold px-2 py-1 rounded-lg pointer-events-none shadow">
          👆 Toca en el mapa para marcar punto
        </div>

        {/* Remove Pin Button if set */}
        {hasCoords && (
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="absolute bottom-2 left-2 z-[1000] bg-white/90 hover:bg-rose-50 text-rose-600 text-xs font-bold px-2 py-1 rounded-lg border border-rose-200 shadow flex items-center gap-1 transition-all active:scale-95"
            title="Quitar ubicación"
          >
            <Trash2 size={12} />
            <span>Quitar pin</span>
          </button>
        )}
      </div>

      {/* Status Feedback */}
      <div className="flex items-center justify-between text-xs px-1">
        {hasCoords ? (
          <div className="flex items-center gap-1 text-emerald-600 font-bold">
            <Check size={14} />
            <span>Coordenadas fijadas: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px] italic">
            Sin ubicación GPS fijada aún (opcional)
          </span>
        )}
      </div>
    </div>
  );
}
