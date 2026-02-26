import { useLiveQuery } from "dexie-react-hooks";
import { db, type Expense } from "../../lib/db";
import { useStore } from "@nanostores/react";
import {
  $isProfessionalMode,
  $currentProject,
  recalculateDailyTotal,
} from "../../store/appStore";
import {
  Coffee,
  Car,
  ShoppingCart,
  Briefcase,
  FileText,
  PiggyBank,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useState } from "react";

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
    try {
      setDeletingId(id);
      await db.expenses.delete(id);
      recalculateDailyTotal(); // trigger nano store sync
    } catch (error) {
      console.error("Failed to delete", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Edit Placeholder (For Phase 5 or future implementation)
  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    alert("Función de edición en desarrollo.");
  };

  // Dynamic Lucide icon mapping based on NLP tags
  const getIconForTags = (tags: string[] = []) => {
    const tagString = tags.join(" ").toLowerCase();
    if (tagString.includes("cafe") || tagString.includes("comida"))
      return <Coffee className="w-5 h-5" />;
    if (
      tagString.includes("viaje") ||
      tagString.includes("taxi") ||
      tagString.includes("transporte")
    )
      return <Car className="w-5 h-5" />;
    if (tagString.includes("compra") || tagString.includes("super"))
      return <ShoppingCart className="w-5 h-5" />;
    if (tagString.includes("oficina") || tagString.includes("trabajo"))
      return <Briefcase className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />; // Fallback
  };

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
        <div className="w-16 h-16 mb-4 text-teal-200 dark:text-teal-900/50 flex items-center justify-center rounded-full bg-teal-50 dark:bg-white/5">
          <PiggyBank className="w-8 h-8 text-teal-400" />
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Actividad Reciente</h2>
        <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500">
          Últimos {expenses.length}
        </span>
      </div>

      {Object.entries(groupedExpenses).map(([dateLabel, exps]) => (
        <div key={dateLabel} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 capitalize drop-shadow-sm sticky top-0 bg-white/50 dark:bg-teal-950/50 backdrop-blur-md z-10 py-1 rounded-md px-1 inline-block w-fit">
            {dateLabel}
          </h3>

          <div className="flex flex-col gap-2">
            {exps.map((expense) => {
              const projectColor = getProjectColor(expense.projectId);

              return (
                <div
                  key={expense.id}
                  className={`group relative glass p-4 rounded-2xl flex items-center justify-between hover:bg-white/40 dark:hover:bg-white/10 transition-all cursor-pointer overflow-hidden ${deletingId === expense.id ? "opacity-50 scale-[0.98]" : ""}`}
                  // @ts-ignore
                  style={{ viewTransitionName: `expense-${expense.id}` }}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isProMode
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400"
                      }`}
                      style={
                        projectColor
                          ? {
                              backgroundColor: `${projectColor}33`,
                              color: projectColor,
                            }
                          : {}
                      }
                    >
                      {getIconForTags(expense.tags)}
                    </div>

                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
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
                    {/* Delete Action (Revealed on hover on desktop, or simple button. For PWA, a simple icon button is effective) */}
                    <button
                      onClick={(e) => handleDelete(expense.id, e)}
                      className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all sm:flex hidden"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="text-right">
                      <span className="font-bold text-gray-900 dark:text-white block">
                        {expense.currency === "EUR" ? "€" : "$"}
                        {(expense.amount / 100).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {expense.currency}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
