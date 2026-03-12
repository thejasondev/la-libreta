import { useState, useEffect, useRef } from "react";
import { db, type Expense } from "../../lib/db";
import { recalculateDailyTotal } from "../../store/appStore";
import {
  X,
  Save,
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { showToast } from "../../store/toastStore";
import {
  CATEGORY_LIST,
  type CategoryId,
  getCategoryConfig,
  detectCategory,
} from "../../lib/categories";

type Currency = "CUP" | "USD" | "EUR";

interface EditExpenseModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditExpenseModal({
  expense,
  isOpen,
  onClose,
}: EditExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState<Currency>("CUP");
  const [categoryId, setCategoryId] = useState<CategoryId>("other");
  const [manualOverride, setManualOverride] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [date, setDate] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Populate form when expense changes
  useEffect(() => {
    if (expense) {
      setAmount((expense.amount / 100).toFixed(2));
      setDescription(expense.description);
      setCurrency(expense.currency);
      setCategoryId((expense.categoryId as CategoryId) || "other");
      setManualOverride(true);
      setDate(new Date(expense.date).toISOString().split("T")[0]);
      setType(expense.type || "expense");
    }
  }, [expense]);

  // Auto-detect category when typing (only if not manually set)
  useEffect(() => {
    if (!manualOverride && description) {
      setCategoryId(detectCategory(description));
    }
  }, [description, manualOverride]);

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

  if (!isOpen || !expense) return null;

  const handleSave = async () => {
    if (!description.trim()) {
      showToast("La descripción no puede estar vacía", "warning");
      return;
    }

    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (amountCents <= 0) {
      showToast("Ingresa un monto válido", "warning");
      return;
    }

    try {
      await db.expenses.update(expense.id, {
        amount: amountCents,
        description: description.trim(),
        currency,
        categoryId,
        type,
        date: new Date(date).toISOString(),
      });

      await recalculateDailyTotal();
      showToast(
        type === "income" ? "Ingreso actualizado" : "Gasto actualizado",
        "success",
      );
      onClose();
    } catch (err) {
      console.error("Failed to update expense", err);
      showToast("Error al actualizar el gasto", "error");
    }
  };

  const currentCat = getCategoryConfig(categoryId);
  const CatIcon = currentCat.icon;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal — centered on all screens, scrollable */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 fade-in duration-200 border border-gray-200/60 dark:border-white/10 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {type === "income" ? "Editar Ingreso" : "Editar Gasto"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-white/5"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle: Gasto / Ingreso */}
        <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              type === "expense"
                ? "bg-white dark:bg-gray-800 shadow-sm text-red-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            Gasto
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              type === "income"
                ? "bg-white dark:bg-gray-800 shadow-sm text-emerald-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            Ingreso
          </button>
        </div>

        {/* Amount + Currency */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
            Monto
          </label>
          <div className="flex gap-2">
            <div className="flex items-center bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200/60 dark:border-white/5 overflow-hidden shrink-0">
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
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              title="Monto"
              placeholder="0.00"
              className="flex-1 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5 text-lg font-bold"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
            Descripción
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setManualOverride(false);
            }}
            title="Descripción"
            placeholder="Ej. Comida, Uber..."
            className="w-full bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
            Categoría
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowCatDropdown(!showCatDropdown)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${currentCat.bgClass} ${currentCat.textClass} border-gray-200/60 dark:border-white/5 hover:shadow-sm`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${currentCat.bgClass} ${currentCat.textClass}`}
              >
                <CatIcon className="w-4.5 h-4.5" />
              </span>
              <span className="flex-1 text-left">{currentCat.label}</span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </button>

            {showCatDropdown && (
              <div className="absolute top-full left-0 mt-1 w-full max-h-48 overflow-y-auto p-1.5 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200/60 dark:border-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            title="Fecha"
            className="w-full bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 transition-all active:scale-95 shadow-md shadow-primary-500/20 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
