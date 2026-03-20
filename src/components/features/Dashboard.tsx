import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { useLiveQuery } from "dexie-react-hooks";
import { $isBusinessMode, $dailyTotal } from "../../store/appStore";
import { db } from "../../lib/db";
import {
  CalendarCheck,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  Package,
} from "lucide-react";
import FinancialOverview from "./FinancialOverview";
import CategoryPieChart from "./charts/CategoryPieChart";
import TopEarnersChart from "./charts/TopEarnersChart";

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isBizMode = useStore($isBusinessMode);
  const dailyTotal = useStore($dailyTotal);

  // Weekly total
  const weeklyTotal = useLiveQuery(
    () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return db.expenses
        .where("date")
        .aboveOrEqual(lastWeek.toISOString())
        .filter((exp) => exp.isBusiness === isBizMode)
        .toArray()
        .then((exps) =>
          exps
            .filter((e) => !e.type || e.type === "expense")
            .reduce((sum, exp) => sum + exp.amount, 0),
        );
    },
    [isBizMode],
    0,
  );

  // Net balance: income - expenses for current month
  const monthlyBalance = useLiveQuery(
    () => {
      const now = new Date();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();
      return db.expenses
        .where("date")
        .aboveOrEqual(startOfMonth)
        .filter((exp) => exp.isBusiness === isBizMode)
        .toArray()
        .then((exps) => {
          const income = exps
            .filter((e) => e.type === "income")
            .reduce((sum, e) => sum + e.amount, 0);
          const expenses = exps
            .filter((e) => !e.type || e.type === "expense")
            .reduce((sum, e) => sum + e.amount, 0);
          return { income, expenses };
        });
    },
    [isBizMode],
    { income: 0, expenses: 0 },
  );

  // Business mode: today's sales (counted from expenses, the source of truth)
  const salesToday = useLiveQuery(
    () => {
      if (!isBizMode) return Promise.resolve({ count: 0, total: 0 });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return db.expenses
        .where("date")
        .aboveOrEqual(today.toISOString())
        .filter((e) => e.type === "income" && e.isBusiness === true)
        .toArray()
        .then((exps) => ({
          count: exps.length,
          total: exps.reduce((sum, e) => sum + e.amount, 0),
        }));
    },
    [isBizMode],
    { count: 0, total: 0 },
  );

  // Business mode: product count
  const productCount = useLiveQuery(
    () => {
      if (!isBizMode) return Promise.resolve(0);
      return db.products.filter((p) => p.isActive).count();
    },
    [isBizMode],
    0,
  );

  // Chart: expenses for current context
  const chartExpenses = useLiveQuery(
    () => {
      return db.expenses
        .filter((exp) => exp.isBusiness === isBizMode)
        .toArray();
    },
    [isBizMode],
    [],
  );

  // Business mode: all sales for top earners
  const allSales = useLiveQuery(
    () => {
      if (!isBizMode) return Promise.resolve([]);
      return db.sales.toArray();
    },
    [isBizMode],
    [],
  );

  const netBalance = monthlyBalance.income - monthlyBalance.expenses;
  const grossProfit = monthlyBalance.income - monthlyBalance.expenses;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full animate-in fade-in zoom-in duration-500">
        {/* Widget A: Financial Overview */}
        <FinancialOverview />

        {/* Widget B: Daily Stats */}
        <div className="glass p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm border border-gray-200/60 dark:border-white/5">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              {isBizMode ? "Costos de Hoy" : "Gasto de Hoy"}
            </span>
            <CalendarCheck className="w-5 h-5 text-primary-400 dark:text-primary-300 opacity-60" />
          </div>
          <div>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              ${(dailyTotal / 100).toFixed(2)}
            </span>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>vs. semanal: ${(weeklyTotal / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Widget C: Mode-specific stats */}
        {isBizMode ? (
          <>
            {/* Sales Today */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-sm border border-emerald-500/10">
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Ventas de Hoy
                </span>
                <ShoppingCart className="w-5 h-5 text-emerald-400 opacity-60" />
              </div>
              <div>
                <span className="text-3xl font-bold text-emerald-500">
                  ${(salesToday.total / 100).toFixed(2)}
                </span>
                <div className="mt-1 text-xs text-gray-500">
                  {salesToday.count}{" "}
                  {salesToday.count === 1 ? "venta" : "ventas"} registradas
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-sm border border-gray-200/60 dark:border-white/5">
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Ganancia del Mes
                </span>
                <TrendingUp className="w-5 h-5 text-teal-400 opacity-60" />
              </div>
              <div>
                <span
                  className={`text-3xl font-bold ${grossProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {grossProfit >= 0 ? "+" : ""}${(grossProfit / 100).toFixed(2)}
                </span>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-500">
                    <ArrowUpCircle className="w-3 h-3" />
                    Ventas: ${(monthlyBalance.income / 100).toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <ArrowDownCircle className="w-3 h-3" />
                    Costos: ${(monthlyBalance.expenses / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="glass p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-sm border border-gray-200/60 dark:border-white/5">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              Balance del Mes
            </span>
            <div>
              <span
                className={`text-3xl font-bold ${
                  netBalance >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {netBalance >= 0 ? "+" : ""}${(netBalance / 100).toFixed(2)}
              </span>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-500">
                  <ArrowUpCircle className="w-3 h-3" />
                  +${(monthlyBalance.income / 100).toFixed(2)}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <ArrowDownCircle className="w-3 h-3" />
                  -${(monthlyBalance.expenses / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Section */}
      <div className="w-full glass p-5 md:p-6 rounded-2xl border border-gray-200/60 dark:border-white/5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isBizMode ? "Top Ingresos" : "Análisis por Categoría"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isBizMode
                ? "Artículos o servicios que más generan"
                : "Distribución histórica del gasto"}
            </p>
          </div>
        </div>

        <div className="w-full min-h-[250px]">
          {isMounted ? (
            isBizMode ? (
              <TopEarnersChart sales={allSales} />
            ) : (
              <CategoryPieChart expenses={chartExpenses} />
            )
          ) : (
            <div className="w-full h-[250px] flex items-center justify-center text-gray-400 animate-pulse">
              Cargando gráfico...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
