import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { Expense } from "../../../lib/db";
import { CATEGORIES } from "../../../lib/categories";

interface CategoryPieChartProps {
  expenses: Expense[];
}

export default function CategoryPieChart({ expenses }: CategoryPieChartProps) {
  const chartData = useMemo(() => {
    // Group expressions by category
    const totals: Record<string, number> = {};

    expenses.forEach((exp) => {
      // Calculate amount in a base way (e.g. keeping it simple without multi-currency for the visual chart for now,
      // or assuming all are tracked in same magnitude. To be perfect we'd convert, but for Phase A we group raw amounts).
      const amt = exp.amount / 100;
      const catId = exp.categoryId || "other";

      if (!totals[catId]) {
        totals[catId] = 0;
      }
      totals[catId] += amt;
    });

    // Format for Recharts
    return Object.entries(totals)
      .map(([catId, total]) => {
        const catDef =
          CATEGORIES[catId as keyof typeof CATEGORIES] || CATEGORIES.other;
        return {
          name: catDef.label,
          value: total,
          color: catDef.color,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort highest first
  }, [expenses]);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 min-h-[250px]">
        <p className="text-sm font-medium">No hay suficientes datos</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
            contentStyle={{
              borderRadius: "1rem",
              border: "none",
              boxShadow:
                "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              color: "#1f2937",
              fontWeight: "bold",
            }}
            itemStyle={{ color: "#374151" }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
