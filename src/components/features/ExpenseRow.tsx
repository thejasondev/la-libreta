import { useState, useRef, useEffect } from "react";
import type { Expense } from "../../lib/db";
import { Trash2 } from "lucide-react";

interface ExpenseRowProps {
  expense: Expense;
  onDelete: (id: string) => void;
  getIconForTags: (tags: string[]) => React.ReactNode;
  getProjectColor?: (projectId?: string) => string | null;
  formatDate: (ts: string | number) => string;
}

export default function ExpenseRow({
  expense,
  onDelete,
  getIconForTags,
  getProjectColor,
  formatDate,
}: ExpenseRowProps) {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef<number | null>(null);

  // Threshold to trigger delete
  const triggerThreshold = -80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Only allow swipe left
    if (diff < 0) {
      setOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offset < triggerThreshold) {
      onDelete(expense.id);
    } else {
      setOffset(0);
    }
    startX.current = null;
  };

  const projColor = getProjectColor ? getProjectColor(expense.projectId) : null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-red-500 mb-3 group">
      {/* Delete Background (Revealed when swiping left) */}
      <div className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-end pr-6 text-white">
        <Trash2 className="w-5 h-5" />
      </div>

      {/* Foreground Row */}
      <div
        className={`relative w-full glass p-4 flex justify-between items-center transition-transform ${!isSwiping ? "duration-300 ease-out" : "duration-0"}`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-3 bg-gray-100 dark:bg-teal-900 rounded-xl text-gray-600 dark:text-gray-300">
            {getIconForTags(expense.tags || [])}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              {projColor && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: projColor }}
                  title="Proyecto Asociado"
                />
              )}
              {expense.description}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="capitalize">{formatDate(expense.date)}</span>
              {expense.tags && expense.tags.length > 0 && (
                <span className="opacity-70"> • #{expense.tags[0]}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right flex flex-col items-end">
            <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
              {expense.currency === "EUR" ? "€" : "$"}
              {(expense.amount / 100).toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {expense.currency}
            </span>
          </div>

          {/* Delete Action */}
          <button
            onClick={() => onDelete(expense.id)}
            className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
            title="Eliminar gasto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
