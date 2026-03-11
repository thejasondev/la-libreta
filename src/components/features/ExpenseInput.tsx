import { useState } from "react";
import { db } from "../../lib/db";
import {
  $currentProject,
  $isProfessionalMode,
  recalculateDailyTotal,
} from "../../store/appStore";
import { useStore } from "@nanostores/react";
import { Coins } from "lucide-react";
import { showToast } from "../../store/toastStore";

type Currency = "CUP" | "USD" | "EUR";

export default function ExpenseInput() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState<Currency>("CUP");
  const [isReimbursable, setIsReimbursable] = useState(false);

  const activeProject = useStore($currentProject);
  const isProMode = useStore($isProfessionalMode);

  const currencySymbols: Record<Currency, string> = {
    USD: "🇺🇸",
    EUR: "🇪🇺",
    CUP: "🇨🇺",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (amountCents <= 0) {
      showToast("Ingresa un monto válido", "warning");
      return;
    }

    try {
      const tags =
        description.match(/#\w+/g)?.map((t) => t.slice(1).toLowerCase()) || [];
      const cleanDesc = description
        .replace(/#\w+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      await db.expenses.add({
        id: crypto.randomUUID(),
        amount: amountCents,
        currency,
        description: cleanDesc,
        date: new Date().toISOString(),
        tags,
        isProfessional: isProMode,
        isReimbursable: isProMode ? isReimbursable : false,
        status: "pending",
        projectId: isProMode && activeProject ? activeProject.id : undefined,
        createdAt: Date.now(),
      });

      await recalculateDailyTotal();

      // Reset
      setAmount("");
      setDescription("");
      setIsReimbursable(false);
    } catch (err) {
      console.error("Failed to save expense", err);
      showToast("Error al registrar el gasto", "error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass p-4 rounded-2xl flex flex-col gap-3 border border-gray-200/60 dark:border-white/5"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Currency + Amount */}
        <div className="flex gap-2 sm:w-1/2">
          {/* Currency Pill Selector */}
          <div className="flex items-center bg-white/50 dark:bg-teal-900/50 rounded-xl border border-gray-200/60 dark:border-white/5 overflow-hidden shrink-0">
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

        {/* Description */}
        <div className="relative flex-1">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿En qué gastaste?"
            required
            className="w-full bg-white/50 dark:bg-teal-900/50 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold rounded-xl transition-all whitespace-nowrap shadow-md shadow-primary-500/20"
        >
          Registrar
        </button>
      </div>

      {/* Extra Options */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        {isProMode && (
          <label className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
            <input
              type="checkbox"
              checked={isReimbursable}
              onChange={(e) => setIsReimbursable(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white/50 dark:bg-teal-900/50"
            />
            <Coins className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
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
  );
}
