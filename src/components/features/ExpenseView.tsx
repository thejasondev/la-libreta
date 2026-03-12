import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Expense } from "../../lib/db";
import { useStore } from "@nanostores/react";
import {
  $isProfessionalMode,
  $currentProject,
  recalculateDailyTotal,
} from "../../store/appStore";
import ExpenseRow from "./ExpenseRow";
import EditExpenseModal from "./EditExpenseModal";

export default function ExpenseView() {
  const isProMode = useStore($isProfessionalMode);
  const currentProject = useStore($currentProject);

  const [timeFilter, setTimeFilter] = useState<
    "all" | "thisMonth" | "lastMonth"
  >("thisMonth");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">(
    "all",
  );
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const expenses =
    useLiveQuery(() => {
      let collection = db.expenses.orderBy("date").reverse();
      return collection.toArray();
    }, []) || [];

  const projects = useLiveQuery(() => db.projects.toArray()) || [];

  // Client-side filtering
  const filteredExpenses = expenses.filter((exp) => {
    // 1. Time Filter
    const d = new Date(exp.date);
    const now = new Date();
    if (timeFilter === "thisMonth") {
      if (
        d.getMonth() !== now.getMonth() ||
        d.getFullYear() !== now.getFullYear()
      )
        return false;
    } else if (timeFilter === "lastMonth") {
      let lastMonth = now.getMonth() - 1;
      let year = now.getFullYear();
      if (lastMonth < 0) {
        lastMonth = 11;
        year--;
      }
      if (d.getMonth() !== lastMonth || d.getFullYear() !== year) return false;
    }

    // 2. Mode Isolation & Pro Filters
    if (exp.isProfessional !== isProMode) return false;

    if (isProMode) {
      // If a project is selected, show only that project.
      // If NO project is selected, show "General Pro" expenses (no projectId).
      if (currentProject) {
        if (exp.projectId !== currentProject.id) return false;
      } else {
        if (exp.projectId) return false;
      }

      if (
        statusFilter === "pending" &&
        (!exp.isReimbursable || exp.status !== "pending")
      )
        return false;
      if (statusFilter === "paid" && exp.status !== "paid") return false;
    }

    return true;
  });

  const handleDelete = async (id: string) => {
    await db.expenses.delete(id);
    await recalculateDailyTotal();
  };

  const getProjectColor = (projectId?: string) => {
    if (!projectId) return null;
    const p = projects.find((proj) => proj.id === projectId);
    return p ? p.color : null;
  };

  const formatDate = (ts: string | number) => {
    return new Date(ts).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const totalExpenses = filteredExpenses
    .filter((e) => !e.type || e.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncome = filteredExpenses
    .filter((e) => e.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 glass p-5 rounded-2xl border border-gray-200/60 dark:border-primary-500/10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gastos e Ingresos
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
            <span className="text-gray-500 dark:text-gray-400">Gastos:</span>
            <span className="font-bold text-red-400">
              -${(totalExpenses / 100).toFixed(2)}
            </span>
            {totalIncome > 0 && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 dark:text-gray-400">
                  Ingresos:
                </span>
                <span className="font-bold text-emerald-500">
                  +${(totalIncome / 100).toFixed(2)}
                </span>
                <span className="text-gray-400">·</span>
                <span
                  className={`font-bold ${totalIncome - totalExpenses >= 0 ? "text-emerald-500" : "text-red-400"}`}
                >
                  Neto: {totalIncome - totalExpenses >= 0 ? "+" : ""}$
                  {((totalIncome - totalExpenses) / 100).toFixed(2)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Time Filter Pill Selector */}
          <div className="flex items-center bg-white/50 dark:bg-teal-900/50 rounded-xl border border-gray-200/60 dark:border-white/5 overflow-hidden">
            {[
              { value: "thisMonth" as const, label: "Este Mes" },
              { value: "lastMonth" as const, label: "Anterior" },
              { value: "all" as const, label: "Todo" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeFilter(opt.value)}
                className={`px-3 py-2 text-xs font-bold transition-all ${
                  timeFilter === opt.value
                    ? "bg-primary-500 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Status Filter Pill Selector (Pro Mode only) */}
          {isProMode && (
            <div className="flex items-center bg-white/50 dark:bg-teal-900/50 rounded-xl border border-gray-200/60 dark:border-white/5 overflow-hidden">
              {[
                { value: "all" as const, label: "Todos" },
                { value: "pending" as const, label: "Pendiente" },
                { value: "paid" as const, label: "Reembolsado" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-2 text-xs font-bold transition-all ${
                    statusFilter === opt.value
                      ? "bg-primary-500 text-white"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col w-full">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No se encontraron gastos para estos filtros.
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <ExpenseRow
              key={exp.id}
              expense={exp}
              onDelete={handleDelete}
              onEdit={(expense) => setEditingExpense(expense)}
              getProjectColor={getProjectColor}
              formatDate={formatDate}
            />
          ))
        )}
      </div>

      {/* Edit Modal */}
      <EditExpenseModal
        expense={editingExpense}
        isOpen={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
      />
    </div>
  );
}
