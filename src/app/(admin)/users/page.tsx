"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  ShieldCheck, 
  Truck, 
  Phone, 
  DollarSign, 
  Edit2, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  Mail,
  UserPlus
} from "lucide-react";
import { userService, CreateUserData } from "@/lib/services/userService";
import { Profile, UserRole } from "@/types/database";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    role: "repartidor" as UserRole,
    salary: 0,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await userService.getUsers();
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone: "",
      role: "repartidor",
      salary: 0,
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: `${(user.first_name || "").toLowerCase()}@pastelitos.com`,
      password: "",
      phone: user.phone || "",
      role: user.role || "repartidor",
      salary: Number(user.salary || 0),
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setMessage({ type: "error", text: "El nombre y apellido son obligatorios." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (editingUser) {
        // Update existing profile
        const { error } = await userService.updateUser(editingUser.id, {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim() || null,
          role: formData.role,
          salary: Number(formData.salary || 0),
        });

        if (error) throw error;
        setMessage({ type: "success", text: "Usuario actualizado correctamente." });
      } else {
        // Create new user in Auth + Profile
        if (!formData.email.trim()) {
          setMessage({ type: "error", text: "El correo electrónico es obligatorio para crear un usuario." });
          setSaving(false);
          return;
        }

        const { error } = await userService.createUser({
          email: formData.email.trim(),
          password: formData.password || "Patria2026*",
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          salary: Number(formData.salary || 0),
        });

        if (error) throw error;
        setMessage({ type: "success", text: "Usuario creado exitosamente." });
      }

      fetchUsers();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error("Error saving user:", err);
      setMessage({ type: "error", text: err.message || "Error al guardar el usuario." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${name}?`)) return;
    try {
      await userService.deleteUser(id);
      fetchUsers();
    } catch (err: any) {
      console.error("Error deleting user:", err);
      alert("No se pudo eliminar el usuario.");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(val);
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const phone = (u.phone || "").toLowerCase();
    const role = (u.role || "").toLowerCase();
    return fullName.includes(term) || phone.includes(term) || role.includes(term);
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <Users className="w-7 h-7" />
            </div>
            Gestión de Usuarios y Empleados
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Administra los roles de acceso, choferes repartidores y sueldos fijos
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm w-fit"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          Nuevo Usuario
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#181824] p-4 rounded-2xl border border-white/10 shadow-xl flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar usuario por nombre, teléfono o rol (ej. Joelito, Nene, Repartidor)..."
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

      {/* Users Table / Grid */}
      <div className="bg-[#181824] rounded-2xl border border-white/10 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Equipo de Trabajo ({filteredUsers.length})</h3>
          <span className="text-xs text-gray-400">Pastelitos Patria</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f2e] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-4 font-semibold">Usuario / Nombre</th>
                <th className="p-4 font-semibold">Rol de Acceso</th>
                <th className="p-4 font-semibold">Teléfono</th>
                <th className="p-4 font-semibold text-right">Sueldo Asignado</th>
                <th className="p-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500">
                    <p className="text-base font-semibold mb-1">No se encontraron usuarios.</p>
                    <p className="text-xs text-gray-400">Haz clic en &quot;Nuevo Usuario&quot; para registrar uno nuevo.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.role === "admin";
                  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Sin Nombre";

                  return (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                            isAdmin 
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }`}>
                            {user.first_name ? user.first_name.charAt(0) : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-white">{fullName}</p>
                            <p className="text-xs text-gray-400">
                              {(user.first_name || "usuario").toLowerCase()}@pastelitos.com
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border ${
                          isAdmin
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                          {isAdmin ? "Administrador" : "Repartidor"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300 text-xs">
                        {user.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-gray-500">Sin teléfono</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-bold text-white">
                        {user.salary && Number(user.salary) > 0 ? (
                          <span className="text-emerald-400">{formatCurrency(Number(user.salary))}</span>
                        ) : (
                          <span className="text-gray-500 text-xs">No asignado</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, fullName)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181824] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {editingUser ? "Modifica el rol, teléfono o sueldo" : "Crea credenciales de acceso para el personal"}
                  </p>
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

              {/* Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Joelito"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Morales"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Rol de Acceso</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "repartidor" })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                      formData.role === "repartidor"
                        ? "bg-blue-500/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10"
                        : "bg-[#101018] border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    Repartidor (Rutas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "admin" })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                      formData.role === "admin"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                        : "bg-[#101018] border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Administrador (Total)
                  </button>
                </div>
              </div>

              {/* Email (only on create) */}
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico (Login)</label>
                  <input
                    type="email"
                    required
                    placeholder="ej. joelito@pastelitos.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Password (only on create) */}
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Contraseña Inicial</label>
                  <input
                    type="text"
                    placeholder="Patria2026* (o escribe una)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Phone & Salary */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="809-555-0100"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Sueldo Fijo Quincenal (RD$)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.salary || ""}
                    onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
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
                    "Guardar Usuario"
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
