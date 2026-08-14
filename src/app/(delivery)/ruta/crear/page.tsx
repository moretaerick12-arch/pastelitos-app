'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SyncManager } from '@/lib/sync/syncManager';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Map, Plus, Save, ArrowLeft, Trash2, MapPin, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { LocationPicker } from '@/components/ui/location-picker';

interface NewClientItem {
  id: string;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  expandedMap?: boolean;
}

export default function CrearRutaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [routeName, setRouteName] = useState('');
  
  const [newClients, setNewClients] = useState<NewClientItem[]>([
    { id: uuidv4(), name: '', address: '', lat: null, lng: null, expandedMap: true }
  ]);

  const handleAddClientRow = () => {
    setNewClients(prev => [
      ...prev, 
      { id: uuidv4(), name: '', address: '', lat: null, lng: null, expandedMap: false }
    ]);
  };

  const handleRemoveClientRow = (index: number) => {
    if (newClients.length <= 1) return;
    setNewClients(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleClientChange = (index: number, field: keyof NewClientItem, value: any) => {
    setNewClients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleExpandMap = (index: number) => {
    setNewClients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], expandedMap: !updated[index].expandedMap };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      const routeId = uuidv4();
      const today = new Date().toISOString().split('T')[0];
      
      const route = {
        id: routeId,
        name: routeName,
        zone: 'Ruta Libre',
        is_seed: false,
        created_by: user.id,
      };

      const clientsToCreate = newClients.filter(c => c.name.trim() !== '');
      if (clientsToCreate.length === 0) {
        alert('Debes agregar al menos un cliente con nombre.');
        setLoading(false);
        return;
      }
      
      const generatedClients = clientsToCreate.map(c => ({
        id: c.id,
        name: c.name,
        address: c.address || 'Sin dirección',
        lat: c.lat ? Number(c.lat) : null,
        lng: c.lng ? Number(c.lng) : null,
        credit_limit: 0,
        current_balance: 0,
        status: 'activo'
      }));

      const route_clients = generatedClients.map((c, idx) => ({
        id: uuidv4(),
        route_id: routeId,
        client_id: c.id,
        visit_order: idx + 1,
      }));

      const daily_route = {
        id: uuidv4(),
        route_id: routeId,
        repartidor_id: user.id,
        route_date: today,
        status: 'en_curso',
      };

      const payload = {
        route,
        new_clients: generatedClients,
        route_clients,
        daily_route
      };

      await SyncManager.enqueueRouteCreation(payload);
      
      // Go back to the route map
      router.push('/ruta');
      
    } catch (err: any) {
      console.error(err);
      alert('Error creando ruta: ' + (err.message || 'Inténtalo de nuevo'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-slide-up pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ruta" className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Map className="text-amber-500" size={22} />
            Crear Nueva Ruta
          </h1>
          <p className="text-xs text-slate-500">Agrega paradas buscando o marcando en el mapa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Route Name */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Nombre de la Ruta
          </label>
          <input 
            required 
            type="text" 
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500" 
            placeholder="Ej: Ruta Bella Vista & Piantini" 
          />
        </div>

        {/* Clients Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Paradas / Clientes ({newClients.length})
            </h2>
          </div>
          
          <div className="flex flex-col gap-4">
            {newClients.map((client, idx) => (
              <div 
                key={client.id} 
                className="flex flex-col gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-sm"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center shadow-sm">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {client.name ? client.name : `Parada ${idx + 1}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleExpandMap(idx)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/70 transition-colors flex items-center gap-1 text-xs font-semibold"
                    >
                      <MapPin size={14} className={client.lat ? 'text-emerald-600' : 'text-slate-400'} />
                      <span>{client.expandedMap ? 'Ocultar mapa' : 'Ubicación'}</span>
                      {client.expandedMap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {newClients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveClientRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar parada"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Name & Address Inputs */}
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    required
                    value={client.name}
                    onChange={(e) => handleClientChange(idx, 'name', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500" 
                    placeholder="Nombre del Colmado o Puesto *" 
                  />
                  
                  <input 
                    type="text" 
                    value={client.address}
                    onChange={(e) => handleClientChange(idx, 'address', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500" 
                    placeholder="Dirección o referencia (Opcional)" 
                  />
                </div>

                {/* Interactive Location Picker: Search, GPS, or Click on Map */}
                {client.expandedMap && (
                  <div className="pt-2 border-t border-slate-200">
                    <LocationPicker
                      lat={client.lat}
                      lng={client.lng}
                      address={client.address}
                      title={client.name || `Parada #${idx + 1}`}
                      onChange={(lat, lng, address) => {
                        handleClientChange(idx, 'lat', lat);
                        handleClientChange(idx, 'lng', lng);
                        if (address && !client.address) {
                          handleClientChange(idx, 'address', address);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Stop Button */}
          <button 
            type="button" 
            onClick={handleAddClientRow}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 active:scale-[0.99] transition-all"
          >
            <Plus size={16} />
            Agregar Otra Parada
          </button>
        </div>

        {/* Submit Route */}
        <button 
          type="submit" 
          disabled={loading || !routeName}
          className="bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold py-4 px-6 rounded-2xl flex justify-center items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20 text-sm"
        >
          <Save size={18} />
          {loading ? 'Guardando...' : 'Guardar y Comenzar Ruta'}
        </button>
      </form>
    </div>
  );
}
