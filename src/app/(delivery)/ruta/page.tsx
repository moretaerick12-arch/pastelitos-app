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
  Layers
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
  const [activeTab, setActiveTab] = useState<'mapa' | 'lista'>('mapa');
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Filter states
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'visited' | 'debt'>('all');
  
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

  // Filtered clients for map and list
  const filteredClients = useMemo(() => {
    switch (filterMode) {
      case 'pending':
        return clients.filter(c => !c.visited);
      case 'visited':
        return clients.filter(c => c.visited);
      case 'debt':
        return clients.filter(c => (c.current_balance || 0) > 0);
      default:
        return clients;
    }
  }, [clients, filterMode]);

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
        alert('No tienes una ruta asignada para hoy en Supabase. Puedes usar "Cargar Demo" para explorar.');
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

  // Jump to first pending stop
  const handleJumpToNextPending = () => {
    const nextPending = clients.find(c => !c.visited && c.lat && c.lng);
    if (nextPending) {
      setSelectedClientId(nextPending.id);
    } else if (clients.length > 0) {
      alert('¡Has visitado a todos los clientes de la ruta!');
    }
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
    <div className="relative w-full h-[calc(100vh-145px)] min-h-[560px] overflow-hidden flex flex-col bg-slate-100">
      
      {/* ========================================================= */}
      {/* VISTA MAPA: EDGE-TO-EDGE FULL IMMERSIVE VIEW             */}
      {/* ========================================================= */}
      {activeTab === 'mapa' && (
        <div className="relative w-full h-full flex-1">
          
          {/* Full Screen Edge-to-Edge Leaflet Canvas */}
          <div className="absolute inset-0 w-full h-full z-0">
            <Map 
              markers={mapMarkers} 
              className="w-full h-full" 
              zoom={14}
              selectedMarkerId={selectedClientId}
              onMarkerClick={(id) => setSelectedClientId(id)}
              osrmRoute={osrmRoute}
              centerOnUserTrigger={centerOnUserTrigger}
              fitBoundsTrigger={fitBoundsTrigger}
            />
          </div>

          {/* Floating Top Floating Header: Mode Switcher & Sync */}
          <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
            
            {/* Top Row: Floating Tab Switcher + Quick Actions */}
            <div className="flex items-center justify-between gap-2 pointer-events-auto">
              
              {/* Glassmorphic Segmented Control */}
              <div className="flex bg-slate-900/85 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-white/10">
                <button 
                  onClick={() => setActiveTab('mapa')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === 'mapa' 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <MapPin size={14} />
                  <span>Mapa ({mapMarkers.length})</span>
                </button>
                <button 
                  onClick={() => setActiveTab('lista')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === 'lista' 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <GripVertical size={14} />
                  <span>Lista ({clients.length})</span>
                </button>
              </div>

              {/* Top Right Action Pills */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleDemoMode}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-2xl shadow-xl transition-all active:scale-95 border ${
                    mounted && isDemoActive 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400' 
                      : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400/50'
                  }`}
                  title={mounted && isDemoActive ? 'Desactivar Modo Demo y limpiar datos' : 'Activar Modo Demo para explorar'}
                >
                  <Sparkles size={14} />
                  <span>{mounted && isDemoActive ? 'Salir Demo' : 'Modo Demo'}</span>
                </button>
                
                <button 
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center justify-center p-2.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-2xl shadow-xl border border-white/10 active:scale-95 transition-all disabled:opacity-50"
                  title="Sincronizar ruta con servidor"
                >
                  <RefreshCw size={15} className={syncing ? 'animate-spin text-amber-400' : 'text-slate-300'} />
                </button>
              </div>
            </div>

            {/* Route Stats & Next Stop Button (Floating HUD) */}
            {routeMeta && (
              <div className="flex items-center justify-between gap-2 pointer-events-auto animate-fade-in">
                <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl shadow-lg border border-slate-700/60 flex items-center gap-2">
                  <Compass size={14} className="text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-amber-300">{(routeMeta.distance / 1000).toFixed(1)} km</span>
                  <span className="text-slate-500 text-xs">•</span>
                  <span className="text-xs font-medium text-slate-200">~{Math.round(routeMeta.duration / 60)} min</span>
                  <span className="text-slate-500 text-xs">•</span>
                  <span className="text-[11px] font-semibold text-emerald-400">{visitedCount}/{clients.length}</span>
                </div>

                <button
                  onClick={handleJumpToNextPending}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-lg border border-amber-400/80 flex items-center gap-1.5 transition-all ml-auto shrink-0"
                >
                  <span>⚡</span>
                  <span>Siguiente Parada</span>
                </button>
              </div>
            )}

            {/* Filter Chips Bar (when clients exist) */}
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

          {/* Floating Right Map Controller Actions */}
          <div className="absolute right-3 bottom-24 z-[1000] flex flex-col gap-2">
            <button
              onClick={() => setCenterOnUserTrigger(prev => prev + 1)}
              className="p-3 bg-white/95 hover:bg-white text-blue-600 rounded-2xl shadow-xl border border-slate-200 transition-all active:scale-95"
              title="Mi ubicación GPS actual"
            >
              <Crosshair size={20} />
            </button>
            <button
              onClick={() => setFitBoundsTrigger(prev => prev + 1)}
              className="p-3 bg-white/95 hover:bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 transition-all active:scale-95"
              title="Ver toda la ruta"
            >
              <Maximize2 size={20} />
            </button>
          </div>

          {/* Non-blocking Floating Bottom Banner when no local route */}
          {isOfflineEmpty && (
            <div className="absolute bottom-4 left-3 right-3 z-[1000] bg-white/98 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                  📍
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">Sin ruta activa cargada</h3>
                  <p className="text-[11px] text-slate-500">Carga colmados de prueba para explorar o descarga tu ruta asignada.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={toggleDemoMode}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                >
                  <Sparkles size={14} />
                  <span>Cargar Demo</span>
                </button>
                <button
                  onClick={downloadRoute}
                  disabled={downloading}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                >
                  {downloading ? <RefreshCw className="animate-spin" size={14} /> : <DownloadCloud size={14} />}
                  <span>Descargar Ruta</span>
                </button>
              </div>
            </div>
          )}

          {/* Selected Client Bottom Drawer / Interactive Sheet */}
          {selectedClient && !isOfflineEmpty && (
            <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/98 backdrop-blur-md rounded-3xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.25)] border border-slate-200/90 animate-slide-up">
              
              {/* Card Top Row: Order Pill, Name, Close Button */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-md">
                    #{selectedClient.visit_order}
                  </span>
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

                {/* Status & Close */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedClient.visited ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} /> Visitado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Pendiente
                    </span>
                  )}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedClientId(null);
                    }}
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors active:scale-90"
                    aria-label="Cerrar tarjeta"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Financial Status Banner */}
              {selectedClient.current_balance > 0 ? (
                <div className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-3 py-1.5 mb-3 text-xs">
                  <span className="font-medium text-rose-700 flex items-center gap-1">
                    <AlertCircle size={13} /> Deuda pendiente:
                  </span>
                  <span className="font-extrabold text-rose-800">
                    RD$ {selectedClient.current_balance.toLocaleString('es-DO')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1 mb-3 text-[11px]">
                  <span className="font-medium text-emerald-700">Estado de cuenta:</span>
                  <span className="font-bold text-emerald-800">Al día (RD$ 0.00)</span>
                </div>
              )}

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-3 gap-2 mb-2.5">
                {/* Sale Button */}
                <Link
                  href={`/sale?clientId=${selectedClient.id}`}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold py-2.5 px-2 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 shadow-md shadow-amber-500/20 transition-all text-center"
                >
                  <ShoppingCart size={17} />
                  <span>Vender</span>
                </Link>

                {/* Collection Button */}
                {selectedClient.current_balance > 0 ? (
                  <Link
                    href={`/collection?clientId=${selectedClient.id}`}
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 px-2 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 shadow-md shadow-emerald-600/20 transition-all text-center"
                  >
                    <Wallet size={17} />
                    <span>Cobrar</span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="bg-slate-100 text-slate-400 font-bold py-2.5 px-2 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-60 text-center"
                  >
                    <Wallet size={17} />
                    <span>Sin Deuda</span>
                  </button>
                )}

                {/* GPS Navigation Button (Google Maps) */}
                {selectedClient.lat && selectedClient.lng ? (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClient.lat},${selectedClient.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 font-bold py-2.5 px-2 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 border border-indigo-200 transition-all text-center"
                  >
                    <Navigation size={17} className="text-indigo-600" />
                    <span>Navegar</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="bg-slate-100 text-slate-400 font-bold py-2.5 px-2 rounded-2xl text-xs flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-60 text-center"
                  >
                    <Navigation size={17} />
                    <span>Sin GPS</span>
                  </button>
                )}
              </div>

              {/* Bottom Footer: Stepper & Phone Call */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStepClient('prev')}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-90 transition-all text-xs font-semibold flex items-center gap-1"
                    title="Parada anterior"
                  >
                    <ChevronLeft size={14} />
                    <span>Anterior</span>
                  </button>
                  <button
                    onClick={() => handleStepClient('next')}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-90 transition-all text-xs font-semibold flex items-center gap-1"
                    title="Siguiente parada"
                  >
                    <span>Siguiente</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {selectedClient.phone && (
                  <a
                    href={`tel:${selectedClient.phone}`}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Phone size={13} />
                    <span>Llamar</span>
                  </a>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA LISTA: DETAILED LIST VIEW                          */}
      {/* ========================================================= */}
      {activeTab === 'lista' && (
        <div className="flex-1 flex flex-col gap-5 p-4 pb-24 overflow-y-auto">
          
          {/* Top Switcher in List View */}
          <div className="flex bg-slate-200/80 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('mapa')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'mapa' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin size={15} />
              Vista Mapa ({mapMarkers.length})
            </button>
            <button 
              onClick={() => setActiveTab('lista')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'lista' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GripVertical size={15} />
              Vista Lista ({clients.length})
            </button>
          </div>

          {/* Inventory Summary */}
          <section>
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Package size={15} className="text-amber-500" />
              Inventario Asignado
            </h2>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 snap-x no-scrollbar">
              {inventory.map(item => (
                <div 
                  key={item.product_id} 
                  className="bg-white min-w-[130px] rounded-2xl p-3 shadow-sm border border-slate-100 snap-start flex-shrink-0 flex flex-col justify-between"
                >
                  <span className="text-xs text-slate-500 font-medium truncate">{item.name}</span>
                  <span className="text-lg font-black text-slate-800 mt-1">
                    {item.quantity_dispatched} <span className="text-xs font-normal text-slate-400">uds</span>
                  </span>
                </div>
              ))}
              {inventory.length === 0 && (
                <div className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-100 w-full text-center">
                  No hay inventario registrado en la ruta de hoy
                </div>
              )}
            </div>
          </section>

          {/* Clients List Progress & List */}
          <section>
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Secuencia de Paradas ({clients.length})
              </h2>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {visitedCount} de {clients.length} completados
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2 mb-4 overflow-hidden shadow-inner">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {isOfflineEmpty ? (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 mt-2">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                  <DownloadCloud size={32} />
                </div>
                <h2 className="text-base font-bold text-slate-800 mb-1">Sin datos locales</h2>
                <p className="text-slate-500 text-xs mb-6 max-w-xs">
                  Carga los datos de demostración o descarga tu ruta de hoy para comenzar.
                </p>
                
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={toggleDemoMode}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 text-sm"
                  >
                    <Sparkles size={18} />
                    Cargar Ruta de Prueba (Demo)
                  </button>

                  <button
                    onClick={downloadRoute}
                    disabled={downloading}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 w-full text-sm"
                  >
                    {downloading ? <RefreshCw className="animate-spin" size={18} /> : <DownloadCloud size={18} />}
                    {downloading ? 'Descargando...' : 'Descargar Ruta Asignada'}
                  </button>
                  
                  <Link 
                    href="/ruta/crear" 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all w-full text-xs"
                  >
                    <MapPin size={16} />
                    Crear Mi Propia Ruta
                  </Link>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="clients">
                  {(provided) => (
                    <div 
                      className="flex flex-col gap-2.5"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {clients.map((rc, index) => (
                        <Draggable key={rc.id} draggableId={rc.id} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              id={`client-${rc.id}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white rounded-2xl p-3.5 shadow-sm border transition-all flex items-center gap-3 ${
                                rc.visited ? 'border-slate-100 opacity-60' : 'border-slate-200/90'
                              } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-amber-500 scale-[1.02]' : ''}`}
                            >
                              {/* Drag Handle */}
                              <div 
                                {...provided.dragHandleProps} 
                                className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1"
                              >
                                <GripVertical size={20} />
                              </div>
                              
                              {/* Order Indicator / Visited check */}
                              <div className="flex-shrink-0">
                                {rc.visited ? (
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 size={18} />
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center text-xs font-black text-amber-600">
                                    {rc.visit_order}
                                  </div>
                                )}
                              </div>

                              {/* Client Info */}
                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  setSelectedClientId(rc.id);
                                  setActiveTab('mapa');
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <h3 className={`font-bold text-sm truncate ${rc.visited ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                    {rc.name}
                                  </h3>
                                  {rc.current_balance > 0 && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                                      Debe RD$ {rc.current_balance.toLocaleString('es-DO')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin size={11} className="shrink-0 text-slate-400" />
                                  {rc.address}
                                </p>
                              </div>

                              {/* Quick Actions */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Link
                                  href={`/sale?clientId=${rc.id}`}
                                  className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-colors"
                                  title="Vender a este cliente"
                                >
                                  <ShoppingCart size={16} />
                                </Link>
                                
                                {rc.lat && rc.lng && (
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${rc.lat},${rc.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors"
                                    title="Navegar en Google Maps"
                                  >
                                    <Navigation size={16} />
                                  </a>
                                )}
                              </div>
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
      )}

    </div>
  );
}
