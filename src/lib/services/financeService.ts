import { createClient } from '@/lib/supabase/client';
import { CashFlow } from '@/types/database';
import { 
  HISTORICAL_DRIVERS, 
  HISTORICAL_SALES, 
  HISTORICAL_EXPENSES, 
  HISTORICAL_CLIENTS 
} from '@/lib/data/historicalData';

export interface DriverSaleSummary {
  driverId: string;
  driverName: string;
  cashSales: number;
  creditSales: number;
  totalSales: number;
  salesCount: number;
  totalFiao: number;
  percentage: number;
}

export interface ExpenseGroupSummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailyMatrixRow {
  dateKey: string;
  dayLabel: string;
  driverSales: Record<string, number>;
  totalDaySales: number;
  dayExpenses: number;
  dayNet: number;
}

export interface FortnightlyReportData {
  startDate: string;
  endDate: string;
  totalSales: number;
  totalCashSales: number;
  totalCreditSales: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalReceivables: number;
  driverSummaries: DriverSaleSummary[];
  expenseGroups: ExpenseGroupSummary[];
  expenses: CashFlow[];
  dailyMatrix: DailyMatrixRow[];
  activeDriverNames: string[];
  recentTransactions: Array<{
    id: string;
    date: string;
    type: 'Venta' | 'Cobro' | 'Gasto';
    amount: number;
    description: string;
    clientOrDriver?: string;
    status: string;
    table: string;
  }>;
}

const DEFAULT_EXPENSE_SUGGESTIONS = [
  'Gas / Combustible',
  'Sacos de Harina',
  'Queso',
  'Vegetales y Especias',
  'Carne de Res',
  'Carne de Pollo',
  'Pago Nene',
  'Pago Joelito',
  'Pago Meloso',
  'Sueldo Empleados',
  'Materiales / Fundas / Papel encerado',
  'Aceite',
  'Mantenimiento Vehículo',
  'Alquiler de Local',
  'Préstamo Joel',
  'Préstamo Nene',
  'Préstamo Meloso',
  'Electricidad / Servicios',
  'Mercado',
  'Otros Gastos'
];

export const financeService = {
  /**
   * Get all cash flow entries within a date range
   */
  async getCashFlow(startDate: string, endDate: string) {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('cash_flow')
        .select('*')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });
      return { data, error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  /**
   * Add a new expense or cash flow entry
   */
  async addExpense(entry: {
    amount: number;
    description: string;
    transaction_date?: string;
    reference_id?: string | null;
  }) {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('cash_flow')
        .insert([
          {
            transaction_type: 'egreso',
            amount: entry.amount,
            description: entry.description.trim(),
            reference_id: entry.reference_id || null,
            transaction_date: entry.transaction_date || new Date().toISOString(),
          }
        ])
        .select()
        .single();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Delete an expense
   */
  async deleteExpense(id: string) {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('cash_flow')
        .delete()
        .eq('id', id);
      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  },

  /**
   * Get existing unique expense descriptions for autocomplete suggestions
   */
  async getExpenseSuggestions(): Promise<string[]> {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('cash_flow')
        .select('description')
        .eq('transaction_type', 'egreso')
        .limit(100);

      const savedDescriptions = (data || [])
        .map((d: any) => d.description?.trim())
        .filter(Boolean);

      const histDescriptions = HISTORICAL_EXPENSES.map(e => e.description.trim());

      const combined = Array.from(new Set([...savedDescriptions, ...histDescriptions, ...DEFAULT_EXPENSE_SUGGESTIONS]));
      return combined;
    } catch {
      return DEFAULT_EXPENSE_SUGGESTIONS;
    }
  },

  /**
   * Get overall accounts receivable (clients with balance > 0)
   */
  async getAccountsReceivable() {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .gt('current_balance', 0)
        .order('current_balance', { ascending: false });

      if (data && data.length > 0) {
        return { data, error: null };
      }
    } catch {
      // fallback to historical
    }
    return { data: HISTORICAL_CLIENTS, error: null };
  },

  /**
   * Comprehensive Fortnightly / Period Financial Calculation matching Excel Matrix
   */
  async getFortnightlyReport(startDate: string, endDate: string): Promise<FortnightlyReportData> {
    const supabase = createClient();

    let salesData: any[] = [];
    let expensesData: any[] = [];
    let paymentsData: any[] = [];
    let driversData: any[] = [];
    let clientsData: any[] = [];

    try {
      const [sRes, eRes, pRes, dRes, cRes] = await Promise.all([
        supabase
          .from('sales')
          .select('id, repartidor_id, client_id, sale_type, total_amount, paid_amount, status, created_at, profiles(id, first_name, last_name), clients(id, name)')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .neq('status', 'anulada'),
        supabase
          .from('cash_flow')
          .select('*')
          .eq('transaction_type', 'egreso')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('payments')
          .select('id, client_id, repartidor_id, amount, payment_date, status, clients(id, name), profiles(id, first_name, last_name)')
          .gte('payment_date', startDate)
          .lte('payment_date', endDate)
          .neq('status', 'anulado'),
        supabase.from('profiles').select('id, first_name, last_name, role'),
        supabase.from('clients').select('id, name, current_balance').gt('current_balance', 0),
      ]);

      salesData = sRes.data || [];
      expensesData = eRes.data || [];
      paymentsData = pRes.data || [];
      driversData = dRes.data || [];
      clientsData = cRes.data || [];
    } catch {
      // fallback
    }

    // Merge with historical data for the date range
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();

    const filteredHistSales = HISTORICAL_SALES.filter((s) => {
      const ms = new Date(s.created_at).getTime();
      return ms >= startMs && ms <= endMs;
    });

    const filteredHistExpenses = HISTORICAL_EXPENSES.filter((e) => {
      const ms = new Date(e.transaction_date).getTime();
      return ms >= startMs && ms <= endMs;
    });

    const sales = salesData.length > 0 ? salesData : filteredHistSales;
    const expenses = (expensesData.length > 0 ? expensesData : filteredHistExpenses) as CashFlow[];
    const payments = paymentsData;
    const drivers = driversData.length > 0 ? driversData : HISTORICAL_DRIVERS;
    const clientsWithBalance = clientsData.length > 0 ? clientsData : HISTORICAL_CLIENTS;

    // Calculate Sales Totals
    let totalSales = 0;
    let totalCashSales = 0;
    let totalCreditSales = 0;

    const driverMap = new Map<string, {
      driverId: string;
      driverName: string;
      cashSales: number;
      creditSales: number;
      totalSales: number;
      salesCount: number;
      totalFiao: number;
    }>();

    const activeDriverNameSet = new Set<string>(['Joelito', 'Nene', 'Meloso', 'Laly']);

    // Initialize drivers
    drivers.forEach((driver: any) => {
      const name = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Repartidor';
      activeDriverNameSet.add(name);
      driverMap.set(driver.id, {
        driverId: driver.id,
        driverName: name,
        cashSales: 0,
        creditSales: 0,
        totalSales: 0,
        salesCount: 0,
        totalFiao: 0,
      });
    });

    // Fiao from historical clients per driver
    HISTORICAL_CLIENTS.forEach((hc) => {
      const targetDriver = Array.from(driverMap.values()).find(d => d.driverName.toLowerCase().includes(hc.driver.toLowerCase()));
      if (targetDriver) {
        targetDriver.totalFiao += hc.current_balance;
      }
    });

    const matrixMap = new Map<string, {
      driverSales: Record<string, number>;
      totalSales: number;
      dayExpenses: number;
    }>();

    sales.forEach((s: any) => {
      const amount = Number(s.total_amount || 0);
      const isCredit = s.sale_type === 'credito';
      const unpaidAmount = Math.max(0, amount - Number(s.paid_amount || 0));
      const dateKey = (s.created_at || '').split('T')[0];

      totalSales += amount;
      if (isCredit) {
        totalCreditSales += amount;
      } else {
        totalCashSales += amount;
      }

      const driverId = s.repartidor_id || 'unknown';
      let driverEntry = driverMap.get(driverId);
      const dName = s.driver_name || (s.profiles ? `${s.profiles.first_name || ''} ${s.profiles.last_name || ''}`.trim() : (driverEntry?.driverName || 'Repartidor'));

      if (!driverEntry) {
        driverEntry = {
          driverId,
          driverName: dName || 'Repartidor',
          cashSales: 0,
          creditSales: 0,
          totalSales: 0,
          salesCount: 0,
          totalFiao: 0,
        };
        driverMap.set(driverId, driverEntry);
      }

      activeDriverNameSet.add(driverEntry.driverName);

      if (isCredit) {
        driverEntry.creditSales += amount;
        driverEntry.totalFiao += unpaidAmount;
      } else {
        driverEntry.cashSales += amount;
      }
      driverEntry.totalSales += amount;
      driverEntry.salesCount += 1;

      if (dateKey) {
        const mRow = matrixMap.get(dateKey) || { driverSales: {}, totalSales: 0, dayExpenses: 0 };
        mRow.driverSales[driverEntry.driverName] = (mRow.driverSales[driverEntry.driverName] || 0) + amount;
        mRow.totalSales += amount;
        matrixMap.set(dateKey, mRow);
      }
    });

    payments.forEach((p: any) => {
      const driverId = p.repartidor_id;
      if (driverId && driverMap.has(driverId)) {
        const driverEntry = driverMap.get(driverId)!;
        driverEntry.totalFiao = Math.max(0, driverEntry.totalFiao - Number(p.amount || 0));
      }
    });

    const driverSummaries: DriverSaleSummary[] = Array.from(driverMap.values())
      .map(d => ({
        ...d,
        percentage: totalSales > 0 ? (d.totalSales / totalSales) * 100 : 0
      }))
      .filter(d => d.totalSales > 0 || d.totalFiao > 0)
      .sort((a, b) => b.totalSales - a.totalSales);

    let totalExpenses = 0;
    const categoryMap = new Map<string, { total: number; count: number }>();

    expenses.forEach((exp) => {
      const amount = Number(exp.amount || 0);
      totalExpenses += amount;

      const desc = exp.description?.trim() || 'Varios';
      const existing = categoryMap.get(desc) || { total: 0, count: 0 };
      existing.total += amount;
      existing.count += 1;
      categoryMap.set(desc, existing);

      const dateKey = (exp.transaction_date || '').split('T')[0];
      if (dateKey) {
        const mRow = matrixMap.get(dateKey) || { driverSales: {}, totalSales: 0, dayExpenses: 0 };
        mRow.dayExpenses += amount;
        matrixMap.set(dateKey, mRow);
      }
    });

    const expenseGroups: ExpenseGroupSummary[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const dailyMatrix: DailyMatrixRow[] = [];

    const cur = new Date(startObj);
    while (cur <= endObj) {
      const dateKey = cur.toISOString().split('T')[0];
      const dayData = matrixMap.get(dateKey) || { driverSales: {}, totalSales: 0, dayExpenses: 0 };
      const dayLabel = cur.toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });

      dailyMatrix.push({
        dateKey,
        dayLabel,
        driverSales: dayData.driverSales,
        totalDaySales: dayData.totalSales,
        dayExpenses: dayData.dayExpenses,
        dayNet: dayData.totalSales - dayData.dayExpenses,
      });

      cur.setDate(cur.getDate() + 1);
    }

    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const totalReceivables = clientsWithBalance.reduce((acc, curr: any) => acc + Number(curr.current_balance || 0), 0);

    const recentTransactions = [
      ...sales.map((s: any) => ({
        id: s.id,
        date: s.created_at,
        type: 'Venta' as const,
        amount: Number(s.total_amount || 0),
        description: `Venta ${s.driver_name ? `(${s.driver_name})` : ''}`,
        clientOrDriver: s.clients?.name ? `${s.clients.name}` : (s.driver_name || undefined),
        status: s.status || 'activa',
        table: 'sales'
      })),
      ...expenses.map((e) => ({
        id: e.id,
        date: e.transaction_date,
        type: 'Gasto' as const,
        amount: Number(e.amount || 0),
        description: e.description,
        clientOrDriver: undefined,
        status: 'activo',
        table: 'cash_flow'
      })),
      ...payments.map((p: any) => ({
        id: p.id,
        date: p.payment_date,
        type: 'Cobro' as const,
        amount: Number(p.amount || 0),
        description: 'Abono / Cobro de Fiao',
        clientOrDriver: p.clients?.name ? `${p.clients.name}` : undefined,
        status: p.status || 'activo',
        table: 'payments'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);

    return {
      startDate,
      endDate,
      totalSales,
      totalCashSales,
      totalCreditSales,
      totalExpenses,
      netProfit,
      profitMargin,
      totalReceivables,
      driverSummaries,
      expenseGroups,
      expenses,
      dailyMatrix,
      activeDriverNames: Array.from(activeDriverNameSet),
      recentTransactions
    };
  }
};
