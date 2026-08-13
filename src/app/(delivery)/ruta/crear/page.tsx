'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SyncManager } from '@/lib/sync/syncManager';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Map, Plus, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CrearRutaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [routeName, setRouteName] = useState('');
  
  // Minimal new client creation for simplicity
  const [newClients, setNewClients] = useState<{name: string, address: string, lat?: number, lng?: number}[]>([{ name: '', address: '' }]);

  const handleAddClientRow = () => {
    setNewClients([...newClients, { name: '', address: '' }]);
  };

  const handleClientChange = (index: number, field: string, value: string | number) => {
    const updated = [...newClients];
    updated[index] = { ...updated[index], [field]: value };
    setNewClients(updated);
  };

  const handleGetGPS = (index: number) => {
    if (!navigator.geolocation) {
      alert("Geolocalización no soportada por el navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleClientChange(index, 'lat', position.coords.latitude);
        handleClientChange(index, 'lng', position.coords.longitude);
      },
      (error) => {
        alert("Error obteniendo ubicación: " + error.message);
      }
    );
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
        zone: 'Ruta Libre', // default
        is_seed: false,
        created_by: user.id,
      };

      const clientsToCreate = newClients.filter(c => c.name.trim() !== '');
      
      const generatedClients = clientsToCreate.map(c => ({
        id: uuidv4(),
        name: c.name,
        address: c.address || 'Sin dirección',
        lat: c.lat || null,
        lng: c.lng || null,
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
      
    } catch (err) {
      console.error(err);
      alert('Error creando ruta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-up p-2">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/ruta" className="text-slate-500 hover:text-slate-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Map className="text-amber-500" />
          Crear Ruta
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de la Ruta</label>
          <input 
            required 
            type="text" 
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500" 
            placeholder="Ej: Ruta Jueves" 
          />
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Agregar Clientes Nuevos</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            {newClients.map((client, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input 
                  type="text" 
                  value={client.name}
                  onChange={(e) => handleClientChange(idx, 'name', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500" 
                  placeholder={`Nombre Cliente ${idx + 1}`} 
                />
                <input 
                  type="text" 
                  value={client.address}
                  onChange={(e) => handleClientChange(idx, 'address', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500" 
                  placeholder={`Dirección (Opcional)`} 
                />
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handleGetGPS(idx)}
                    className="flex-1 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                    📍 Obtener GPS
                  </button>
                  {client.lat && client.lng && (
                    <span className="text-xs text-green-600 flex-1 text-center font-medium">✓ Capturado</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button 
            type="button" 
            onClick={handleAddClientRow}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Plus size={16} />
            Añadir otro cliente
          </button>
        </div>

        <button 
          type="submit" 
          disabled={loading || !routeName}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 px-6 rounded-2xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-4 shadow-sm shadow-amber-500/20"
        >
          <Save size={20} />
          {loading ? 'Guardando...' : 'Crear y Asignar Ruta'}
        </button>
      </form>
    </div>
  );
}
