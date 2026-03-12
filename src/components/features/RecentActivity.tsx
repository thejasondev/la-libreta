import { useLiveQuery } from "dexie-react-hooks";
import { db, type Expense } from "../../lib/db";
import { useStore } from "@nanostores/react";
import {
  $isProfessionalMode,
  $currentProject,
  recalculateDailyTotal,
} from "../../store/appStore";
import { getCategoryConfig } from "../../lib/categories";
import { PiggyBank, CheckCircle2, Trash2 } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "../ui/ConfirmDialog";
import EditExpenseModal from "./EditExpenseModal";
import { showToast } from "../../store/toastStore";

// Helper to format date groups
const getRelativeDateGroup = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return "Hoy";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Ayer";

  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
};

export default function RecentActivity() {
  const isProMode = useStore($isProfessionalMode);
  const currentProject = useStore($currentProject);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Combine query for projects to show dynamic colors
  const projects = useLiveQuery(() => db.projects.toArray(), []) || [];

  const getProjectColor = (projectId?: string) => {
    if (!projectId) return undefined;
    const project = projects.find((p) => p.id === projectId);
    return project?.color;
  };

  const expenses = useLiveQuery(() => {
    let query = db.expenses.orderBy("date").reverse();

    // Isolation core filter
    const collection = query.filter((exp) => exp.isProfessional === isProMode);

    if (isProMode) {
      if (currentProject) {
        return collection
          .filter((exp) => exp.projectId === currentProject.id)
          .limit(30)
          .toArray();
      }
      // If Pro Mode but no project, show "general" professional expenses
      return collection
        .filter((exp) => !exp.projectId)
        .limit(30)
        .toArray();
    }

    // Personal mode: just show all recent personal expenses
    return collection.limit(30).toArray();
  }, [isProMode, currentProject]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget);
      await db.expenses.delete(deleteTarget);
      recalculateDailyTotal();
    } catch (err) {
      console.error("Failed to delete expense", err);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // No longer needed — using getSmartIcon from lib/smart-icons.ts

  if (expenses === undefined) {
    // Skeleton Loader
    return (
      <div className="flex flex-col gap-3 w-full animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass p-4 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
              <div className="flex flex-col gap-2">
                <div className="w-24 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-16 h-3 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>
            </div>
            <div className="w-16 h-5 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center glass rounded-3xl border-dashed border-2 border-gray-200 dark:border-white/10">
        <div
          className={`w-16 h-16 mb-4 flex items-center justify-center rounded-full ${
            isProMode
              ? "text-amber-200 dark:text-amber-900/50 bg-amber-50 dark:bg-amber-500/10"
              : "text-teal-200 dark:text-teal-900/50 bg-teal-50 dark:bg-white/5"
          }`}
        >
          <PiggyBank
            className={`w-8 h-8 ${isProMode ? "text-amber-500" : "text-teal-400"}`}
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
          {isProMode
            ? "Aún no hay gastos en este proyecto"
            : "¡Tus finanzas están limpias!"}
        </h3>
        <p className="text-sm text-gray-500 max-w-xs">
          {isProMode
            ? "Añade gastos empresariales arriba para que comiencen a aparecer aquí."
            : "No se registran gastos recientes. Genial para tus ahorros."}
        </p>
      </div>
    );
  }

  // Group expenses by date
  const groupedExpenses = expenses.reduce(
    (groups, expense) => {
      const groupName = getRelativeDateGroup(expense.date);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(expense);
      return groups;
    },
    {} as Record<string, Expense[]>,
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar gasto"
        message="¿Estás seguro? Esta acción eliminará el gasto de tu registro."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Actividad Reciente</h2>
        <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500">
          Últimos {expenses.length}
        </span>
      </div>

      {Object.entries(groupedExpenses).map(([dateLabel, exps]) => (
        <div key={dateLabel} className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-teal-950/50 backdrop-blur-md z-10 py-1.5 px-3 rounded-lg inline-block w-fit">
            {dateLabel}
          </h3>

          <div className="flex flex-col gap-2">
            {exps.map((expense) => {
              const projectColor = getProjectColor(expense.projectId);

              return (
                <div
                  key={expense.id}
                  className={`group relative glass p-4 rounded-2xl flex items-center justify-between border border-gray-200/60 dark:border-transparent hover:border-primary-300 dark:hover:border-white/10 hover:shadow-md transition-all cursor-pointer overflow-hidden ${deletingId === expense.id ? "opacity-50 scale-[0.98]" : ""}`}
                  onClick={() => setEditingExpense(expense)}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${projectColor ? "bg-white/10 dark:bg-white/5" : getCategoryConfig(expense.categoryId).bgClass} ${projectColor ? "" : getCategoryConfig(expense.categoryId).textClass}`}
                      style={
                        projectColor
                          ? {
                              color: projectColor,
                              borderColor: `${projectColor}33`,
                              borderWidth: "2px",
                            }
                          : {}
                      }
                    >
                      {(() => {
                        const Icon = getCategoryConfig(expense.categoryId).icon;
                        return <Icon className="w-5 h-5" />;
                      })()}
                    </div>

                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">
                        {expense.description}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="opacity-80">
                          {new Date(expense.date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {/* Visual Cue: Reimbursable Badge */}
                        {expense.isReimbursable && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <Briefcase className="w-3 h-3" />
                              Empresa
                            </span>
                          </>
                        )}

                        {/* Paid Badge */}
                        {expense.status === "paid" && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-medium tracking-wide">
                              <CheckCircle2 className="w-3 h-3" />
                              Reembolsado
                            </span>
                          </>
                        )}

                        {/* Project Name Badge indicator for Pro Mode views */}
                        {isProMode && projectColor && (
                          <>
                            <span>•</span>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: projectColor }}
                              title="Proyecto Asignado"
                            ></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10">
                    <div className="text-right">
                      <span
                        className={`font-bold block ${expense.type === "income" ? "text-emerald-500" : "text-gray-900 dark:text-white"}`}
                      >
                        {expense.type === "income" ? "+" : ""}
                        {expense.currency === "EUR" ? "€" : "$"}
                        {(expense.amount / 100).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {expense.currency}
                      </span>
                    </div>
                    {/* Delete Action (Revealed on hover on desktop, or simple button. For PWA, a simple icon button is effective) */}
                    <button
                      onClick={(e) => handleDelete(expense.id, e)}
                      className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      <EditExpenseModal
        expense={editingExpense}
        isOpen={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
      />
    </div>
  );
}
