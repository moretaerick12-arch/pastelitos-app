'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Circle, MapPin, Package, DownloadCloud, RefreshCw } from 'lucide-react';
import { db } from '@/lib/db';
import { SyncManager } from '@/lib/sync/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { Map, MapMarker } from '@/components/ui/map';

export default function RutaPage() {
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
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

  const visitedCount = clients.filter(c => c.visited).length;
  const progressPercent = clients.length > 0 ? Math.round((visitedCount / clients.length) * 100) : 0;

  if (isOfflineEmpty) {
    return (
      <div className="flex flex-col gap-4 animate-slide-up">
        {/* Default empty map */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-[250px] overflow-hidden relative">
          <Map markers={[]} className="w-full h-full rounded-xl z-0" zoom={13} />
          {/* Overlay to indicate it's empty */}
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-white/40 backdrop-blur-[1px]">
            <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">Ubicación Actual</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <MapPin size={32} />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Sin datos locales</h2>
          <p className="text-slate-500 text-sm mb-6">Necesitas descargar tu ruta de hoy para trabajar offline.</p>
        
        <div className="flex flex-col gap-3 mt-2 w-full">
          <button
            onClick={downloadRoute}
            disabled={downloading}
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 w-full"
          >
            {downloading ? <RefreshCw className="animate-spin" size={20} /> : <DownloadCloud size={20} />}
            {downloading ? 'Descargando...' : 'Descargar Ruta Asignada'}
          </button>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase">o</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
          
          <Link href="/ruta/crear" className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors w-full">
            <MapPin size={20} />
            Crear Mi Propia Ruta
          </Link>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
        <span className="text-sm font-medium text-slate-600">Trabajando Offline</span>
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      </div>

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

      {/* Map Section */}
      {(() => {
        const mapMarkers: MapMarker[] = clients
          .filter(c => c.lat && c.lng)
          .map(c => ({
            id: c.id,
            lat: c.lat!,
            lng: c.lng!,
            title: c.name,
            subtitle: c.address || 'Sin dirección'
          }));
        
        if (mapMarkers.length === 0) return null;

        return (
          <section className="mb-2">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MapPin size={16} />
              Mapa de Ruta
            </h2>
            <div className="h-[250px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-100">
              <Map markers={mapMarkers} className="h-full w-full" zoom={14} />
            </div>
          </section>
        );
      })()}

      {/* Clients List */}
      <section>
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Ruta de Hoy</h2>
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            {visitedCount}/{clients.length} visitados
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-5 overflow-hidden">
          <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="flex flex-col gap-3 pb-6">
          {clients.map((rc) => (
            <div 
              key={rc.id} 
              className={`bg-white rounded-xl p-4 shadow-sm border transition-all flex items-start gap-3 ${rc.visited ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}
            >
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
            </div>
          ))}
          
          {clients.length === 0 && (
            <div className="text-center p-6 text-sm text-slate-500 bg-white rounded-xl border border-slate-100">
              No hay clientes asignados a esta ruta.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
