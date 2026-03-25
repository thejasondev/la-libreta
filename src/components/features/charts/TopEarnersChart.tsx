import { useMemo } from "react";
import type { Sale } from "../../../lib/db";

interface TopEarnersChartProps {
  sales: Sale[];
}

export default function TopEarnersChart({ sales }: TopEarnersChartProps) {
  const chartData = useMemo(() => {
    const totals: Record<string, { total: number; quantity: number }> = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!totals[item.name]) totals[item.name] = { total: 0, quantity: 0 };
        totals[item.name].total += (item.quantity * item.unitPrice) / 100;
        totals[item.name].quantity += item.quantity;
      });
    });

    return Object.entries(totals)
      .map(([name, data]) => ({
        name,
        value: data.total,
        quantity: data.quantity,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [sales]);

  if (chartData.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 min-h-[200px]">
        <p className="text-sm font-medium">No hay ventas registradas</p>
      </div>
    );
  }

  const maxValue = chartData[0].value;

  // Teal gradient that matches the app primary
  const barColors = [
    "bg-primary-500",
    "bg-primary-400",
    "bg-primary-300",
    "bg-primary-200",
    "bg-primary-100",
  ];

  return (
    <div className="flex flex-col gap-4 mt-2">
      {chartData.map((item, index) => {
        const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={item.name} className="flex flex-col gap-1.5">
            {/* Row: Name + Amount */}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {item.name}
              </span>
              <span className="text-sm font-black text-emerald-500 shrink-0 tabular-nums">
                ${item.value.toFixed(2)}
              </span>
            </div>
            {/* Bar + volume */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-6 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden">
                <div
                  className={`h-full rounded-lg ${barColors[index] || barColors[barColors.length - 1]} transition-all duration-500 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-16 text-right shrink-0 tabular-nums">
                {item.quantity} {item.quantity === 1 ? "venta" : "ventas"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
