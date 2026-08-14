"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Search, Plus, Edit2, AlertTriangle, MapPin } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Map } from "@/components/ui/map";
import { LocationPicker } from "@/components/ui/location-picker";

interface Client {
  id: string;
  name: string;
  contact_person: string;
  address: string;
  phone: string;
  lat?: number;
  lng?: number;
  credit_limit: number;
  current_balance: number;
  status: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    address: "",
    phone: "",
    lat: "" as number | string,
    lng: "" as number | string,
    credit_limit: 0,
    status: "activo",
  });

  const supabase = createClient();

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || "",
        contact_person: client.contact_person || "",
        address: client.address || "",
        phone: client.phone || "",
        lat: client.lat || "",
        lng: client.lng || "",
        credit_limit: client.credit_limit || 0,
        status: client.status || "activo",
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: "",
        contact_person: "",
        address: "",
        phone: "",
        lat: "",
        lng: "",
        credit_limit: 0,
        status: "activo",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        lat: formData.lat === "" ? null : Number(formData.lat),
        lng: formData.lng === "" ? null : Number(formData.lng)
      };

      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clients")
          .insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      console.error("Error saving client:", err);
      alert("Error al guardar el cliente.");
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="text-amber-500" />
            Clientes
          </h1>
          <p className="text-gray-400 mt-1">Gestión de colmados y clientes</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Colmado
        </button>
      </div>

      <div className="bg-[#1a1a24] rounded-xl border border-white/5 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#232333] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded-lg animate-skeleton"></div>
              ))}
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-white/5 text-gray-400">
                  <th className="p-4 font-medium">Nombre</th>
                  <th className="p-4 font-medium">Contacto</th>
                  <th className="p-4 font-medium">Teléfono</th>
                  <th className="p-4 font-medium">Balance</th>
                  <th className="p-4 font-medium">Límite</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const isNearLimit =
                      client.credit_limit > 0 &&
                      client.current_balance >= client.credit_limit * 0.8;

                    return (
                      <tr key={client.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-white font-medium">{client.name}</td>
                        <td className="p-4 text-gray-300">{client.contact_person}</td>
                        <td className="p-4 text-gray-300">{client.phone}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white">{formatCurrency(client.current_balance)}</span>
                            {isNearLimit && (
                              <span title="Cerca del límite de crédito"><AlertTriangle className="w-4 h-4 text-amber-500" /></span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-gray-400">{formatCurrency(client.credit_limit)}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              client.status === "activo"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {client.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenModal(client)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingClient ? "Editar Colmado" : "Nuevo Colmado"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Persona de Contacto</label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              Ubicación GPS y Dirección en Mapa
            </label>
            <LocationPicker
              lat={formData.lat !== "" && !isNaN(Number(formData.lat)) ? Number(formData.lat) : null}
              lng={formData.lng !== "" && !isNaN(Number(formData.lng)) ? Number(formData.lng) : null}
              address={formData.address}
              title={formData.name || 'Cliente'}
              onChange={(lat, lng, address) => {
                setFormData(prev => ({
                  ...prev,
                  lat: lat !== null ? lat : "",
                  lng: lng !== null ? lng : "",
                  address: address && !prev.address ? address : prev.address
                }));
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Límite de Crédito</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
