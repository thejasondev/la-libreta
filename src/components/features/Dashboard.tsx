import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  $isProfessionalMode,
  $currentProject,
  $dailyTotal,
} from "../../store/appStore";
import { db } from "../../lib/db";
import {
  CalendarCheck,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import BudgetStatus from "./BudgetStatus";
import FinancialOverview from "./FinancialOverview";
import CategoryPieChart from "./charts/CategoryPieChart";

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isProMode = useStore($isProfessionalMode);
  const currentProject = useStore($currentProject);
  const dailyTotal = useStore($dailyTotal);

  // Widget C - Live query for pending reimbursements
  const pendingReimbursements = useLiveQuery(
    () => {
      if (!isProMode || !currentProject) return Promise.resolve(0);
      return db.expenses
        .where("projectId")
        .equals(currentProject.id)
        .filter(
          (exp) =>
            exp.isProfessional === true &&
            exp.isReimbursable &&
            exp.status === "pending",
        )
        .toArray()
        .then((exps) => exps.reduce((sum, exp) => sum + exp.amount, 0));
    },
    [isProMode, currentProject],
    0, // Default
  );

  // Widget B - Live query for weekly budget (simplified logic: get expenses from last 7 days)
  const weeklyTotal = useLiveQuery(
    () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      let query = db.expenses
        .where("date")
        .aboveOrEqual(lastWeek.toISOString())
        .filter((exp) => exp.isProfessional === isProMode);

      if (isProMode && currentProject) {
        query = query.filter((exp) => exp.projectId === currentProject.id);
      }

      return query
        .toArray()
        .then((exps) => exps.reduce((sum, exp) => sum + exp.amount, 0));
    },
    [isProMode, currentProject],
    0,
  );

  // Net balance: income - expenses for current month (personal mode)
  const monthlyBalance = useLiveQuery(
    () => {
      if (isProMode) return Promise.resolve({ income: 0, expenses: 0 });
      const now = new Date();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      return db.expenses
        .where("date")
        .aboveOrEqual(startOfMonth)
        .filter((exp) => !exp.isProfessional)
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
    [isProMode],
    { income: 0, expenses: 0 },
  );

  // Analytics - All expenses for current context
  const chartExpenses = useLiveQuery(
    () => {
      let query = db.expenses.toCollection();

      if (isProMode) {
        if (!currentProject) return Promise.resolve([]);
        query = db.expenses.where("projectId").equals(currentProject.id);
      } else {
        query = db.expenses.filter((exp) => !exp.isProfessional);
      }

      return query.toArray();
    },
    [isProMode, currentProject],
    [],
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full animate-in fade-in zoom-in duration-500">
        {/* Widget A: Budget Health OR Financial Overview */}
        {isProMode ? <BudgetStatus /> : <FinancialOverview />}

        {/* Widget B: Quick Stats (Daily vs Weekly) */}
        <div className="glass p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm border border-gray-200/60 dark:border-white/5">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              Gasto de Hoy
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

        {/* Widget C: Reimbursement Status OR Total Balance fallback */}
        {isProMode ? (
          <a
            href="/gastos?filter=pending"
            className="glass p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm border border-primary-500/10 hover:border-primary-500/30 transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors rounded-full blur-2xl -mr-10 -mt-10"></div>
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium relative z-10 group-hover:text-primary-500 transition-colors">
              Dinero en el Aire
            </span>
            <div className="relative z-10">
              <span className="text-3xl font-bold text-primary-500 dark:text-primary-400">
                ${(pendingReimbursements / 100).toFixed(2)}
              </span>
              <span className="block mt-1 text-xs text-primary-600/70 dark:text-primary-400/70 font-medium">
                Pendiente de reembolso
              </span>
            </div>
          </a>
        ) : (
          <div className="glass p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-sm border border-gray-200/60 dark:border-white/5">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              Balance del Mes
            </span>
            <div>
              <span
                className={`text-3xl font-bold ${
                  monthlyBalance.income - monthlyBalance.expenses >= 0
                    ? "text-emerald-500"
                    : "text-red-500"
                }`}
              >
                {monthlyBalance.income - monthlyBalance.expenses >= 0
                  ? "+"
                  : ""}
                $
                {(
                  (monthlyBalance.income - monthlyBalance.expenses) /
                  100
                ).toFixed(2)}
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
              Análisis por Categoría
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Distribución histórica del gasto
            </p>
          </div>
        </div>

        <div className="w-full min-h-[250px]">
          {isMounted ? (
            <CategoryPieChart expenses={chartExpenses} />
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
