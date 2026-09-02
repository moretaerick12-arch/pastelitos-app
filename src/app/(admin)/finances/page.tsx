"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  DollarSign, 
  AlertCircle, 
  Plus, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Receipt, 
  Wallet, 
  FileSpreadsheet, 
  Trash2, 
  Ban, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart,
  RefreshCw,
  TableProperties
} from "lucide-react";
import { financeService, FortnightlyReportData } from "@/lib/services/financeService";
import { ExpenseDialog } from "@/components/accounting/expense-dialog";
import { createClient } from "@/lib/supabase/client";

type PeriodPreset = "q1" | "q2" | "month" | "custom";

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState<"summary" | "matrix" | "expenses" | "receivables" | "transactions">("summary");
  // Default to Agosto 2026 where the full 2 quincenas with RD$ 82,548 net profit are registered in Excel
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date(2026, 7, 1)); // 7 = August (0-indexed)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("q1");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<FortnightlyReportData | null>(null);
  const [receivables, setReceivables] = useState<any[]>([]);

  const supabase = createClient();

  // Determine current active date range
  const dateRange = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    if (periodPreset === "q1") {
      const start = new Date(year, month, 1, 0, 0, 0);
      const end = new Date(year, month, 15, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString(), label: `1ra Quincena (1 - 15)` };
    } else if (periodPreset === "q2") {
      const start = new Date(year, month, 16, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString(), label: `2da Quincena (16 - Fin)` };
    } else if (periodPreset === "month") {
      const start = new Date(year, month, 1, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString(), label: `Mes Completo` };
    } else {
      const start = customStartDate ? new Date(customStartDate + "T00:00:00").toISOString() : new Date(year, month, 1).toISOString();
      const end = customEndDate ? new Date(customEndDate + "T23:59:59").toISOString() : new Date(year, month + 1, 0).toISOString();
      return { start, end, label: `Personalizado` };
    }
  }, [selectedMonth, periodPreset, customStartDate, customEndDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [report, rec] = await Promise.all([
        financeService.getFortnightlyReport(dateRange.start, dateRange.end),
        financeService.getAccountsReceivable(),
      ]);

      setReportData(report);
      setReceivables(rec.data || []);
    } catch (err) {
      console.error("Error loading financial data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 2 }).format(amount);
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const setSpecificMonth = (monthIdx: number) => {
    setSelectedMonth(new Date(2026, monthIdx, 1));
  };

  const monthName = selectedMonth.toLocaleDateString("es-DO", { month: "long", year: "numeric" });
  const currentMonthIdx = selectedMonth.getMonth();

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este registro de gasto?")) return;
    try {
      await financeService.deleteExpense(id);
      loadData();
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Error al eliminar el gasto.");
    }
  };

  const handleVoidTransaction = async (id: string, table: string) => {
    if (!confirm("¿Está seguro que desea anular esta transacción? Esta acción es irreversible.")) return;
    try {
      const { error } = await supabase
        .from(table)
        .update({ status: "anulada", voided_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      alert("Transacción anulada correctamente.");
      loadData();
    } catch (err) {
      console.error("Error voiding transaction:", err);
      alert("Hubo un error al anular la transacción.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <DollarSign className="w-7 h-7" />
            </div>
            Finanzas y Contabilidad
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Control quincenal de ventas, matriz de choferes, gastos y beneficio neto
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
          
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* Date & Period Selection Bar */}
      <div className="bg-[#181824] p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Month Selector & Quick Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#101018] px-2.5 py-1.5 rounded-xl border border-white/5">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-white capitalize min-w-[130px] text-center text-xs">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Month Chips from Excel */}
          <button
            onClick={() => setSpecificMonth(6)} // July
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              currentMonthIdx === 6
                ? "bg-amber-500 text-black border-amber-400 font-bold"
                : "bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10"
            }`}
          >
            Julio 2026 (Hoja 1)
          </button>
          <button
            onClick={() => setSpecificMonth(7)} // August
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              currentMonthIdx === 7
                ? "bg-amber-500 text-black border-amber-400 font-bold"
                : "bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10"
            }`}
          >
            Agosto 2026 (Hoja 2)
          </button>
          <button
            onClick={() => setSpecificMonth(8)} // September
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              currentMonthIdx === 8
                ? "bg-amber-500 text-black border-amber-400 font-bold"
                : "bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10"
            }`}
          >
            Septiembre 2026 (Hoja 3)
          </button>
        </div>

        {/* Period Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPeriodPreset("q1")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              periodPreset === "q1"
                ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"
            }`}
          >
            1ra Quincena (1 - 15)
          </button>
          <button
            onClick={() => setPeriodPreset("q2")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              periodPreset === "q2"
                ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"
            }`}
          >
            2da Quincena (16 - Fin)
          </button>
          <button
            onClick={() => setPeriodPreset("month")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              periodPreset === "month"
                ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"
            }`}
          >
            Mes Completo
          </button>
          <button
            onClick={() => setPeriodPreset("custom")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              periodPreset === "custom"
                ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"
            }`}
          >
            Personalizado
          </button>
        </div>

        {/* Custom date range inputs */}
        {periodPreset === "custom" && (
          <div className="flex items-center gap-2 bg-[#101018] p-1.5 rounded-xl border border-white/10 text-xs">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-transparent text-white px-2 py-1 rounded focus:outline-none"
            />
            <span className="text-gray-500">hasta</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-transparent text-white px-2 py-1 rounded focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-[#181824] rounded-2xl border border-white/10 p-5 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 transition-transform group-hover:scale-125"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ventas del Período</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(reportData?.totalSales || 0)}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <span className="text-emerald-400 font-medium">
              {formatCurrency(reportData?.totalCashSales || 0)} contado
            </span>
            <span>•</span>
            <span className="text-amber-400 font-medium">
              {formatCurrency(reportData?.totalCreditSales || 0)} crédito
            </span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-[#181824] rounded-2xl border border-white/10 p-5 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/10 rounded-full blur-2xl -mr-6 -mt-6 transition-transform group-hover:scale-125"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gastos Operativos</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(reportData?.totalExpenses || 0)}
          </h2>
          <p className="mt-2 text-xs text-gray-400">
            {reportData?.expenses.length || 0} gastos registrados
          </p>
        </div>

        {/* Net Profit (Ganancia Limpia) */}
        <div className={`rounded-2xl border p-5 relative overflow-hidden group shadow-lg ${
          (reportData?.netProfit || 0) >= 0 
            ? "bg-gradient-to-br from-[#181824] to-[#12281e] border-emerald-500/30" 
            : "bg-gradient-to-br from-[#181824] to-[#281212] border-red-500/30"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Ganancia Neta (Limpia)</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              (reportData?.netProfit || 0) >= 0 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
              {(reportData?.netProfit || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <h2 className={`text-2xl font-black tracking-tight ${
            (reportData?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"
          }`}>
            {formatCurrency(reportData?.netProfit || 0)}
          </h2>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-bold ${
              (reportData?.netProfit || 0) >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
            }`}>
              {(reportData?.profitMargin || 0).toFixed(1)}% margen
            </span>
            <span className="text-gray-400 text-[11px]">Ventas - Gastos</span>
          </div>
        </div>

        {/* Total Receivables (Fiao en Calle) */}
        <div className="bg-[#181824] rounded-2xl border border-white/10 p-5 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6 transition-transform group-hover:scale-125"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fiao en la Calle</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-amber-400 tracking-tight">
            {formatCurrency(reportData?.totalReceivables || 0)}
          </h2>
          <p className="mt-2 text-xs text-gray-400">
            {receivables.length} clientes con balance pendiente
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "summary"
              ? "border-amber-500 text-amber-400 bg-white/5 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Resumen Quincenal & Choferes
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "matrix"
              ? "border-amber-500 text-amber-400 bg-white/5 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <TableProperties className="w-4 h-4" />
          Matriz Diaria Excel (Día por Día)
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "expenses"
              ? "border-amber-500 text-amber-400 bg-white/5 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Gastos Operativos ({reportData?.expenses.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("receivables")}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "receivables"
              ? "border-amber-500 text-amber-400 bg-white/5 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Cuentas por Cobrar / Fiao
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "transactions"
              ? "border-amber-500 text-amber-400 bg-white/5 rounded-t-xl"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Historial y Auditoría
        </button>
      </div>

      {/* TAB 1: RESUMEN QUINCENAL & CHOFERES */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* WhatsApp / Excel Math Banner */}
          <div className="bg-gradient-to-r from-[#1f1f2e] via-[#181824] to-[#1f1f2e] border border-amber-500/20 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Cálculo de la Quincena</span>
              <h3 className="text-lg font-bold text-white">Fórmula de Libreta y Excel</h3>
              <p className="text-xs text-gray-400">Total Ventas Choferes menos Gastos Operativos = Ganancia Neta</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-center">
              <div className="bg-[#101018] px-4 py-2.5 rounded-xl border border-white/5">
                <p className="text-[11px] text-gray-400">Total Vendido</p>
                <p className="text-base font-bold text-emerald-400">{formatCurrency(reportData?.totalSales || 0)}</p>
              </div>
              <span className="text-xl font-bold text-gray-500">−</span>
              <div className="bg-[#101018] px-4 py-2.5 rounded-xl border border-white/5">
                <p className="text-[11px] text-gray-400">Total Gastos</p>
                <p className="text-base font-bold text-red-400">{formatCurrency(reportData?.totalExpenses || 0)}</p>
              </div>
              <span className="text-xl font-bold text-gray-500">=</span>
              <div className="bg-amber-500/10 px-5 py-2.5 rounded-xl border border-amber-500/30">
                <p className="text-[11px] text-amber-300 font-semibold">Ganancias Netas</p>
                <p className="text-lg font-black text-amber-400">{formatCurrency(reportData?.netProfit || 0)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales by Driver Table */}
            <div className="lg:col-span-2 bg-[#181824] rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-white text-base">Ventas por Repartidor ({dateRange.label})</h3>
                </div>
                <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  {reportData?.driverSummaries.length || 0} choferes activos
                </span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1f1f2e] text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="p-4 font-semibold">Repartidor</th>
                      <th className="p-4 font-semibold text-right">Contado</th>
                      <th className="p-4 font-semibold text-right">Crédito</th>
                      <th className="p-4 font-semibold text-right">Total Vendido</th>
                      <th className="p-4 font-semibold text-right">Fiao Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">Cargando datos de choferes...</td>
                      </tr>
                    ) : reportData?.driverSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">No hay ventas de repartidores en este período.</td>
                      </tr>
                    ) : (
                      reportData?.driverSummaries.map((driver) => (
                        <tr key={driver.driverId} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                                {driver.driverName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{driver.driverName}</p>
                                <p className="text-xs text-gray-400">{driver.salesCount} entregas realizadas</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right text-gray-300 font-medium">
                            {formatCurrency(driver.cashSales)}
                          </td>
                          <td className="p-4 text-right text-amber-400/90 font-medium">
                            {formatCurrency(driver.creditSales)}
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-bold text-white text-base">
                              {formatCurrency(driver.totalSales)}
                            </span>
                            <div className="w-24 ml-auto bg-white/10 rounded-full h-1.5 mt-1.5 overflow-hidden">
                              <div 
                                className="bg-amber-500 h-full rounded-full" 
                                style={{ width: `${Math.min(100, driver.percentage)}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-4 text-right font-bold text-amber-500">
                            {formatCurrency(driver.totalFiao)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Expenses Breakdown */}
            <div className="bg-[#181824] rounded-2xl border border-white/10 shadow-xl p-5 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-white text-base">Gastos por Categoría</h3>
                </div>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                >
                  + Añadir
                </button>
              </div>

              <div className="space-y-4 py-4 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar">
                {reportData?.expenseGroups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No hay gastos en esta quincena.
                  </div>
                ) : (
                  reportData?.expenseGroups.map((group, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-200">{group.category}</span>
                        <span className="font-bold text-white">{formatCurrency(group.total)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-red-500/80 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, group.percentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>{group.count} transacciones</span>
                        <span>{group.percentage.toFixed(1)}% del total</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium">Total Gastos:</span>
                <span className="text-red-400 font-black text-base">
                  {formatCurrency(reportData?.totalExpenses || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIZ DIARIA ESTILO EXCEL */}
      {activeTab === "matrix" && (
        <div className="bg-[#181824] rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <TableProperties className="w-5 h-5 text-amber-400" />
                Matriz Diaria de Ventas y Gastos ({dateRange.label})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Estructura idéntica a tu hoja de Excel: desglose por chofer, total diario y neto
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#1f1f2e] text-gray-400 uppercase border-b border-white/10">
                <tr>
                  <th className="p-3 font-bold border-r border-white/5">Fecha</th>
                  {(reportData?.activeDriverNames || ['Joelito', 'Nene', 'Meloso', 'Laly']).map((driverName) => (
                    <th key={driverName} className="p-3 font-bold text-right border-r border-white/5">
                      {driverName}
                    </th>
                  ))}
                  <th className="p-3 font-bold text-right bg-emerald-500/10 text-emerald-400 border-r border-white/5">
                    Total del Día
                  </th>
                  <th className="p-3 font-bold text-right bg-red-500/10 text-red-400 border-r border-white/5">
                    Gastos del Día
                  </th>
                  <th className="p-3 font-bold text-right bg-amber-500/10 text-amber-400">
                    Neto del Día
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportData?.dailyMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500">
                      No hay registros para este período.
                    </td>
                  </tr>
                ) : (
                  reportData?.dailyMatrix.map((row) => (
                    <tr key={row.dateKey} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-semibold text-gray-300 border-r border-white/5 whitespace-nowrap">
                        {row.dayLabel}
                      </td>
                      {(reportData?.activeDriverNames || ['Joelito', 'Nene', 'Meloso', 'Laly']).map((driverName) => {
                        const val = row.driverSales[driverName] || 0;
                        return (
                          <td key={driverName} className="p-3 text-right border-r border-white/5 font-medium text-white">
                            {val > 0 ? formatCurrency(val) : <span className="text-gray-600">-</span>}
                          </td>
                        );
                      })}
                      <td className="p-3 text-right font-bold text-emerald-400 border-r border-white/5 bg-emerald-500/5">
                        {row.totalDaySales > 0 ? formatCurrency(row.totalDaySales) : <span className="text-gray-600">-</span>}
                      </td>
                      <td className="p-3 text-right font-bold text-red-400 border-r border-white/5 bg-red-500/5">
                        {row.dayExpenses > 0 ? formatCurrency(row.dayExpenses) : <span className="text-gray-600">-</span>}
                      </td>
                      <td className={`p-3 text-right font-black bg-amber-500/5 ${row.dayNet >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                        {formatCurrency(row.dayNet)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Table Footer Totals */}
              <tfoot className="bg-[#1f1f2e] font-bold border-t-2 border-white/10 text-xs">
                <tr>
                  <td className="p-3 text-white border-r border-white/5">TOTALES</td>
                  {(reportData?.activeDriverNames || ['Joelito', 'Nene', 'Meloso', 'Laly']).map((driverName) => {
                    const sum = reportData?.dailyMatrix.reduce((acc, curr) => acc + (curr.driverSales[driverName] || 0), 0) || 0;
                    return (
                      <td key={driverName} className="p-3 text-right text-white border-r border-white/5">
                        {formatCurrency(sum)}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right text-emerald-400 border-r border-white/5 bg-emerald-500/10">
                    {formatCurrency(reportData?.totalSales || 0)}
                  </td>
                  <td className="p-3 text-right text-red-400 border-r border-white/5 bg-red-500/10">
                    {formatCurrency(reportData?.totalExpenses || 0)}
                  </td>
                  <td className="p-3 text-right text-amber-400 font-black bg-amber-500/10 text-sm">
                    {formatCurrency(reportData?.netProfit || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GASTOS OPERATIVOS */}
      {activeTab === "expenses" && (
        <div className="bg-[#181824] rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-400" />
                Listado de Gastos Registrados ({dateRange.label})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Compras de insumos, nómina, combustible y pagos varios</p>
            </div>
            
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer w-fit"
            >
              <Plus className="w-4 h-4" />
              Nuevo Gasto
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1f1f2e] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-4 font-semibold">Fecha</th>
                  <th className="p-4 font-semibold">Concepto / Descripción</th>
                  <th className="p-4 font-semibold text-right">Monto</th>
                  <th className="p-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportData?.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-gray-500">
                      <p className="text-base font-semibold mb-2">No hay gastos registrados en este período.</p>
                      <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="text-amber-500 hover:text-amber-400 text-xs font-bold underline"
                      >
                        Registrar el primer gasto
                      </button>
                    </td>
                  </tr>
                ) : (
                  reportData?.expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-gray-400 text-xs">
                        {new Date(exp.transaction_date).toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-white">{exp.description}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-red-400 text-base">
                        {formatCurrency(Number(exp.amount))}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CUENTAS POR COBRAR / FIAO */}
      {activeTab === "receivables" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fiao by Driver */}
          <div className="bg-[#181824] rounded-2xl border border-white/10 shadow-xl p-5 flex flex-col">
            <div className="pb-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Fiao por Repartidor
              </h3>
            </div>
            <div className="space-y-3 py-4 flex-1 overflow-y-auto max-h-[450px] custom-scrollbar">
              {reportData?.driverSummaries.length === 0 ? (
                <p className="text-gray-500 text-xs py-4 text-center">No hay datos de choferes.</p>
              ) : (
                reportData?.driverSummaries.map((d) => (
                  <div key={d.driverId} className="bg-[#101018] p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white text-sm">{d.driverName}</p>
                      <p className="text-xs text-gray-400">Vendido a crédito: {formatCurrency(d.creditSales)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-400">{formatCurrency(d.totalFiao)}</p>
                      <p className="text-[10px] text-gray-500">en la calle</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Fiao by Client Table */}
          <div className="lg:col-span-2 bg-[#181824] rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-500" />
                  Clientes con Balance Pendiente
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Colmados y puestos que deben dinero</p>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Total: {formatCurrency(reportData?.totalReceivables || 0)}
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1f1f2e] text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="p-4 font-semibold">Cliente / Negocio</th>
                    <th className="p-4 font-semibold">Contacto / Teléfono</th>
                    <th className="p-4 font-semibold text-right">Límite</th>
                    <th className="p-4 font-semibold text-right">Balance Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {receivables.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        ¡Excelente! No hay clientes con saldo pendiente de pago.
                      </td>
                    </tr>
                  ) : (
                    receivables.map((client) => {
                      const limit = Number(client.credit_limit || 0);
                      const balance = Number(client.current_balance || 0);
                      const isOverLimit = limit > 0 && balance > limit;

                      return (
                        <tr key={client.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-semibold text-white">
                            {client.name}
                            {isOverLimit && (
                              <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded border border-red-500/30">
                                Supera Límite
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-gray-400 text-xs">
                            {client.phone || client.contact_person || "Sin teléfono"}
                          </td>
                          <td className="p-4 text-right text-gray-400 text-xs">
                            {limit > 0 ? formatCurrency(limit) : "Ilimitado"}
                          </td>
                          <td className="p-4 text-right font-black text-amber-400 text-base">
                            {formatCurrency(balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HISTORIAL DE TRANSACCIONES & AUDITORÍA */}
      {activeTab === "transactions" && (
        <div className="bg-[#181824] rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Auditoría de Transacciones ({dateRange.label})</h3>
            <span className="text-xs text-gray-400">Ventas, Cobros y Gastos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1f1f2e] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-4 font-semibold">Fecha y Hora</th>
                  <th className="p-4 font-semibold">Tipo</th>
                  <th className="p-4 font-semibold">Descripción / Entidad</th>
                  <th className="p-4 font-semibold text-right">Monto</th>
                  <th className="p-4 font-semibold">Estado</th>
                  <th className="p-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportData?.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No hay transacciones registradas en este período.
                    </td>
                  </tr>
                ) : (
                  reportData?.recentTransactions.map((tx) => {
                    const isVoid = tx.status.includes("anulada");
                    return (
                      <tr key={`${tx.table}-${tx.id}`} className={`hover:bg-white/5 transition-colors ${isVoid ? "opacity-50" : ""}`}>
                        <td className="p-4 text-gray-400 text-xs">
                          {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs rounded-lg font-bold ${
                            tx.type === "Venta" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            tx.type === "Cobro" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                            "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className={`font-semibold ${isVoid ? "line-through text-gray-500" : "text-white"}`}>
                            {tx.description}
                          </p>
                          {tx.clientOrDriver && (
                            <p className="text-xs text-gray-400">{tx.clientOrDriver}</p>
                          )}
                        </td>
                        <td className={`p-4 text-right font-black ${
                          tx.type === "Gasto" ? "text-red-400" : tx.type === "Cobro" ? "text-blue-400" : "text-emerald-400"
                        } ${isVoid ? "line-through" : ""}`}>
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            isVoid ? "bg-gray-500/10 text-gray-500" : "bg-emerald-500/10 text-emerald-500"
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {!isVoid && tx.table !== "cash_flow" && (
                            <button
                              onClick={() => handleVoidTransaction(tx.id, tx.table)}
                              className="text-red-400/80 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                              title="Anular transacción"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Modal Dialog */}
      <ExpenseDialog
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
