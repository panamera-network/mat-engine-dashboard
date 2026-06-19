import "./chart_setup";
import { Bar } from "react-chartjs-2";
import { buildCurrencyStrengthData, toMutableChartData } from "./csm_builder";
import baselineLabelPlugin from "./csm_plugin";
import { useStore } from "../system/store";
import { theme } from "../../theme";

export default function CurrencyStrengthChart() {
  const strengths = useStore((s) => s.strengths);

  const lockedData = buildCurrencyStrengthData(strengths);
  const chartData = toMutableChartData(lockedData);

  const options = {
    plugins: {
      legend: { display: false },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { display: false },
        grid: { drawTicks: false, color: theme.colors.grid },
      },
      y: {
        min: -100,
        max: 100,
        grid: { color: theme.colors.grid },
        ticks: { color: theme.colors.textDim },
      },
    },
  };

  return (
    <div
  style={{
    display: "flex",
    flexDirection: "column",
    flex: 1,                // 🔑 expand to fill parent
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.grid}`,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    minHeight: 0,           // 🔑 prevents flex overflow
  }}
>
      <Bar data={chartData} options={options} plugins={[baselineLabelPlugin]} />
    </div>
  );
}
