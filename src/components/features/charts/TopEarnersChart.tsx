import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
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
        name: name.length > 20 ? name.substring(0, 20) + "..." : name,
        fullName: name,
        value: data.total,
        quantity: data.quantity,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5
  }, [sales]);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 min-h-[250px]">
        <p className="text-sm font-medium">No hay ventas registradas</p>
      </div>
    );
  }

  // Emerald colors that fit the app theme
  const colors = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-teal-950/95 backdrop-blur-sm p-4 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-white/5 font-bold text-sm">
          <p className="mb-1 text-gray-900 dark:text-white">{data.fullName}</p>
          <p className="text-emerald-500 font-black text-xl">
            ${data.value.toFixed(2)}
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs font-semibold uppercase tracking-wider">
            {data.quantity}{" "}
            {data.quantity === 1 ? "venta / brindado" : "ventas / brindados"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[250px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
            stroke="#e5e7eb"
            strokeOpacity={0.2}
          />
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
            width={110}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--color-primary-50)", opacity: 0.1 }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
