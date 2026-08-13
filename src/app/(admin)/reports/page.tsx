"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, TrendingUp, DollarSign, PackageOpen, Crown } from "lucide-react";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    estimatedCost: 0,
    grossProfit: 0,
    topClients: [] as { id: string; name: string; totalSales: number }[]
  });

  const supabase = createClient();

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const { data: sales, error: salesError } = await supabase
          .from("sales")
          .select(`
            id,
            total_amount,
            created_at,
            client_id,
            clients ( id, name ),
            sale_details (
              quantity,
              product_id,
              products ( id, cost_per_unit, name )
            )
          `)
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString());

        if (salesError) throw salesError;

        let totalRevenue = 0;
        let estimatedCost = 0;
        const clientSalesMap = new Map<string, { name: string; total: number }>();

        (sales || []).forEach((sale: any) => {
          const amount = parseFloat(sale.total_amount || 0);
          totalRevenue += amount;

          // Process cost
          (sale.sale_details || []).forEach((detail: any) => {
            const qty = detail.quantity || 0;
            const costPerUnit = detail.products?.cost_per_unit || 0;
            estimatedCost += qty * costPerUnit;
          });

          // Process top clients
          if (sale.clients) {
            const clientId = sale.clients.id;
            const existing = clientSalesMap.get(clientId) || { name: sale.clients.name, total: 0 };
            existing.total += amount;
            clientSalesMap.set(clientId, existing);
          }
        });

        const grossProfit = totalRevenue - estimatedCost;
        
        const topClients = Array.from(clientSalesMap.entries())
          .map(([id, data]) => ({ id, name: data.name, totalSales: data.total }))
          .sort((a, b) => b.totalSales - a.totalSales)
          .slice(0, 5);

        setMetrics({
          totalRevenue,
          estimatedCost,
          grossProfit,
          topClients
        });
      } catch (err: any) {
        console.error("Error fetching reports:", err);
        setError("Ocurrió un error al cargar los reportes.");
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="h-8 w-48 bg-[#1a1a24] rounded animate-skeleton mb-2"></div>
          <div className="h-4 w-64 bg-[#1a1a24] rounded animate-skeleton"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-[#1a1a24] rounded-xl border border-white/5 animate-skeleton"></div>
          ))}
        </div>
        <div className="h-64 bg-[#1a1a24] rounded-xl border border-white/5 animate-skeleton mt-6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
          <BarChart3 className="w-8 h-8" />
        </div>
        <p className="text-xl text-white font-semibold">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);
  };

  const profitMargin = metrics.totalRevenue > 0 
    ? ((metrics.grossProfit / metrics.totalRevenue) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="text-amber-500" />
          Reportes y Métricas
        </h1>
        <p className="text-gray-400 mt-1">Análisis de rendimiento del mes actual</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-gray-400 font-medium mb-1">Ingresos Brutos</p>
              <h2 className="text-3xl font-bold text-white">{formatCurrency(metrics.totalRevenue)}</h2>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center border border-amber-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-gray-400 font-medium mb-1">Costo Estimado</p>
              <h2 className="text-3xl font-bold text-white">{formatCurrency(metrics.estimatedCost)}</h2>
            </div>
            <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center border border-red-500/20">
              <PackageOpen className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-gray-400 font-medium mb-1">Rentabilidad Bruta</p>
              <h2 className="text-3xl font-bold text-white">{formatCurrency(metrics.grossProfit)}</h2>
              <p className="text-sm text-emerald-500 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {profitMargin}% margen
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a24] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <Crown className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl font-bold text-white">Top Colmados (Mes Actual)</h3>
        </div>
        <div className="overflow-x-auto">
          {metrics.topClients.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No hay ventas registradas este mes.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#232333] border-b border-white/5 text-gray-400 text-sm">
                  <th className="p-4 font-medium">Posición</th>
                  <th className="p-4 font-medium">Cliente</th>
                  <th className="p-4 font-medium text-right">Ventas Totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {metrics.topClients.map((client, idx) => (
                  <tr key={client.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      {idx === 0 && <span className="bg-amber-500/20 text-amber-500 px-2 py-1 rounded text-xs font-bold mr-2 border border-amber-500/20">#1</span>}
                      {idx === 1 && <span className="bg-slate-300/20 text-slate-300 px-2 py-1 rounded text-xs font-bold mr-2 border border-slate-300/20">#2</span>}
                      {idx === 2 && <span className="bg-orange-700/20 text-orange-400 px-2 py-1 rounded text-xs font-bold mr-2 border border-orange-700/20">#3</span>}
                      {idx > 2 && <span className="text-gray-500 font-medium px-2 mr-2">#{idx + 1}</span>}
                    </td>
                    <td className="p-4 font-medium text-white">{client.name}</td>
                    <td className="p-4 text-right font-semibold text-emerald-400">{formatCurrency(client.totalSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
