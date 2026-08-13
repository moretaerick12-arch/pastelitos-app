"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Map,
  Activity,
  DollarSign,
  Package,
} from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    salesToday: 0,
    collectionsToday: 0,
    activeRoutes: 0,
    activeClients: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeRoutesList, setActiveRoutesList] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD local-ish

        // We can do raw fetches here. Note: date = today logic depends on timezone, but we'll approximate with gte
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch sales
        const { data: sales } = await supabase
          .from("sales")
          .select("total_amount")
          .eq("status", "activa")
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString());

        const totalSales = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

        // Fetch payments
        const { data: payments } = await supabase
          .from("payments")
          .select("amount")
          .eq("status", "activo")
          .gte("payment_date", todayStart.toISOString())
          .lte("payment_date", todayEnd.toISOString());

        const totalCollections = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        // Fetch active routes
        const { count: routesCount } = await supabase
          .from("daily_routes")
          .select("*", { count: "exact", head: true })
          .eq("route_date", today);

        // Fetch active clients
        const { count: clientsCount } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("status", "activo");

        setStats({
          salesToday: totalSales,
          collectionsToday: totalCollections,
          activeRoutes: routesCount || 0,
          activeClients: clientsCount || 0,
        });

        // Recent Activity: recent sales and payments
        const { data: recentSales } = await supabase
          .from("sales")
          .select("id, created_at, total_amount, status")
          .order("created_at", { ascending: false })
          .limit(5);

        const { data: recentPayments } = await supabase
          .from("payments")
          .select("id, created_at, amount, status")
          .order("created_at", { ascending: false })
          .limit(5);

        const combined = [
          ...(recentSales || []).map((s) => ({ ...s, type: "Venta", value: s.total_amount })),
          ...(recentPayments || []).map((p) => ({ ...p, type: "Cobro", value: p.amount })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .slice(0, 5);

        setRecentActivity(combined);

        // Active routes today
        const { data: dailyRoutes } = await supabase
          .from("daily_routes")
          .select("id, route_id, status, routes(name)")
          .eq("route_date", today);

        setActiveRoutesList(dailyRoutes || []);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#1a1a24] p-6 rounded-xl border border-white/5 h-32 animate-skeleton"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1a1a24] rounded-xl border border-white/5 h-96 animate-skeleton"></div>
          <div className="bg-[#1a1a24] rounded-xl border border-white/5 h-96 animate-skeleton"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-amber-500/80 mt-1">Resumen general del día</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ventas de Hoy"
          value={formatCurrency(stats.salesToday)}
          icon={<TrendingUp className="text-amber-500" />}
          trend="+12% vs ayer"
        />
        <MetricCard
          title="Cobros de Hoy"
          value={formatCurrency(stats.collectionsToday)}
          icon={<DollarSign className="text-emerald-500" />}
          trend="+5% vs ayer"
        />
        <MetricCard
          title="Rutas Activas"
          value={stats.activeRoutes.toString()}
          icon={<Map className="text-blue-500" />}
        />
        <MetricCard
          title="Clientes Activos"
          value={stats.activeClients.toString()}
          icon={<Users className="text-purple-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1a1a24] rounded-xl border border-white/5 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              Actividad Reciente
            </h2>
          </div>
          <div className="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No hay actividad hoy</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white/5 text-gray-400">
                    <th className="p-4 font-medium">Tipo</th>
                    <th className="p-4 font-medium">Monto</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentActivity.map((act) => (
                    <tr key={act.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-medium">{act.type}</td>
                      <td className="p-4 text-white">{formatCurrency(act.value)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${act.status.includes('activ') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {act.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-[#1a1a24] rounded-xl border border-white/5 shadow-xl">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Map className="w-5 h-5 text-amber-500" />
              Rutas de Hoy
            </h2>
          </div>
          <div className="p-4">
            {activeRoutesList.length === 0 ? (
              <div className="text-center p-4 text-gray-400">No hay rutas activas hoy</div>
            ) : (
              <div className="space-y-3">
                {activeRoutesList.map((route) => (
                  <div key={route.id} className="flex items-center justify-between bg-[#232333] p-4 rounded-lg border border-white/5">
                    <span className="text-white font-medium">
                      {route.routes?.name || "Ruta desconocida"}
                    </span>
                    <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full">
                      {route.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend?: string }) {
  return (
    <div className="bg-[#1a1a24] p-6 rounded-xl border border-white/5 shadow-xl flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-300">
        {icon}
      </div>
      <div className="flex justify-between items-start">
        <h3 className="text-gray-400 font-medium text-sm">{title}</h3>
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        {trend && <div className="text-sm text-emerald-400 mt-2">{trend}</div>}
      </div>
    </div>
  );
}
