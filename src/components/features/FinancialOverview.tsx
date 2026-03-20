import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db";
import {
  Wallet,
  CheckCircle2,
  Target,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { useStore } from "@nanostores/react";
import { $personalBudget, $isBusinessMode } from "../../store/appStore";
import { useState } from "react";

export default function FinancialOverview() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const isBizMode = useStore($isBusinessMode);
  const personalBudgetCents = useStore($personalBudget);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    (personalBudgetCents / 100).toString(),
  );

  // Live query: split expenses vs income for the current month
  const monthlyData = useLiveQuery(
    () => {
      return db.expenses
        .filter((exp) => {
          const d = new Date(exp.date);
          return (
            exp.isBusiness === isBizMode &&
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear
          );
        })
        .toArray()
        .then((exps) => {
          const spent = exps
            .filter((e) => !e.type || e.type === "expense")
            .reduce((sum, e) => sum + e.amount, 0);
          const earned = exps
            .filter((e) => e.type === "income")
            .reduce((sum, e) => sum + e.amount, 0);
          return { spent, earned };
        });
    },
    [isBizMode],
    { spent: 0, earned: 0 },
  );

  // Business mode: count sales this month (from expenses, the source of truth)
  const monthlySalesCount = useLiveQuery(
    () => {
      if (!isBizMode) return Promise.resolve(0);
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      return db.expenses
        .where("date")
        .aboveOrEqual(startOfMonth)
        .filter((e) => e.type === "income" && e.isBusiness === true)
        .count();
    },
    [isBizMode],
    0,
  );

  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const valCents = Math.round(parseFloat(budgetInput || "0") * 100);
    $personalBudget.set(valCents);
    setIsEditingBudget(false);
  };

  const percentage =
    personalBudgetCents > 0
      ? Math.min((monthlyData.spent / personalBudgetCents) * 100, 100)
      : 0;
  const isTrackOnly = personalBudgetCents === 0;
  const netBalance = monthlyData.earned - monthlyData.spent;
  const margin =
    monthlyData.earned > 0
      ? Math.round((netBalance / monthlyData.earned) * 100)
      : 0;

  return (
    <div className="glass p-6 rounded-2xl flex flex-col gap-4 col-span-1 lg:col-span-2 shadow-sm border border-gray-200/60 dark:border-primary-500/20 relative overflow-hidden group">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/10 blur-3xl rounded-full pointer-events-none"></div>

      <div className="flex justify-between items-start z-10">
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
            {isBizMode ? "Resumen del Negocio" : "Resumen del Mes"}
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              ${(monthlyData.spent / 100).toFixed(2)}
            </span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {isBizMode
                ? "en costos"
                : !isTrackOnly
                  ? `/ $${(personalBudgetCents / 100).toFixed(2)}`
                  : "gastado"}
            </span>
          </div>
          {/* Income & Net Balance line */}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
            {monthlyData.earned > 0 && (
              <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                <ArrowUpCircle className="w-3 h-3" />
                {isBizMode ? "Ventas:" : "Ingresos:"} +$
                {(monthlyData.earned / 100).toFixed(2)}
              </span>
            )}
            {(monthlyData.earned > 0 || monthlyData.spent > 0) && (
              <span
                className={`font-bold ${netBalance >= 0 ? "text-emerald-500" : "text-red-400"}`}
              >
                {isBizMode ? "Ganancia:" : "Neto:"} {netBalance >= 0 ? "+" : ""}
                ${(netBalance / 100).toFixed(2)}
              </span>
            )}
            {isBizMode && monthlyData.earned > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  margin >= 30
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : margin >= 10
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-red-500/10 text-red-500"
                }`}
              >
                {margin}% margen
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl text-primary-500 relative group-hover:scale-110 transition-transform">
            {isBizMode ? (
              <TrendingUp className="w-6 h-6" />
            ) : (
              <Wallet className="w-6 h-6" />
            )}
          </div>

          {/* Budget button (Personal mode only) */}
          {!isBizMode && (
            <button
              onClick={() => setIsEditingBudget(!isEditingBudget)}
              className="flex items-center gap-1.5 px-2 py-1 bg-white/50 dark:bg-white/5 hover:bg-primary-500/10 rounded-lg text-gray-500 hover:text-primary-500 transition-all border border-transparent hover:border-primary-500/20"
              title="Configurar presupuesto mensual"
            >
              <Target className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-tighter">
                Presupuesto
              </span>
            </button>
          )}

          {/* Sales count badge (Business mode) */}
          {isBizMode && monthlySalesCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
              <ShoppingCart className="w-3 h-3" />
              {monthlySalesCount} {monthlySalesCount === 1 ? "venta" : "ventas"}
            </div>
          )}
        </div>
      </div>

      {/* Budget editor and progress bar (Personal mode only) */}
      {!isBizMode && (
        <>
          {isEditingBudget ? (
            <form
              onSubmit={saveBudget}
              className="flex gap-2 z-10 mt-2 animate-in slide-in-from-top-2 duration-200"
            >
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full bg-white/50 dark:bg-teal-900/50 text-gray-900 dark:text-white px-4 py-2 pl-8 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="Presupuesto mensual (0 = Libre)"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-3 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-primary-500/20"
                title="Guardar Presupuesto Mensual"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <div className="flex flex-col mt-2 z-10 w-full animate-in fade-in zoom-in duration-200">
              {isTrackOnly ? (
                <div className="bg-primary-500/10 text-primary-700 dark:text-primary-400 font-medium px-4 py-3 rounded-xl text-sm border border-primary-500/20 text-center">
                  Registro libre activo. No hay límite mensual definido.
                </div>
              ) : (
                <>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ease-in-out ${percentage > 90 ? "bg-rose-500" : "bg-primary-500"}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
                    <span>Gastado: {percentage.toFixed(0)}%</span>
                    <span>
                      Previsto: ${(personalBudgetCents / 100).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Business mode: profit indicator bar */}
      {isBizMode && monthlyData.earned > 0 && (
        <div className="flex flex-col mt-2 z-10 w-full animate-in fade-in zoom-in duration-200">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-in-out ${
                netBalance >= 0 ? "bg-emerald-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(Math.abs(margin), 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <ArrowDownCircle className="w-3 h-3 text-red-400" />
              Costos: ${(monthlyData.spent / 100).toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              <ArrowUpCircle className="w-3 h-3 text-emerald-500" />
              Ventas: ${(monthlyData.earned / 100).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
