"use client";

import { useEffect, useState } from "react";
import { 
  Box, 
  Plus, 
  Search, 
  Store, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Edit2, 
  X,
  Package,
  Wrench,
  HelpCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Asset, AssetStatus, Client } from "@/types/database";

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    asset_type: "Vitrina",
    status: "en_almacen" as AssetStatus,
    current_client_id: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  const fetchAssetsData = async () => {
    setLoading(true);
    try {
      const [{ data: assetsData }, { data: clientsData }] = await Promise.all([
        supabase.from("assets").select("*, clients(id, name)").order("created_at", { ascending: false }),
        supabase.from("clients").select("id, name").order("name"),
      ]);

      setAssets(assetsData || []);
      setClients((clientsData as Client[]) || []);
    } catch (err: any) {
      console.error("Error fetching assets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsData();
  }, []);

  const handleOpenCreate = () => {
    setEditingAsset(null);
    setFormData({
      name: "",
      asset_type: "Vitrina",
      status: "en_almacen",
      current_client_id: "",
      notes: "",
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asset: any) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name || "",
      asset_type: asset.asset_type || "Vitrina",
      status: asset.status || "en_almacen",
      current_client_id: asset.current_client_id || "",
      notes: asset.notes || "",
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: "error", text: "El nombre del activo es obligatorio." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: formData.name.trim(),
        asset_type: formData.asset_type,
        status: formData.status,
        current_client_id: formData.current_client_id || null,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingAsset) {
        const { error } = await supabase.from("assets").update(payload).eq("id", editingAsset.id);
        if (error) throw error;
        setMessage({ type: "success", text: "Activo actualizado correctamente." });
      } else {
        const { error } = await supabase.from("assets").insert([payload]);
        if (error) throw error;
        setMessage({ type: "success", text: "Activo registrado exitosamente." });
      }

      fetchAssetsData();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err: any) {
      console.error("Error saving asset:", err);
      setMessage({ type: "error", text: err.message || "Error al guardar el activo." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el activo "${name}"?`)) return;
    try {
      await supabase.from("assets").delete().eq("id", id);
      fetchAssetsData();
    } catch (err: any) {
      console.error("Error deleting asset:", err);
      alert("No se pudo eliminar el activo.");
    }
  };

  const filteredAssets = assets.filter((a) => {
    const term = searchTerm.toLowerCase();
    const name = (a.name || "").toLowerCase();
    const type = (a.asset_type || "").toLowerCase();
    const client = (a.clients?.name || "").toLowerCase();
    return name.includes(term) || type.includes(term) || client.includes(term);
  });

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case "en_almacen":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold">En Almacén</span>;
      case "prestado":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold">Prestado a Cliente</span>;
      case "en_reparacion":
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs font-bold">En Reparación</span>;
      case "perdido":
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-bold">Perdido / Dañado</span>;
      default:
        return <span className="bg-gray-500/10 text-gray-400 px-2.5 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <Box className="w-7 h-7" />
            </div>
            Gestión de Activos Prestados
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Control de vitrinas, termos, bandejas y equipos en poder de clientes
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm w-fit"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nuevo Activo
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#181824] p-4 rounded-2xl border border-white/10 shadow-xl flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar activo por nombre, tipo (ej. Vitrina, Termo) o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder-gray-500"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Assets Table */}
      <div className="bg-[#181824] rounded-2xl border border-white/10 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Inventario de Equipos ({filteredAssets.length})</h3>
          <span className="text-xs text-gray-400">Pastelitos Patria</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f2e] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-4 font-semibold">Activo / Equipo</th>
                <th className="p-4 font-semibold">Tipo</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold">Cliente Asignado</th>
                <th className="p-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Cargando activos...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500">
                    <p className="text-base font-semibold mb-1">No hay activos registrados.</p>
                    <p className="text-xs text-gray-400">Haz clic en &quot;Nuevo Activo&quot; para registrar vitrinas o termos.</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {asset.name}
                      {asset.notes && <p className="text-xs text-gray-400 font-normal mt-0.5">{asset.notes}</p>}
                    </td>
                    <td className="p-4 text-gray-300 text-xs">
                      {asset.asset_type}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(asset.status)}
                    </td>
                    <td className="p-4 text-sm font-medium text-white">
                      {asset.clients?.name ? (
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <Store className="w-4 h-4 text-amber-400" />
                          {asset.clients.name}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Almacén Central</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(asset)}
                          className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Editar activo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id, asset.name)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar activo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181824] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingAsset ? "Editar Activo" : "Registrar Nuevo Activo"}
                  </h2>
                  <p className="text-xs text-gray-400">Vitrinas, termos y equipos de distribución</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {message && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}>
                  {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre / Identificador del Activo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Vitrina Caliente #04"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tipo de Activo</label>
                  <select
                    value={formData.asset_type}
                    onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Vitrina">Vitrina Caliente</option>
                    <option value="Termo">Termo Conservador</option>
                    <option value="Bandeja">Bandeja de Exhibición</option>
                    <option value="Letrero">Letrero / Publicidad</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AssetStatus })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="en_almacen">En Almacén</option>
                    <option value="prestado">Prestado a Cliente</option>
                    <option value="en_reparacion">En Reparación</option>
                    <option value="perdido">Perdido / Dañado</option>
                  </select>
                </div>
              </div>

              {formData.status === "prestado" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Cliente / Colmado Asignado</label>
                  <select
                    value={formData.current_client_id}
                    onChange={(e) => setFormData({ ...formData, current_client_id: e.target.value })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Selecciona un cliente...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles del estado físico, serie o condiciones..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Activo"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
