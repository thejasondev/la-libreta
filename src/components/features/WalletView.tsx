import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type WalletTransaction } from "../../lib/db";
import {
  type Currency,
  CURRENCIES,
  CURRENCY_LIST,
  formatAmount,
} from "../../lib/currency";
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { showToast } from "../../store/toastStore";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function WalletView() {
  const [showForm, setShowForm] = useState(false);
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("CUP");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const transactions = useLiveQuery(
    () => db.walletTransactions.orderBy("date").reverse().limit(50).toArray(),
    [],
    [],
  );

  // Calculate balance per currency
  const balances = transactions.reduce(
    (acc, tx) => {
      const cur = tx.currency || "CUP";
      if (!acc[cur]) acc[cur] = 0;
      if (tx.type === "deposit") {
        acc[cur] += tx.amount;
      } else {
        acc[cur] -= tx.amount;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (amountCents <= 0) {
      showToast("Ingresa un monto válido", "warning");
      return;
    }

    // Check for overdraw
    if (txType === "withdrawal") {
      const currentBalance = balances[currency] || 0;
      if (amountCents > currentBalance) {
        showToast("Fondos insuficientes", "warning");
        return;
      }
    }

    try {
      await db.walletTransactions.add({
        id: crypto.randomUUID(),
        type: txType,
        amount: amountCents,
        currency,
        description:
          description.trim() || (txType === "deposit" ? "Depósito" : "Retiro"),
        date: new Date().toISOString(),
        createdAt: Date.now(),
      });

      showToast(
        `${txType === "deposit" ? "Depósito" : "Retiro"} de ${formatAmount(amountCents, currency)} registrado`,
        "success",
      );
      setAmount("");
      setDescription("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save transaction", err);
      showToast("Error al guardar", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.walletTransactions.delete(deleteTarget);
    setDeleteTarget(null);
    showToast("Movimiento eliminado", "success");
  };

  // Group transactions by relative date
  const grouped = transactions.reduce(
    (groups, tx) => {
      const d = new Date(tx.date);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      const label = isToday
        ? "Hoy"
        : isYesterday
          ? "Ayer"
          : d.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "short",
            });
      if (!groups[label]) groups[label] = [];
      groups[label].push(tx);
      return groups;
    },
    {} as Record<string, WalletTransaction[]>,
  );

  // Balance card gradients per currency
  const cardStyles: Record<string, string> = {
    CUP: "from-blue-500 to-blue-600",
    USD: "from-emerald-500 to-emerald-600",
    EUR: "from-indigo-500 to-indigo-600",
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar movimiento"
        message="¿Estás seguro de que quieres eliminar este movimiento?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CURRENCY_LIST.map((cur) => {
          const balance = balances[cur] || 0;
          const cfg = CURRENCIES[cur];
          return (
            <div
              key={cur}
              className={`relative overflow-hidden bg-gradient-to-br ${cardStyles[cur]} p-5 rounded-2xl text-white shadow-lg`}
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{cfg.flag}</span>
                  <span className="text-xs font-bold opacity-80 uppercase tracking-wider">
                    {cfg.label}
                  </span>
                </div>
                <p className="text-2xl font-black tabular-nums">
                  {cfg.symbol}
                  {(balance / 100).toFixed(2)}
                </p>
                <p className="text-[11px] opacity-70 mt-1 font-medium">
                  {balance > 0
                    ? "Disponible"
                    : balance < 0
                      ? "Saldo negativo"
                      : "Sin fondos"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setTxType("deposit");
            setShowForm(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-primary-500/20"
        >
          <ArrowDownCircle className="w-4 h-4" />
          Depositar
        </button>
        <button
          onClick={() => {
            setTxType("withdrawal");
            setShowForm(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-teal-900/40 hover:bg-gray-200 dark:hover:bg-teal-800/60 text-gray-900 dark:text-white font-bold rounded-xl transition-all active:scale-95 border border-gray-200/60 dark:border-white/8"
        >
          <ArrowUpCircle className="w-4 h-4" />
          Retirar
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-teal-950 p-5 rounded-2xl border border-primary-500/20 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {txType === "deposit" ? (
                <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowUpCircle className="w-4 h-4 text-red-400" />
              )}
              {txType === "deposit" ? "Depositar" : "Retirar"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                {CURRENCIES[currency].symbol}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 pl-8 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/8 text-lg font-bold"
                autoFocus
              />
            </div>
          </div>

          {/* Currency pills */}
          <div className="flex items-center bg-gray-50 dark:bg-teal-900/40 rounded-xl border border-gray-200/60 dark:border-white/8 overflow-hidden w-fit">
            {CURRENCY_LIST.map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(cur)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all ${
                  currency === cur
                    ? "bg-primary-500 text-white"
                    : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <span>{CURRENCIES[cur].flag}</span>
                {cur}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/8"
          />

          <button
            type="submit"
            className={`w-full py-3 font-bold rounded-xl transition-all active:scale-[0.98] text-white shadow-md ${
              txType === "deposit"
                ? "bg-primary-500 hover:bg-primary-600 shadow-primary-500/20"
                : "bg-red-500 hover:bg-red-600 shadow-red-500/20"
            }`}
          >
            {txType === "deposit" ? "Depositar" : "Retirar"}{" "}
            {amount && parseFloat(amount) > 0
              ? formatAmount(Math.round(parseFloat(amount) * 100), currency)
              : ""}
          </button>
        </form>
      )}

      {/* Transaction History */}
      <div className="bg-white dark:bg-teal-950 p-5 md:p-6 rounded-2xl border border-gray-200/60 dark:border-white/8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            Movimientos
          </h3>
          {transactions.length > 0 && (
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500">
              Últimos {transactions.length}
            </span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No hay movimientos registrados.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {Object.entries(grouped).map(([dateLabel, txs]) => (
              <div key={dateLabel} className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-teal-950/50 py-1.5 px-3 rounded-lg w-fit">
                  {dateLabel}
                </h4>
                {txs.map((tx) => {
                  const isDeposit = tx.type === "deposit";
                  const time = new Date(tx.date).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 group"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isDeposit ? "bg-emerald-500/10" : "bg-red-500/10"
                        }`}
                      >
                        {isDeposit ? (
                          <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowUpCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <span>{time}</span>
                          <span>·</span>
                          <span className="font-semibold">{tx.currency}</span>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-bold shrink-0 ${
                          isDeposit ? "text-emerald-500" : "text-red-400"
                        }`}
                      >
                        {isDeposit ? "+" : "-"}
                        {formatAmount(tx.amount, tx.currency)}
                      </span>
                      <button
                        onClick={() => setDeleteTarget(tx.id)}
                        className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
