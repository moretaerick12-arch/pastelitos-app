"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Package, Plus, ClipboardList } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface Product {
  id: string;
  name: string;
  description: string;
  price_per_unit: number;
  cost_per_unit: number;
  current_stock: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price_per_unit: 0,
    cost_per_unit: 0,
  });

  const [productionForm, setProductionForm] = useState({
    product_id: "",
    quantity_produced: 0,
  });

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prods } = await supabase.from("products").select("*").order("name");
      setProducts(prods || []);

      const { data: hist } = await supabase
        .from("production_batches")
        .select("id, batch_date, quantity_produced, products(name)")
        .order("batch_date", { ascending: false })
        .limit(10);
      setHistory(hist || []);
    } catch (err) {
      console.error("Error fetching inventory data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
  };

  const getStockColor = (stock: number) => {
    if (stock > 500) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (stock > 100) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-red-500 bg-red-500/10 border-red-500/20";
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("products").insert([{ ...productForm, current_stock: 0 }]);
      if (error) throw error;
      setIsProductModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Error al guardar producto");
    }
  };

  const handleProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("production_batches").insert([
        {
          product_id: productionForm.product_id,
          quantity_produced: productionForm.quantity_produced,
          batch_date: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      setIsProductionModalOpen(false);
      fetchData(); // Trigger in db should update current_stock
    } catch (err) {
      alert("Error al registrar producción");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Package className="text-amber-500" />
            Inventario
          </h1>
          <p className="text-gray-400 mt-1">Gestión de productos y producción</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsProductionModalOpen(true)}
            className="bg-[#232333] hover:bg-[#2c2c40] text-white px-4 py-2 rounded-lg font-medium transition-colors border border-white/10 flex items-center gap-2"
          >
            <ClipboardList className="w-5 h-5" />
            Registrar Producción
          </button>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1a1a24] h-40 rounded-xl border border-white/5 animate-skeleton"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-[#1a1a24] rounded-xl border border-white/5 p-6 shadow-xl flex flex-col justify-between group hover:border-white/10 transition-colors">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                  <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${getStockColor(product.current_stock)}`}>
                    Stock: {product.current_stock}
                  </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
              </div>
              <div className="mt-6 flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <p className="text-xs text-gray-500">Costo</p>
                  <p className="text-white font-medium">{formatCurrency(product.cost_per_unit)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Precio</p>
                  <p className="text-amber-500 font-bold">{formatCurrency(product.price_per_unit)}</p>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <div className="col-span-full text-center text-gray-400 p-8 bg-[#1a1a24] rounded-xl">No hay productos.</div>}
        </div>
      )}

      <div className="bg-[#1a1a24] rounded-xl border border-white/5 shadow-xl mt-8">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white">Historial de Producción (Últimos 10)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-gray-400">
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Producto</th>
                <th className="p-4 font-medium">Cantidad Producida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((batch) => (
                <tr key={batch.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-300">{new Date(batch.batch_date).toLocaleString()}</td>
                  <td className="p-4 text-white font-medium">{batch.products?.name}</td>
                  <td className="p-4 text-emerald-400 font-bold">+{batch.quantity_produced}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-gray-500">No hay registros de producción.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Nuevo Producto">
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nombre</label>
            <input required type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Descripción</label>
            <input type="text" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Costo Unitario</label>
              <input required type="number" step="0.01" value={productForm.cost_per_unit} onChange={(e) => setProductForm({ ...productForm, cost_per_unit: parseFloat(e.target.value) })} className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Precio Unitario</label>
              <input required type="number" step="0.01" value={productForm.price_per_unit} onChange={(e) => setProductForm({ ...productForm, price_per_unit: parseFloat(e.target.value) })} className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-gray-300 hover:bg-white/5 rounded-lg">Cancelar</button>
            <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isProductionModalOpen} onClose={() => setIsProductionModalOpen(false)} title="Registrar Producción">
        <form onSubmit={handleProductionSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Producto</label>
            <select required value={productionForm.product_id} onChange={(e) => setProductionForm({ ...productionForm, product_id: e.target.value })} className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500">
              <option value="">Seleccione un producto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Cantidad Producida</label>
            <input required type="number" min="1" value={productionForm.quantity_produced} onChange={(e) => setProductionForm({ ...productionForm, quantity_produced: parseInt(e.target.value) || 0 })} className="w-full bg-[#1a1a24] border border-white/10 rounded-lg p-2 text-white focus:border-amber-500" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsProductionModalOpen(false)} className="px-4 py-2 text-gray-300 hover:bg-white/5 rounded-lg">Cancelar</button>
            <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
