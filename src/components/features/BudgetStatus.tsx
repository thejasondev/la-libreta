import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import {
  $currentProject,
  $isProfessionalMode,
  $dailyTotal,
} from "../../store/appStore";
import {
  calculateBudgetHealth,
  type BudgetHealthResult,
} from "../../lib/finance-logic";
import { Briefcase } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db";

export default function BudgetStatus() {
  const isProMode = useStore($isProfessionalMode);
  const currentProject = useStore($currentProject);
  const dailyTotal = useStore($dailyTotal); // to trigger recalcs

  const [budgetHealth, setBudgetHealth] = useState<BudgetHealthResult | null>(
    null,
  );

  useEffect(() => {
    if (isProMode && currentProject) {
      calculateBudgetHealth(currentProject.id).then(setBudgetHealth);
    } else {
      setBudgetHealth(null);
    }
  }, [isProMode, currentProject, dailyTotal]); // Re-run when dailyTotal changes implicitly across app

  // Wait for load
  if (isProMode && currentProject && !budgetHealth) {
    return (
      <div className="glass p-5 rounded-2xl col-span-1 lg:col-span-2 shadow-sm border border-amber-500/10 h-32 skeleton"></div>
    );
  }

  if (!isProMode) {
    return (
      <div className="glass p-5 rounded-2xl flex flex-col justify-center gap-2 col-span-1 lg:col-span-2 shadow-sm border border-teal-500/10 dark:bg-white/5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/10 blur-3xl rounded-full"></div>
        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium z-10">
          Resumen Personal
        </span>
        <p className="text-sm dark:text-gray-300 font-medium leading-relaxed z-10">
          Organiza tus finanzas diarias sin esfuerzo. Mantén todos tus gastos
          personales mapeados en un solo lugar.
        </p>
      </div>
    );
  }

  if (isProMode && !currentProject) {
    return (
      <a
        href="/proyectos"
        className="glass p-5 rounded-2xl flex flex-col justify-center items-center gap-2 col-span-1 lg:col-span-2 shadow-sm border border-dashed border-amber-500/30 hover:bg-amber-500/5 transition-colors group cursor-pointer"
      >
        <Briefcase className="w-6 h-6 text-amber-500/50 group-hover:text-amber-500 transition-colors" />
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Selecciona o crea un proyecto
        </span>
      </a>
    );
  }

  const { spentPercentage, status, spentAmountCents, budgetLimitCents } =
    budgetHealth!;

  // Map status badge styles (proper Tailwind v4 syntax)
  const badgeStyles =
    status === "Green"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : status === "Yellow"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-rose-500/15 text-rose-600 dark:text-rose-400";

  const progressColor =
    status === "Green"
      ? "bg-emerald-500"
      : status === "Yellow"
        ? "bg-amber-500"
        : "bg-rose-500";

  const statusText =
    status === "Green"
      ? "En buen camino"
      : status === "Yellow"
        ? "Precaución"
        : "Excedido";

  return (
    <div className="glass p-6 rounded-2xl flex flex-col gap-4 col-span-1 lg:col-span-2 shadow-sm border border-amber-500/20 relative overflow-hidden">
      {/* Dynamic Project Color Glow if it exists */}
      {currentProject?.color && (
        <div
          className="absolute -top-20 -right-20 w-48 h-48 blur-3xl opacity-20 pointer-events-none rounded-full"
          style={{ backgroundColor: currentProject.color }}
        ></div>
      )}

      <div className="flex justify-between items-start z-10">
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentProject?.color || "#fbbf24" }}
            ></span>
            {currentProject?.name}
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold dark:text-white">
              ${(spentAmountCents / 100).toFixed(2)}
            </span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              / ${(budgetLimitCents / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <div
          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badgeStyles}`}
        >
          {statusText}
        </div>
      </div>

      <div className="w-full h-2 bg-gray-200 dark:bg-teal-900/50 rounded-full overflow-hidden z-10">
        <div
          className={`h-full ${progressColor} transition-all duration-700 ease-in-out`}
          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}
