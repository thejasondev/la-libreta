import { useState } from "react";
import { db } from "../../lib/db";
import {
  $currentProject,
  recalculateDailyTotal,
  $isProfessionalMode,
} from "../../store/appStore";
import { useStore } from "@nanostores/react";
import { Receipt, CheckSquare, Building2, Coins } from "lucide-react";
import { showToast } from "../../store/toastStore";

type Currency = "CUP" | "USD" | "EUR";
type Priority = "high" | "medium" | "low";

const priorityConfig: Record<
  Priority,
  { label: string; color: string; activeColor: string }
> = {
  high: {
    label: "Urgente",
    color: "text-red-400",
    activeColor: "bg-red-500 text-white",
  },
  medium: {
    label: "Media",
    color: "text-primary-500",
    activeColor: "bg-primary-500 text-white",
  },
  low: {
    label: "Baja",
    color: "text-emerald-400",
    activeColor: "bg-emerald-500 text-white",
  },
};

export default function QuickEntry() {
  const [activeTab, setActiveTab] = useState<"expense" | "task">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [currency, setCurrency] = useState<Currency>("CUP");
  const [priority, setPriority] = useState<Priority>("medium");

  const activeProject = useStore($currentProject);
  const isProMode = useStore($isProfessionalMode);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      const baseRecord = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };

      if (activeTab === "expense") {
        const amountCents = Math.round(parseFloat(amount || "0") * 100);
        if (amountCents <= 0) {
          showToast("Ingresa un monto válido", "warning");
          return;
        }

        // Auto-extract tags from description natively (words starting with #)
        const tags =
          description.match(/#\w+/g)?.map((t) => t.slice(1).toLowerCase()) ||
          [];
        const cleanDesc = description
          .replace(/#\w+/g, "")
          .replace(/\s+/g, " ")
          .trim();

        await db.expenses.add({
          ...baseRecord,
          amount: amountCents,
          currency: currency,
          description: cleanDesc,
          date: new Date().toISOString(),
          tags,
          isProfessional: isProMode, // Strict isolation
          isReimbursable: isProMode ? isReimbursable : false,
          status: "pending",
          projectId: isProMode && activeProject ? activeProject.id : undefined,
        });

        await recalculateDailyTotal();
      } else {
        await db.tasks.add({
          ...baseRecord,
          title: description.trim(),
          completed: false,
          priority,
          isProfessional: isProMode,
          projectId: isProMode && activeProject ? activeProject.id : undefined,
          dueDate: new Date().toISOString(),
        });
      }

      // Reset
      setAmount("");
      setDescription("");
      setIsReimbursable(false);
      setPriority("medium");
    } catch (e) {
      console.error("Failed to save entry", e);
      showToast("Hubo un error al guardar tu entrada", "error");
    }
  };

  const currencySymbols = {
    CUP: "🇨🇺",
    USD: "🇺🇸",
    EUR: "🇪🇺",
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex p-1 bg-gray-200/50 dark:bg-teal-900/50 rounded-xl w-fit mx-auto md:mx-0">
        <button
          type="button"
          onClick={() => setActiveTab("expense")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "expense"
              ? "bg-white dark:bg-teal-800 shadow-sm text-primary-500"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("task")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "task"
              ? "bg-white dark:bg-teal-800 shadow-sm text-primary-500"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tarea
        </button>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSave}
        className="glass p-4 rounded-2xl flex flex-col gap-3"
      >
        <div className="flex flex-col md:flex-row gap-3">
          {activeTab === "expense" && (
            <div className="flex gap-2 md:w-1/2">
              {/* Currency Pill Selector */}
              <div className="flex items-center bg-white/50 dark:bg-teal-900/50 rounded-xl border border-transparent dark:border-white/5 overflow-hidden shrink-0">
                {(["CUP", "USD", "EUR"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-2.5 text-[11px] font-extrabold tracking-wide transition-all ${
                      currency === c
                        ? "bg-primary-500 text-white"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                    title={c}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Amount Input */}
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                  {currencySymbols[currency]}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-white/50 dark:bg-teal-900/50 text-gray-900 dark:text-white px-4 py-3 pl-8 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5"
                />
              </div>
            </div>
          )}

          <div className="relative flex-1">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                activeTab === "expense"
                  ? "Ej. Gasto de hoy"
                  : "Ej. Tarea de hoy"
              }
              required
              className="w-full bg-white/50 dark:bg-teal-900/50 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold rounded-xl transition-all whitespace-nowrap shadow-md shadow-primary-500/20"
          >
            {activeTab === "expense" ? "Registrar Gasto" : "Registrar Tarea"}
          </button>
        </div>

        {/* Priority Selector (Task tab only) */}
        {activeTab === "task" && (
          <div className="flex items-center gap-3 px-1">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              Prioridad:
            </span>
            <div className="flex items-center bg-white/50 dark:bg-teal-900/50 rounded-xl border border-gray-200/60 dark:border-white/5 overflow-hidden">
              {(["high", "medium", "low"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-2.5 py-1.5 text-[10px] font-bold tracking-wide transition-all ${
                    priority === p
                      ? priorityConfig[p].activeColor
                      : `${priorityConfig[p].color} hover:opacity-80`
                  }`}
                  title={priorityConfig[p].label}
                >
                  {priorityConfig[p].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Extra Options Row */}
        <div className="flex flex-wrap items-center gap-4 px-1">
          {isProMode && activeTab === "expense" && (
            <label className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
              <input
                type="checkbox"
                checked={isReimbursable}
                onChange={(e) => setIsReimbursable(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white/50 dark:bg-teal-900/50"
              />
              <Building2 className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Gasto reembosable (Business)
              </span>
            </label>
          )}

          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider ml-auto">
            {isProMode
              ? "Guardando en Modo Profesional"
              : "Guardando en Modo Personal"}
          </div>
        </div>
      </form>
    </div>
  );
}
