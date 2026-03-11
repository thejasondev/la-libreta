import { useStore } from "@nanostores/react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  $isProfessionalMode,
  $currentProject,
  $dailyTotal,
} from "../../store/appStore";
import { db } from "../../lib/db";
import { CalendarCheck } from "lucide-react";
import BudgetStatus from "./BudgetStatus";
import FinancialOverview from "./FinancialOverview";

export default function Dashboard() {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 w-full animate-in fade-in zoom-in duration-500">
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
        <div className="glass p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm border border-gray-200/60 dark:border-white/5">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Gasto Semanal
          </span>
          <div>
            <span className="text-3xl font-bold text-primary-500 dark:text-primary-400">
              ${(weeklyTotal / 100).toFixed(2)}
            </span>
            <span className="block mt-1 text-xs text-gray-500">
              Últimos 7 días
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
