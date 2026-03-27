import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Expense } from "../../lib/db";
import { useStore } from "@nanostores/react";
import { $isBusinessMode, recalculateDailyTotal } from "../../store/appStore";
import ExpenseRow from "./ExpenseRow";
import EditExpenseModal from "./EditExpenseModal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { History, ReceiptText, Calendar } from "lucide-react";

export default function ExpenseView() {
  const isBizMode = useStore($isBusinessMode);

  const [historyTab, setHistoryTab] = useState<"today" | "history">("today");
  const [timeFilter, setTimeFilter] = useState<
    "all" | "thisMonth" | "lastMonth"
  >("thisMonth");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const expenses =
    useLiveQuery(() => {
      return db.expenses.orderBy("date").reverse().toArray();
    }, []) || [];

  // Filter only current mode
  const modeExpenses = expenses.filter((exp) => exp.isBusiness === isBizMode);

  // Split into Today and Past
  const now = new Date();
  const todaySales = modeExpenses.filter((exp) => {
    const d = new Date(exp.date);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const pastSales = modeExpenses.filter((exp) => {
    const d = new Date(exp.date);
    return (
      d.getDate() !== now.getDate() ||
      d.getMonth() !== now.getMonth() ||
      d.getFullYear() !== now.getFullYear()
    );
  });

  // Client-side filtering for History Tab
  const filteredHistory = pastSales.filter((exp) => {
    const d = new Date(exp.date);
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
    return true;
  });

  // Group History by Date
  const groupedHistory = filteredHistory.reduce(
    (groups, exp) => {
      const d = new Date(exp.date);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      const label = isYesterday
        ? "Ayer"
        : d.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "short",
          });

      if (!groups[label]) groups[label] = [];
      groups[label].push(exp);
      return groups;
    },
    {} as Record<string, typeof filteredHistory>,
  );

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    await db.expenses.delete(expenseToDelete);
    await recalculateDailyTotal();
    setExpenseToDelete(null);
  };

  const formatDate = (ts: string | number) => {
    return new Date(ts).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Stats calculate based on ALL mode expenses to give a global view in the header
  const totalStatsExpenses = modeExpenses
    .filter((e) => !e.type || e.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalStatsIncome = modeExpenses
    .filter((e) => e.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
      {/* Header and Summary */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 glass p-5 rounded-2xl border border-gray-200/60 dark:border-primary-500/10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isBizMode ? "Costos y Ventas" : "Gastos e Ingresos"}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
            <span className="text-gray-500 dark:text-gray-400">
              {isBizMode ? "Costos Totales:" : "Gastos Totales:"}
            </span>
            <span className="font-bold text-red-400">
              -${(totalStatsExpenses / 100).toFixed(2)}
            </span>
            {totalStatsIncome > 0 && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {isBizMode ? "Ventas Totales:" : "Ingresos Totales:"}
                </span>
                <span className="font-bold text-emerald-500">
                  +${(totalStatsIncome / 100).toFixed(2)}
                </span>
                <span className="text-gray-400">·</span>
                <span
                  className={`font-bold ${totalStatsIncome - totalStatsExpenses >= 0 ? "text-emerald-500" : "text-red-400"}`}
                >
                  {isBizMode ? "Ganancia:" : "Neto:"}{" "}
                  {totalStatsIncome - totalStatsExpenses >= 0 ? "+" : ""}$
                  {((totalStatsIncome - totalStatsExpenses) / 100).toFixed(2)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs & View ── */}
      <div className="bg-white dark:bg-teal-950 p-5 md:p-6 rounded-2xl border border-gray-200/60 dark:border-white/8 shadow-sm">
        {/* Tab switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center bg-gray-100 dark:bg-teal-900/60 rounded-xl p-1 w-fit">
            <button
              onClick={() => setHistoryTab("today")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                historyTab === "today"
                  ? "bg-white dark:bg-teal-800 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              <ReceiptText className="w-3.5 h-3.5" />
              Hoy
            </button>
            <button
              onClick={() => setHistoryTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                historyTab === "history"
                  ? "bg-white dark:bg-teal-800 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Historial
            </button>
          </div>

          {/* Time Filter Pill Selector (Only visible in History tab) */}
          {historyTab === "history" && (
            <div className="flex items-center bg-gray-50 dark:bg-teal-900/40 rounded-xl border border-gray-200/60 dark:border-white/5 overflow-hidden w-fit">
              {[
                { value: "thisMonth" as const, label: "Este Mes" },
                { value: "lastMonth" as const, label: "Anterior" },
                { value: "all" as const, label: "Todo" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeFilter(opt.value)}
                  className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
                    timeFilter === opt.value
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

        {/* TODAY TAB */}
        {historyTab === "today" && (
          <div className="flex flex-col w-full">
            {todaySales.length === 0 ? (
              <div className="text-center py-8">
                <ReceiptText className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No hay movimientos registrados hoy.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {todaySales.map((exp) => (
                  <ExpenseRow
                    key={exp.id}
                    expense={exp}
                    onDelete={(id) => setExpenseToDelete(id)}
                    onEdit={(expense) => setEditingExpense(expense)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {historyTab === "history" && (
          <div className="flex flex-col w-full">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No se encontraron movimientos para estos filtros.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {Object.entries(groupedHistory).map(([dateLabel, exps]) => (
                  <div key={dateLabel} className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-teal-950/50 py-1.5 px-3 rounded-lg w-fit">
                      {dateLabel}
                    </h4>
                    {exps.map((exp) => (
                      <ExpenseRow
                        key={exp.id}
                        expense={exp}
                        onDelete={(id) => setExpenseToDelete(id)}
                        onEdit={(expense) => setEditingExpense(expense)}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditExpenseModal
        expense={editingExpense}
        isOpen={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!expenseToDelete}
        title="Eliminar Movimiento"
        message="¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer y afectará tu balance."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
}
