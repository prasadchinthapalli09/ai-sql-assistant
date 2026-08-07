import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

const PALETTE = [
  "#6366f1", "#22d3ee", "#f472b6", "#fbbf24", "#34d399",
  "#a78bfa", "#fb923c", "#60a5fa", "#f87171", "#4ade80",
];

export default function ChartRenderer({ chart, rows }) {
  const { type, xKey, yKey } = chart || {};

  const data = useMemo(() => {
    if (!rows?.length || !xKey || !yKey) return null;

    const labels = rows.map((r) => String(r[xKey]));
    const values = rows.map((r) => parseFloat(r[yKey]) || 0);

    if (type === "scatter") {
      return {
        datasets: [
          {
            label: `${xKey} vs ${yKey}`,
            data: rows.map((r) => ({ x: parseFloat(r[xKey]) || 0, y: parseFloat(r[yKey]) || 0 })),
            backgroundColor: "#6366f1",
          },
        ],
      };
    }

    return {
      labels,
      datasets: [
        {
          label: yKey,
          data: values,
          backgroundColor: type === "pie" ? PALETTE : "#6366f1",
          borderColor: type === "line" ? "#6366f1" : undefined,
          tension: 0.35,
          fill: type === "line" ? false : undefined,
        },
      ],
    };
  }, [rows, xKey, yKey, type]);

  if (!type || type === "table" || !data) {
    return null;
  }

  const options = { responsive: true, plugins: { legend: { display: type === "pie" } } };

  return (
    <div className="glass-card p-4 md:p-6">
      <div className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Auto-generated {type} chart
      </div>
      <div className="mx-auto max-w-2xl">
        {type === "bar" && <Bar data={data} options={options} />}
        {type === "line" && <Line data={data} options={options} />}
        {type === "pie" && <Pie data={data} options={options} />}
        {type === "scatter" && <Scatter data={data} options={options} />}
      </div>
    </div>
  );
}
