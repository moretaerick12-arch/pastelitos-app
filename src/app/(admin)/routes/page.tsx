"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Map as MapIcon, Plus, Users, ChevronRight, CheckCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Map } from "@/components/ui/map";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    zone: "",
    is_seed: false,
  });

  const supabase = createClient();

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("routes")
        .select(`
          id, name, zone, is_seed, created_by,
          route_clients (count),
          profiles (first_name, last_name)
        `)
        .order("name");
        
      if (error) throw error;
      setRoutes(data || []);
    } catch (err) {
      console.error("Error fetching routes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleRouteClick = async (routeId: string) => {
    try {
      const { data: routeData } = await supabase
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .single();
        
      const { data: clientsData } = await supabase
        .from("route_clients")
        .select("id, visit_order, clients(id, name, address, lat, lng)")
        .eq("route_id", routeId)
        .order("visit_order");

      if (routeData) {
        setSelectedRoute({
          ...routeData,
          clients: clientsData || [],
        });
      }
    } catch (err) {
      console.error("Error loading route details", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("routes").insert([formData]);
      if (error) throw error;
      setIsModalOpen(false);
      setFormData({ name: "", zone: "", is_seed: false });
      fetchRoutes();
    } catch (err) {
      alert("Error al guardar la ruta");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <MapIcon className="text-amber-500" />
              Rutas
            </h1>
            <p className="text-gray-400 mt-1">Gestión de rutas y clientes asignados</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nueva Ruta
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#1a1a24] rounded-xl border border-white/5 animate-skeleton"></div>)}
          </div>
        ) : (
          <div className="grid gap-4">
            {routes.map((route) => (
              <div 
                key={route.id} 
                onClick={() => handleRouteClick(route.id)}
                className={`bg-[#1a1a24] rounded-xl border p-6 cursor-pointer transition-all hover:scale-[1.01] ${selectedRoute?.id === route.id ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/5 hover:border-white/10'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {route.name}
                      {route.is_seed && (
                        <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Ruta Semilla
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">Zona: {route.zone}</p>
                    {route.created_by && route.profiles && (
                      <p className="text-amber-500/80 text-xs mt-1">
                        Creada por: {route.profiles.first_name} {route.profiles.last_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-[#232333] px-3 py-1.5 rounded-lg border border-white/5">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span className="text-white font-medium">{route.route_clients?.[0]?.count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
            {routes.length === 0 && <div className="text-center p-8 text-gray-500 bg-[#1a1a24] rounded-xl">No hay rutas creadas.</div>}
          </div>
        )}
      </div>

      {selectedRoute && (
        <div className="w-full lg:w-[400px] shrink-0 bg-[#1a1a24] rounded-xl border border-white/5 shadow-xl h-fit overflow-hidden sticky top-6">
          <div className="p-6 border-b border-white/5 bg-[#1f1f2e]">
            <h2 className="text-xl font-bold text-white">{selectedRoute.name}</h2>
            <p className="text-amber-500 text-sm">Secuencia de visitas</p>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {selectedRoute.clients?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Esta ruta no tiene clientes asignados.</p>
            ) : (
              <div className="space-y-3">
                {selectedRoute.clients.map((rc: any, idx: number) => (
                  <div key={rc.id} className="flex items-center gap-3 bg-[#232333] p-3 rounded-lg border border-white/5">
                    <div className="w-6 h-6 shrink-0 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center font-bold text-xs border border-amber-500/20">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{rc.clients?.name}</p>
                      <p className="text-gray-500 text-xs truncate">{rc.clients?.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg border border-white/10 transition-colors text-sm font-medium">
              + Gestionar Clientes
            </button>
            {selectedRoute.clients?.some((rc: any) => rc.clients?.lat && rc.clients?.lng) ? (
              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Mapa de Ruta</h3>
                <Map 
                  markers={selectedRoute.clients
                    .filter((rc: any) => rc.clients?.lat && rc.clients?.lng)
                    .map((rc: any, idx: number) => ({
                      id: rc.clients.id,
                      lat: rc.clients.lat,
                      lng: rc.clients.lng,
                      title: `${idx + 1}. ${rc.clients.name}`,
                      subtitle: rc.clients.address
                    }))}
                  className="w-full h-[300px] rounded-xl z-0"
                />
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Mapa de Ruta</h3>
                <div className="w-full h-[150px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
                  Mapa no disponible (Colmados sin coordenadas)
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Ruta">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nombre de la Ruta</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500" placeholder="Ej: Ruta Norte 1" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Zona</label>
            <input required type="text" value={formData.zone} onChange={(e) => setFormData({ ...formData, zone: e.target.value })} className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500" placeholder="Ej: Distrito Nacional" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="is_seed" checked={formData.is_seed} onChange={(e) => setFormData({ ...formData, is_seed: e.target.checked })} className="w-4 h-4 rounded bg-[#1a1a24] border-white/10 text-amber-500 focus:ring-amber-500 focus:ring-offset-[#1a1a24]" />
            <label htmlFor="is_seed" className="text-sm text-white">¿Es ruta semilla?</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-300 hover:bg-white/5 rounded-lg">Cancelar</button>
            <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
