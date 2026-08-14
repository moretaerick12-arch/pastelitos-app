'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  CheckCircle2, 
  MapPin, 
  Package, 
  DownloadCloud, 
  RefreshCw, 
  GripVertical, 
  Navigation, 
  Phone,
  ShoppingCart,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crosshair,
  Maximize2,
  X,
  AlertCircle,
  Sparkles,
  Layers,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Route as RouteIcon,
  Check
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { db } from '@/lib/db';
import { SyncManager } from '@/lib/sync/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { Map, MapMarker } from '@/components/ui/map';

export default function RutaPage() {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Map & View states
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'visited' | 'debt'>('all');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  
  // Map interactions
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [centerOnUserTrigger, setCenterOnUserTrigger] = useState(0);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  
  // Route data
  const [osrmRoute, setOsrmRoute] = useState<[number, number][] | undefined>(undefined);
  const [routeMeta, setRouteMeta] = useState<{distance: number, duration: number} | null>(null);
  const supabase = createClient();
  
  // Dexie live queries
  const clients = useLiveQuery(() => db.local_clients.orderBy('visit_order').toArray()) || [];
  const inventory = useLiveQuery(() => db.local_inventory.toArray()) || [];
  const isOfflineEmpty = clients.length === 0;

  // Selected client object
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find(c => c.id === selectedClientId) || null;
  }, [selectedClientId, clients]);

  // Next pending stop in the route
  const nextPendingClient = useMemo(() => {
    return clients.find(c => !c.visited && c.lat && c.lng) || null;
  }, [clients]);

  // Search filtered results for search dropdown
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 5);
  }, [clients, searchQuery]);

  // Filtered clients for map markers and list
  const filteredClients = useMemo(() => {
    let list = clients;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.address && c.address.toLowerCase().includes(q))
      );
    }
    switch (filterMode) {
      case 'pending':
        return list.filter(c => !c.visited);
      case 'visited':
        return list.filter(c => c.visited);
      case 'debt':
        return list.filter(c => (c.current_balance || 0) > 0);
      default:
        return list;
    }
  }, [clients, filterMode, searchQuery]);

  // Sync handler
  const handleSync = async () => {
    setSyncing(true);
    try {
      await SyncManager.sync();
    } catch (e) {
      console.error('Error syncing:', e);
    } finally {
      setSyncing(false);
    }
  };

  // Fetch OSRM Route
  useEffect(() => {
    const fetchRoute = async () => {
      const validClients = clients
        .filter(c => c.lat && c.lng)
        .sort((a, b) => a.visit_order - b.visit_order);
        
      if (validClients.length < 2) {
        setOsrmRoute(undefined);
        setRouteMeta(null);
        return;
      }
      
      const coordsString = validClients.map(c => `${c.lng},${c.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
      
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteMeta({ distance: route.distance, duration: route.duration });
          const coords = route.geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
          setOsrmRoute(coords);
        }
      } catch (err) {
        console.error('Error fetching OSRM route:', err);
      }
    };
    
    if (clients.length > 0) {
      fetchRoute();
    }
  }, [clients]);

  // Auto select first client once on initial load
  const initialAutoSelectDoneRef = useRef(false);
  useEffect(() => {
    if (!initialAutoSelectDoneRef.current && clients.length > 0) {
      const firstPending = clients.find(c => !c.visited && c.lat && c.lng);
      if (firstPending) {
        setSelectedClientId(firstPending.id);
      } else if (clients[0]) {
        setSelectedClientId(clients[0].id);
      }
      initialAutoSelectDoneRef.current = true;
    }
  }, [clients]);

  // Live query for current route metadata to check if in demo mode
  const currentRouteMeta = useLiveQuery(() => db.meta.get('current_route_id'));
  const isDemoActive = currentRouteMeta?.value === 'demo-route-1';

  // Load Demo Data for instant testing
  const loadDemoRoute = async () => {
    const demoClients = [
      {
        id: 'demo-1',
        name: 'Colmado La Fe',
        address: 'Av. Winston Churchill #45, Piantini',
        phone: '809-555-0101',
        current_balance: 1500,
        credit_limit: 5000,
        visit_order: 1,
        visited: false,
        lat: 18.4725,
        lng: -69.9405,
      },
      {
        id: 'demo-2',
        name: 'Colmado El Progreso',
        address: 'Calle Rafael Augusto Sánchez #12, Naco',
        phone: '809-555-0102',
        current_balance: 0,
        credit_limit: 8000,
        visit_order: 2,
        visited: false,
        lat: 18.4789,
        lng: -69.9281,
      },
      {
        id: 'demo-3',
        name: 'Mini Market Los Prados',
        address: 'Calle Lorenzo Despradel #88, Los Prados',
        phone: '809-555-0103',
        current_balance: 3200,
        credit_limit: 6000,
        visit_order: 3,
        visited: false,
        lat: 18.4842,
        lng: -69.9521,
      },
      {
        id: 'demo-4',
        name: 'Colmado Don Pepe',
        address: 'Av. Tiradentes #22, Ensanche La Fe',
        phone: '809-555-0104',
        current_balance: 0,
        credit_limit: 4000,
        visit_order: 4,
        visited: true,
        lat: 18.4915,
        lng: -69.9250,
      },
      {
        id: 'demo-5',
        name: 'Puesto El Chimi Dominicano',
        address: 'Av. John F. Kennedy esq. Lincoln',
        phone: '809-555-0105',
        current_balance: 850,
        credit_limit: 3000,
        visit_order: 5,
        visited: false,
        lat: 18.4878,
        lng: -69.9380,
      }
    ];

    const demoInventory = [
      { product_id: 'prod-1', name: 'Pastelito de Pollo', quantity_dispatched: 60, price_per_unit: 45 },
      { product_id: 'prod-2', name: 'Pastelito de Queso', quantity_dispatched: 50, price_per_unit: 45 },
      { product_id: 'prod-3', name: 'Pastelito de Carne', quantity_dispatched: 40, price_per_unit: 50 },
      { product_id: 'prod-4', name: 'Quipe Tradicional', quantity_dispatched: 35, price_per_unit: 40 }
    ];

    await db.local_clients.clear();
    await db.local_clients.bulkAdd(demoClients);
    await db.local_inventory.clear();
    await db.local_inventory.bulkAdd(demoInventory);
    await db.meta.put({ key: 'current_route_id', value: 'demo-route-1' });
    await db.meta.put({ key: 'repartidor_id', value: 'demo-repartidor-1' });
    
    // Remember in localStorage that user activated demo mode
    if (typeof window !== 'undefined') {
      localStorage.setItem('pastelitos_demo_mode', 'true');
    }

    setSelectedClientId('demo-1');
    setTimeout(() => setFitBoundsTrigger(prev => prev + 1), 300);
  };

  // On initial mount: restore demo mode if user left it active previously
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDemoPref = localStorage.getItem('pastelitos_demo_mode');
      if (savedDemoPref === 'true') {
        db.local_clients.count().then(count => {
          if (count === 0) {
            loadDemoRoute();
          }
        });
      }
    }
  }, []);

  // Toggle Demo Mode (Activate or Deactivate/Clear)
  const toggleDemoMode = async () => {
    if (isDemoActive) {
      // Clear demo data and reset to real state
      await db.local_clients.clear();
      await db.local_inventory.clear();
      await db.meta.delete('current_route_id');
      await db.meta.delete('repartidor_id');
      
      // Remember in localStorage that user deactivated demo mode
      if (typeof window !== 'undefined') {
        localStorage.setItem('pastelitos_demo_mode', 'false');
      }

      setSelectedClientId(null);
      setOsrmRoute(undefined);
      setRouteMeta(null);
      initialAutoSelectDoneRef.current = false;
    } else {
      // Activate Demo Mode
      await loadDemoRoute();
    }
  };

  // Download daily route to local DB
  const downloadRoute = async () => {
    setDownloading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Debes iniciar sesión para descargar tu ruta.');
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data: route } = await supabase
        .from('daily_routes')
        .select('id')
        .eq('repartidor_id', user.id)
        .eq('route_date', today)
        .single();
        
      if (!route) {
        alert('No tienes una ruta asignada para hoy en Supabase. Puedes usar "Modo Demo" para explorar.');
        setDownloading(false);
        return;
      }
      
      const { data: clientsData } = await supabase
        .from('route_clients')
        .select(`
          client_id,
          visit_order,
          clients ( name, address, phone, current_balance, credit_limit, lat, lng )
        `)
        .eq('route_id', route.id)
        .order('visit_order', { ascending: true });
        
      const { data: salesData } = await supabase
        .from('sales')
        .select('client_id')
        .eq('daily_route_id', route.id);
        
      const visitedClientIds = new Set(salesData?.map(s => s.client_id) || []);
        
      const { data: invData } = await supabase
        .from('daily_route_inventory')
        .select(`
          product_id,
          quantity_dispatched,
          products ( name, price_per_unit )
        `)
        .eq('daily_route_id', route.id);

      await db.meta.put({ key: 'current_route_id', value: route.id });
      await db.meta.put({ key: 'repartidor_id', value: user.id });

      if (clientsData) {
        await db.local_clients.clear();
        const clientsToInsert = clientsData.map(c => ({
          id: c.client_id,
          name: (c.clients as any)?.name || 'Cliente sin nombre',
          address: (c.clients as any)?.address || 'Sin dirección',
          phone: (c.clients as any)?.phone || null,
          current_balance: Number((c.clients as any)?.current_balance) || 0,
          credit_limit: Number((c.clients as any)?.credit_limit) || 0,
          lat: (c.clients as any)?.lat ? Number((c.clients as any).lat) : null,
          lng: (c.clients as any)?.lng ? Number((c.clients as any).lng) : null,
          visit_order: c.visit_order,
          visited: visitedClientIds.has(c.client_id)
        }));
        await db.local_clients.bulkAdd(clientsToInsert);
      }
      
      if (invData) {
        await db.local_inventory.clear();
        const invToInsert = invData.map(inv => ({
          product_id: inv.product_id,
          name: (inv.products as any)?.name || 'Producto',
          quantity_dispatched: inv.quantity_dispatched,
          price_per_unit: Number((inv.products as any)?.price_per_unit) || 0
        }));
        await db.local_inventory.bulkAdd(invToInsert);
      }
      
      setTimeout(() => setFitBoundsTrigger(prev => prev + 1), 300);
      
    } catch (error) {
      console.error('Error downloading route:', error);
      alert('Error descargando la ruta');
    } finally {
      setDownloading(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;
    
    const newClients = [...clients];
    const [removed] = newClients.splice(sourceIndex, 1);
    newClients.splice(destinationIndex, 0, removed);
    
    const updatedClients = newClients.map((client, index) => ({
      ...client,
      visit_order: index + 1
    }));
    
    await db.local_clients.bulkPut(updatedClients);
  };

  // Step between clients on map
  const handleStepClient = (direction: 'next' | 'prev') => {
    const validClients = clients.filter(c => c.lat && c.lng).sort((a, b) => a.visit_order - b.visit_order);
    if (validClients.length === 0) return;
    
    const currentIndex = validClients.findIndex(c => c.id === selectedClientId);
    let newIndex = 0;
    
    if (currentIndex === -1) {
      newIndex = 0;
    } else if (direction === 'next') {
      newIndex = (currentIndex + 1) % validClients.length;
    } else {
      newIndex = (currentIndex - 1 + validClients.length) % validClients.length;
    }
    
    setSelectedClientId(validClients[newIndex].id);
  };

  const visitedCount = clients.filter(c => c.visited).length;
  const progressPercent = clients.length > 0 ? Math.round((visitedCount / clients.length) * 100) : 0;
  const debtClientsCount = clients.filter(c => (c.current_balance || 0) > 0).length;

  // Prepare map markers
  const mapMarkers: MapMarker[] = useMemo(() => {
    return filteredClients
      .filter(c => c.lat && c.lng)
      .map(c => ({
        id: c.id,
        lat: c.lat!,
        lng: c.lng!,
        title: c.name,
        subtitle: c.address || 'Sin dirección',
        number: c.visit_order,
        visited: c.visited,
        balance: c.current_balance,
        phone: c.phone || undefined,
        color: c.visited ? 'bg-emerald-600' : 'bg-amber-500'
      }));
  }, [filteredClients]);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[580px] overflow-hidden flex flex-col bg-slate-100 select-none">
      
      {/* ========================================================= */}
      {/* FULL EDGE-TO-EDGE GOOGLE MAPS CANVAS                     */}
      {/* ========================================================= */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Map 
          markers={mapMarkers} 
          className="w-full h-full" 
          zoom={14}
          selectedMarkerId={selectedClientId}
          onMarkerClick={(id) => {
            setSelectedClientId(id);
            setSheetExpanded(false);
          }}
          osrmRoute={osrmRoute}
          centerOnUserTrigger={centerOnUserTrigger}
          fitBoundsTrigger={fitBoundsTrigger}
          mapType={mapType}
        />
      </div>

      {/* ========================================================= */}
      {/* TOP FLOATING OVERLAYS: GOOGLE MAPS SEARCH & FILTERS       */}
      {/* ========================================================= */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
        
        {/* Google Maps Capsule Search Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.14)] border border-slate-200/90 flex items-center px-3.5 py-2 pointer-events-auto transition-all">
          <Search size={18} className="text-amber-500 shrink-0 mr-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearching(true)}
            placeholder="Buscar colmado, cliente o calle..."
            className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full mr-1"
            >
              <X size={16} />
            </button>
          ) : null}

          {/* Top Quick Actions (Demo & Sync) */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              onClick={toggleDemoMode}
              className={`flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all active:scale-95 border ${
                mounted && isDemoActive 
                  ? 'bg-rose-500 text-white border-rose-400' 
                  : 'bg-amber-500 text-white border-amber-400/80 shadow-sm'
              }`}
              title={mounted && isDemoActive ? 'Desactivar Modo Demo' : 'Activar Modo Demo'}
            >
              <Sparkles size={12} />
              <span>{mounted && isDemoActive ? 'Salir' : 'Demo'}</span>
            </button>
            
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50 active:scale-95"
              title="Sincronizar ruta"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin text-amber-500' : ''} />
            </button>
          </div>
        </div>

        {/* Live Search Suggestions Dropdown */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-1.5 flex flex-col gap-1 pointer-events-auto max-h-56 overflow-y-auto animate-slide-up">
            {searchResults.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClientId(c.id);
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                    #{c.visit_order}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.address}</p>
                  </div>
                </div>
                {c.visited ? (
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0 ml-2" />
                ) : (
                  <ArrowRight size={15} className="text-slate-400 shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Turn-by-Turn Navigation Header Banner (Google Maps Nav style) */}
        {nextPendingClient && (
          <div 
            onClick={() => setSelectedClientId(nextPendingClient.id)}
            className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl px-3.5 py-2.5 shadow-xl border border-slate-700/80 flex items-center justify-between pointer-events-auto cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                <Navigation size={17} className="transform rotate-45" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">Próxima Parada</span>
                  <span className="text-[10px] text-slate-400">• Parada #{nextPendingClient.visit_order}</span>
                </div>
                <h4 className="font-extrabold text-xs text-white truncate">{nextPendingClient.name}</h4>
              </div>
            </div>

            <Link
              href={`/sale?clientId=${nextPendingClient.id}`}
              onClick={(e) => e.stopPropagation()}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1 shrink-0 ml-2"
            >
              <span>Vender</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Filter Chips Bar */}
        {clients.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-md transition-all ${
                filterMode === 'all' 
                  ? 'bg-slate-900 text-white ring-2 ring-slate-900' 
                  : 'bg-white/95 backdrop-blur text-slate-700 hover:bg-white'
              }`}
            >
              Todos ({clients.length})
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-md transition-all ${
                filterMode === 'pending' 
                  ? 'bg-amber-500 text-white ring-2 ring-amber-400' 
                  : 'bg-white/95 backdrop-blur text-amber-700 hover:bg-white'
              }`}
            >
              Pendientes ({clients.filter(c => !c.visited).length})
            </button>
            <button
              onClick={() => setFilterMode('visited')}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-md transition-all ${
                filterMode === 'visited' 
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' 
                  : 'bg-white/95 backdrop-blur text-emerald-700 hover:bg-white'
              }`}
            >
              Visitados ({visitedCount})
            </button>
            {debtClientsCount > 0 && (
              <button
                onClick={() => setFilterMode('debt')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-md transition-all ${
                  filterMode === 'debt' 
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400' 
                    : 'bg-white/95 backdrop-blur text-rose-700 hover:bg-white'
                }`}
              >
                Con Deuda ({debtClientsCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* FLOATING ACTION BUTTONS (GOOGLE MAPS RIGHT CONTROLS)      */}
      {/* ========================================================= */}
      <div className="absolute right-3 top-36 z-[1000] flex flex-col gap-2 pointer-events-auto">
        {/* Layer Switcher (Streets vs Satellite) */}
        <button
          onClick={() => setMapType(prev => prev === 'streets' ? 'satellite' : 'streets')}
          className={`p-2.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all active:scale-90 ${
            mapType === 'satellite' 
              ? 'bg-amber-500 text-white border-amber-400' 
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
          }`}
          title={mapType === 'streets' ? 'Cambiar a Vista Satélite' : 'Cambiar a Vista Callejera'}
        >
          <Layers size={18} />
        </button>

        {/* GPS Radar / Center on User */}
        <button
          onClick={() => setCenterOnUserTrigger(prev => prev + 1)}
          className="p-2.5 bg-white/95 hover:bg-white text-blue-600 rounded-2xl shadow-xl border border-slate-200 transition-all active:scale-90"
          title="Mi ubicación GPS actual"
        >
          <Crosshair size={18} />
        </button>

        {/* Zoom to fit entire route */}
        <button
          onClick={() => setFitBoundsTrigger(prev => prev + 1)}
          className="p-2.5 bg-white/95 hover:bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 transition-all active:scale-90"
          title="Ver toda la ruta"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* ========================================================= */}
      {/* GOOGLE MAPS BOTTOM SHEET DRAWER (3-STATES)                */}
      {/* ========================================================= */}
      <div 
        className={`absolute left-0 right-0 bottom-0 z-[1000] bg-white/98 backdrop-blur-md rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.18)] border-t border-slate-200/90 transition-all duration-300 flex flex-col ${
          sheetExpanded 
            ? 'h-[82%] max-h-[600px]' 
            : selectedClient 
              ? 'h-auto max-h-[340px]' 
              : 'h-[75px]'
        }`}
      >
        {/* Pull Handle Header */}
        <div 
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="w-full flex flex-col items-center justify-center pt-2 pb-1.5 cursor-pointer hover:bg-slate-50 rounded-t-3xl"
        >
          <div className="w-10 h-1 rounded-full bg-slate-300 mb-1"></div>
          <div className="w-full px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <RouteIcon size={14} className="text-amber-500" />
                Ruta del Día
              </span>
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {visitedCount}/{clients.length} Paradas
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-slate-500 text-[11px] font-semibold">
              <span>{sheetExpanded ? 'Ocultar lista' : 'Ver lista completa'}</span>
              {sheetExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
          </div>
        </div>

        {/* Daily Progress Bar */}
        <div className="w-full px-4 pb-2">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM SHEET CONTENT: SELECTED CLIENT DETAILS OR FULL LIST   */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          
          {/* STATE A: EXPANDED FULL ROUTE LIST & INVENTORY */}
          {sheetExpanded ? (
            <div className="flex flex-col gap-4 pt-1 animate-fade-in">
              {/* Inventory summary in sheet */}
              <section className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package size={14} className="text-amber-500" />
                  Inventario en el Furgón
                </h4>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {inventory.map(item => (
                    <div key={item.product_id} className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                      <span className="text-[10px] text-slate-500 block truncate">{item.name}</span>
                      <span className="text-xs font-black text-slate-800">{item.quantity_dispatched} uds</span>
                    </div>
                  ))}
                  {inventory.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">Sin inventario registrado</p>
                  )}
                </div>
              </section>

              {/* Full Stops Sequence */}
              <section>
                <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Secuencia de Paradas (Arrastra para reordenar)
                </h4>
                
                {isOfflineEmpty ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-500 mb-3">No hay ruta activa cargada.</p>
                    <button
                      onClick={toggleDemoMode}
                      className="bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md"
                    >
                      Cargar Ruta de Prueba
                    </button>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="sheet-clients">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-2">
                          {clients.map((rc, index) => (
                            <Draggable key={rc.id} draggableId={rc.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  onClick={() => {
                                    setSelectedClientId(rc.id);
                                    setSheetExpanded(false);
                                  }}
                                  className={`bg-white rounded-xl p-2.5 border transition-all flex items-center gap-2.5 cursor-pointer ${
                                    rc.id === selectedClientId 
                                      ? 'border-amber-400 ring-2 ring-amber-400/40' 
                                      : 'border-slate-200'
                                  } ${snapshot.isDragging ? 'shadow-lg scale-102' : ''}`}
                                >
                                  <div {...provided.dragHandleProps} className="text-slate-300 p-1">
                                    <GripVertical size={16} />
                                  </div>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                    rc.visited 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {rc.visited ? '✓' : rc.visit_order}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs text-slate-800 truncate">{rc.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{rc.address}</p>
                                  </div>
                                  {rc.current_balance > 0 && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                      RD$ {rc.current_balance}
                                    </span>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </section>
            </div>
          ) : selectedClient ? (
            /* STATE B: SELECTED CLIENT CARD (GOOGLE MAPS PLACE CARD) */
            <div className="flex flex-col gap-2.5 pt-1 animate-fade-in">
              
              {/* Header: Number, Name, Debt */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow-md ${
                    selectedClient.visited ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}>
                    {selectedClient.visited ? '✓' : `#${selectedClient.visit_order}`}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate leading-tight">
                      {selectedClient.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="shrink-0 text-slate-400" />
                      {selectedClient.address || 'Sin dirección registrada'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {selectedClient.current_balance > 0 ? (
                    <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                      Debe RD$ {selectedClient.current_balance.toLocaleString('es-DO')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      Al día
                    </span>
                  )}
                  <button 
                    onClick={() => setSelectedClientId(null)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* 4 Google Maps Action Buttons */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {/* Vender */}
                <Link
                  href={`/sale?clientId=${selectedClient.id}`}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold py-2 px-1 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 shadow-md shadow-amber-500/20 transition-all text-center"
                >
                  <ShoppingCart size={16} />
                  <span>Vender</span>
                </Link>

                {/* Cobrar */}
                {selectedClient.current_balance > 0 ? (
                  <Link
                    href={`/collection?clientId=${selectedClient.id}`}
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2 px-1 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 shadow-md shadow-emerald-600/20 transition-all text-center"
                  >
                    <Wallet size={16} />
                    <span>Cobrar</span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="bg-slate-100 text-slate-400 font-semibold py-2 px-1 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-60 text-center"
                  >
                    <Wallet size={16} />
                    <span>Sin Deuda</span>
                  </button>
                )}

                {/* Navegar */}
                {selectedClient.lat && selectedClient.lng ? (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClient.lat},${selectedClient.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 font-bold py-2 px-1 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 border border-indigo-200 transition-all text-center"
                  >
                    <Navigation size={16} className="text-indigo-600" />
                    <span>Navegar</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="bg-slate-100 text-slate-400 font-semibold py-2 px-1 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-60 text-center"
                  >
                    <Navigation size={16} />
                    <span>Sin GPS</span>
                  </button>
                )}

                {/* Llamar */}
                {selectedClient.phone ? (
                  <a
                    href={`tel:${selectedClient.phone}`}
                    className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold py-2 px-1 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 transition-all text-center"
                  >
                    <Phone size={16} />
                    <span>Llamar</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="bg-slate-100 text-slate-400 font-semibold py-2 px-1 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-60 text-center"
                  >
                    <Phone size={16} />
                    <span>Sin Tel</span>
                  </button>
                )}
              </div>

              {/* Next/Prev Stepper Navigation */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <button
                  onClick={() => handleStepClient('prev')}
                  className="py-1 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-90 transition-all text-xs font-semibold flex items-center gap-1"
                >
                  <ChevronLeft size={13} />
                  <span>Anterior</span>
                </button>

                <span className="text-[11px] text-slate-400 font-semibold">
                  Parada {selectedClient.visit_order} de {clients.length}
                </span>

                <button
                  onClick={() => handleStepClient('next')}
                  className="py-1 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-90 transition-all text-xs font-semibold flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight size={13} />
                </button>
              </div>

            </div>
          ) : (
            /* STATE C: COLLAPSED SUMMARY (NO CLIENT SELECTED) */
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-slate-500 font-medium">Toca cualquier parada en el mapa para ver sus opciones.</span>
              <button
                onClick={() => setSheetExpanded(true)}
                className="text-amber-600 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Ver ruta</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
