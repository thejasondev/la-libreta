import { useState, useRef, useEffect } from "react";
import { db } from "../../lib/db";
import {
  $currentProject,
  recalculateDailyTotal,
  $isProfessionalMode,
} from "../../store/appStore";
import { useStore } from "@nanostores/react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckSquare,
  Coins,
  ChevronDown,
} from "lucide-react";
import { showToast } from "../../store/toastStore";
import {
  CATEGORY_LIST,
  type CategoryId,
  getCategoryConfig,
  detectCategory,
} from "../../lib/categories";

type Currency = "CUP" | "USD" | "EUR";
type Priority = "high" | "medium" | "low";
type ActiveTab = "expense" | "income" | "task";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [currency, setCurrency] = useState<Currency>("CUP");
  const [categoryId, setCategoryId] = useState<CategoryId>("other");
  const [manualOverride, setManualOverride] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [priority, setPriority] = useState<Priority>("medium");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject = useStore($currentProject);
  const isProMode = useStore($isProfessionalMode);

  const isFinancialTab = activeTab === "expense" || activeTab === "income";

  // Auto-detect category from description (unless manually overridden)
  useEffect(() => {
    if (isFinancialTab && !manualOverride) {
      setCategoryId(detectCategory(description));
    }
  }, [description, activeTab, manualOverride]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowCatDropdown(false);
      }
    };
    if (showCatDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCatDropdown]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      const baseRecord = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };

      if (isFinancialTab) {
        const amountCents = Math.round(parseFloat(amount || "0") * 100);
        if (amountCents <= 0) {
          showToast("Ingresa un monto válido", "warning");
          return;
        }

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
          type: activeTab as "expense" | "income",
          date: new Date().toISOString(),
          categoryId,
          tags,
          isProfessional: isProMode,
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
      setCategoryId("other");
      setManualOverride(false);
    } catch (e) {
      console.error("Failed to save entry", e);
      showToast("Hubo un error al guardar tu entrada", "error");
    }
  };

  const currencySymbols = {
    CUP: "cu",
    USD: "$",
    EUR: "€",
  };

  const currentCat = getCategoryConfig(categoryId);
  const CatIcon = currentCat.icon;

  // Tab configuration — in Pro mode, no Income tab
  const tabs: {
    id: ActiveTab;
    label: string;
    icon: typeof ArrowDownCircle;
    color: string;
  }[] = isProMode
    ? [
        {
          id: "expense",
          label: "Gasto",
          icon: ArrowDownCircle,
          color: "text-primary-500",
        },
        {
          id: "task",
          label: "Tarea",
          icon: CheckSquare,
          color: "text-primary-500",
        },
      ]
    : [
        {
          id: "expense",
          label: "Gasto",
          icon: ArrowDownCircle,
          color: "text-red-500",
        },
        {
          id: "income",
          label: "Ingreso",
          icon: ArrowUpCircle,
          color: "text-emerald-500",
        },
        {
          id: "task",
          label: "Tarea",
          icon: CheckSquare,
          color: "text-primary-500",
        },
      ];

  // Dynamic button styling
  const submitButtonClass =
    activeTab === "income"
      ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
      : "bg-primary-500 hover:bg-primary-600 shadow-primary-500/20";

  const submitLabel =
    activeTab === "task"
      ? "Registrar"
      : activeTab === "income"
        ? "Registrar"
        : "Registrar";

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {/* Unified Tabs: Gasto | Ingreso | Tarea  */}
      <div className="flex p-1 mt-6 bg-gray-200/50 dark:bg-teal-900/50 rounded-xl w-fit mx-auto md:mx-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive
                  ? `bg-white dark:bg-teal-800 shadow-sm ${tab.color}`
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSave}
        className="glass p-4 rounded-2xl flex flex-col gap-3"
      >
        <div className="flex flex-col md:flex-row gap-3">
          {isFinancialTab && (
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
                        ? activeTab === "income"
                          ? "bg-emerald-500 text-white"
                          : "bg-primary-500 text-white"
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-semibold text-sm">
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
                  className="w-full bg-white/50 dark:bg-teal-900/50 text-gray-900 dark:text-white px-4 py-3 pl-11 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5"
                />
              </div>
            </div>
          )}

          {/* Description Input */}
          <div className="flex-1">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                activeTab === "income"
                  ? "Ej. Salario, Freelance, Venta..."
                  : activeTab === "expense"
                    ? "Ej. Comida, Uber, Netflix..."
                    : "Ej. Tarea de hoy"
              }
              required
              className="w-full bg-white/50 dark:bg-teal-900/50 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5"
            />
          </div>

          <button
            type="submit"
            className={`px-6 py-3 ${submitButtonClass} active:scale-95 text-white font-bold rounded-xl transition-all whitespace-nowrap shadow-md`}
          >
            {submitLabel}
          </button>
        </div>

        {/* Bottom options row */}
        <div className="flex flex-wrap items-center gap-3 px-1">
          {/* Auto-detected Category Chip (financial tabs only) */}
          {isFinancialTab && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowCatDropdown(!showCatDropdown)}
                className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${currentCat.bgClass} ${currentCat.textClass} border-transparent hover:shadow-sm active:scale-95`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{currentCat.label}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Clean Override Dropdown — icon + label */}
              {showCatDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-52 max-h-56 overflow-y-auto p-1.5 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200/60 dark:border-white/10 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {CATEGORY_LIST.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(cat.id);
                          setManualOverride(true);
                          setShowCatDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? `${cat.bgClass} ${cat.textClass} font-semibold`
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cat.bgClass} ${cat.textClass}`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Priority Selector (Task tab only) */}
          {activeTab === "task" && (
            <div className="flex items-center gap-2">
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

          {isProMode && isFinancialTab && (
            <label className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
              <input
                type="checkbox"
                checked={isReimbursable}
                onChange={(e) => setIsReimbursable(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white/50 dark:bg-teal-900/50"
              />
              <Coins className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Reembolsable
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
