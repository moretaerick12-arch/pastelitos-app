'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, MapPin, Package, DownloadCloud, RefreshCw, GripVertical, Navigation, Filter } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { db } from '@/lib/db';
import { SyncManager } from '@/lib/sync/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { Map, MapMarker } from '@/components/ui/map';

export default function RutaPage() {
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'mapa' | 'lista'>('mapa');
  const [showAllClients, setShowAllClients] = useState(true);
  const [osrmRoute, setOsrmRoute] = useState<[number, number][] | undefined>(undefined);
  const [routeMeta, setRouteMeta] = useState<{distance: number, duration: number} | null>(null);
  const supabase = createClient();
  
  // Use Dexie live queries
  const clients = useLiveQuery(() => db.local_clients.orderBy('visit_order').toArray()) || [];
  const inventory = useLiveQuery(() => db.local_inventory.toArray()) || [];
  const isOfflineEmpty = clients.length === 0;

  // Sync handler
  const handleSync = async () => {
    setSyncing(true);
    await SyncManager.sync();
    setSyncing(false);
  };

  useEffect(() => {
    const fetchRoute = async () => {
      const validClients = clients.filter(c => c.lat && c.lng).sort((a,b) => a.visit_order - b.visit_order);
      if (validClients.length < 2) return;
      
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

  // Download daily route to local DB
  const downloadRoute = async () => {
    setDownloading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch active daily route
      const { data: route } = await supabase
        .from('daily_routes')
        .select('id')
        .eq('repartidor_id', user.id)
        .eq('route_date', today)
        .single();
        
      if (!route) {
        alert('No tienes una ruta asignada para el día de hoy.');
        setDownloading(false);
        return;
      }
      
      // Fetch route clients
      const { data: clientsData } = await supabase
        .from('route_clients')
        .select(`
          client_id,
          visit_order,
          clients ( name, address, phone, current_balance, credit_limit, lat, lng )
        `)
        .eq('route_id', route.id)
        .order('visit_order', { ascending: true });
        
      // Fetch today's sales to mark visited (just in case they downloaded late)
      const { data: salesData } = await supabase
        .from('sales')
        .select('client_id')
        .eq('daily_route_id', route.id);
        
      const visitedClientIds = new Set(salesData?.map(s => s.client_id) || []);
        
      // Fetch inventory
      const { data: invData } = await supabase
        .from('daily_route_inventory')
        .select(`
          product_id,
          quantity_dispatched,
          products ( name, price_per_unit )
        `)
        .eq('daily_route_id', route.id);

      // Save route meta
      await db.meta.put({ key: 'current_route_id', value: route.id });
      await db.meta.put({ key: 'repartidor_id', value: user.id });

      // Populate clients
      if (clientsData) {
        await db.local_clients.clear();
        const clientsToInsert = clientsData.map(c => ({
          id: c.client_id,
          name: (c.clients as any).name,
          address: (c.clients as any).address,
          phone: (c.clients as any).phone,
          current_balance: (c.clients as any).current_balance,
          credit_limit: (c.clients as any).credit_limit,
          lat: (c.clients as any).lat,
          lng: (c.clients as any).lng,
          visit_order: c.visit_order,
          visited: visitedClientIds.has(c.client_id)
        }));
        await db.local_clients.bulkAdd(clientsToInsert);
      }
      
      // Populate inventory
      if (invData) {
        await db.local_inventory.clear();
        const invToInsert = invData.map(inv => ({
          product_id: inv.product_id,
          name: (inv.products as any).name,
          quantity_dispatched: inv.quantity_dispatched,
          price_per_unit: (inv.products as any).price_per_unit
        }));
        await db.local_inventory.bulkAdd(invToInsert);
      }
      
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

  const visitedCount = clients.filter(c => c.visited).length;
  const progressPercent = clients.length > 0 ? Math.round((visitedCount / clients.length) * 100) : 0;



  return (
    <div className="flex flex-col h-full bg-slate-50 -mx-4 -mt-4 px-4 pt-4 sm:mx-0 sm:mt-0 sm:px-0 sm:pt-0">
      
      {/* Top Header / Tabs */}
      <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <span className="text-sm font-medium text-slate-600">Ruta Activa</span>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Segmented Control */}
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('mapa')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'mapa' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Vista Mapa
          </button>
          <button 
            onClick={() => setActiveTab('lista')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'lista' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Vista Lista
          </button>
        </div>
      </div>

      {activeTab === 'mapa' && (
        <div className="flex-1 flex flex-col relative h-[calc(100vh-160px)] min-h-[500px]">
          {/* Filters Toggle Overlay */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowAllClients(!showAllClients)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shadow-md transition-colors ${showAllClients ? 'bg-white text-slate-700 hover:bg-slate-50' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            >
              <Filter size={14} />
              {showAllClients ? 'Todos' : 'Pendientes'}
            </button>
          </div>

          {/* Map */}
          {(() => {
            let mapMarkers: MapMarker[] = clients
              .filter(c => c.lat && c.lng)
              .map(c => ({
                id: c.id,
                lat: c.lat!,
                lng: c.lng!,
                title: c.name,
                subtitle: c.address || 'Sin dirección',
                number: c.visit_order,
                color: c.visited ? 'bg-slate-400' : 'bg-amber-500'
              }));
              
            if (!showAllClients) {
              mapMarkers = mapMarkers.filter(m => !clients.find(c => c.id === m.id)?.visited);
            }

            return (
              <div className="flex-1 w-full rounded-xl overflow-hidden shadow-sm border border-slate-100 relative">
                <Map 
                  markers={mapMarkers} 
                  className="h-full w-full" 
                  zoom={14}
                  osrmRoute={osrmRoute}
                />
                
                {/* Route Meta Floating Panel */}
                {routeMeta && (
                  <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-md border border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Ruta Estimada</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {(routeMeta.distance / 1000).toFixed(1)} km • {Math.round(routeMeta.duration / 60)} min
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'lista' && (
        <div className="flex-1 flex flex-col gap-6 pb-20">
          {/* Inventory Summary */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Package size={16} />
              Inventario Inicial
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {inventory.map(item => (
                <div key={item.product_id} className="bg-white min-w-[120px] rounded-xl p-3 shadow-sm border border-slate-100 snap-start flex-shrink-0 flex flex-col justify-between">
                  <span className="text-xs text-slate-500 font-medium truncate">{item.name}</span>
                  <span className="text-lg font-bold text-slate-800 mt-1">{item.quantity_dispatched} <span className="text-xs font-normal text-slate-400">uds</span></span>
                </div>
              ))}
              {inventory.length === 0 && (
                <div className="text-sm text-slate-400 italic">No hay inventario registrado</div>
              )}
            </div>
          </section>

          {/* Clients List */}
          <section>
            <div className="flex justify-between items-end mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Progreso de la Ruta</h2>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                {visitedCount}/{clients.length} visitados
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-5 overflow-hidden">
              <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>

            {isOfflineEmpty ? (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 mt-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  <DownloadCloud size={32} />
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">Sin datos locales</h2>
                <p className="text-slate-500 text-sm mb-6">Necesitas descargar tu ruta de hoy para comenzar a trabajar.</p>
                
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={downloadRoute}
                    disabled={downloading}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 w-full"
                  >
                    {downloading ? <RefreshCw className="animate-spin" size={20} /> : <DownloadCloud size={20} />}
                    {downloading ? 'Descargando...' : 'Descargar Ruta Asignada'}
                  </button>
                  
                  <Link href="/ruta/crear" className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors w-full">
                    <MapPin size={20} />
                    Crear Mi Propia Ruta
                  </Link>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>

              <Droppable droppableId="clients">
                {(provided) => (
                  <div 
                    className="flex flex-col gap-3"
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
                            className={`bg-white rounded-xl p-4 shadow-sm border transition-all flex items-start gap-3 ${rc.visited ? 'border-slate-100 opacity-60' : 'border-slate-200'} ${snapshot.isDragging ? 'shadow-md ring-2 ring-amber-500' : ''}`}
                          >
                            <div 
                              {...provided.dragHandleProps} 
                              className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical size={22} />
                            </div>
                            
                            <div className="flex-shrink-0 mt-0.5">
                              {rc.visited ? (
                                <CheckCircle2 size={22} className="text-green-500" />
                              ) : (
                                <div className="w-[22px] h-[22px] rounded-full border-2 border-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-600">
                                  {rc.visit_order}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold text-base truncate ${rc.visited ? 'text-slate-500' : 'text-slate-800'}`}>
                                {rc.name}
                              </h3>
                              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-1">
                                <MapPin size={12} />
                                {rc.address}
                              </p>
                            </div>

                            {rc.lat && rc.lng && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${rc.lat},${rc.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                                title="Navegar"
                              >
                                <Navigation size={18} />
                              </a>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {clients.length === 0 && (
                      <div className="text-center p-6 text-sm text-slate-500 bg-white rounded-xl border border-slate-100">
                        No hay clientes asignados a esta ruta.
                      </div>
                    )}
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
