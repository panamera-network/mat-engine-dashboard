// Timeframe boundary between this dashboard's own lowercase timeframe
// strings ("1h", "4h", "1d" — see components/system/store.ts) and
// @mat/chart-core's Timeframe type ("1H", "4H", "1D"). Minute-suffixed
// values ("1m"/"5m"/"15m"/"30m") are identical in both formats, so only
// hour/day need remapping.
//
// This is intentionally the ONLY new timeframe mapping in this integration:
// the engine-format conversion (`toEngineTimeframe` in chartUtils.ts) already
// accepts either casing (it lowercases internally), so both this dashboard's
// own format and @mat/chart-core's format pass through it unchanged — no new
// engine-format mapping was needed.
//
// "1w" is intentionally excluded: normalizeTimeframe() (chartUtils.ts) does
// not parse a trailing "w" (an existing gap, not something this integration
// changes), and this dashboard's UI has never offered a weekly timeframe.
import type { Timeframe as ChartCoreTimeframe } from "@mat/chart-core";

export type DashboardTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const TO_CHART_CORE: Record<DashboardTimeframe, ChartCoreTimeframe> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1H",
  "4h": "4H",
  "1d": "1D",
};

const TO_DASHBOARD: Record<string, DashboardTimeframe> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
};

export const TERMINAL_TIMEFRAMES: readonly ChartCoreTimeframe[] = [
  "1m",
  "5m",
  "15m",
  "1H",
  "4H",
  "1D",
];

export function toChartCoreTimeframe(tf: DashboardTimeframe): ChartCoreTimeframe {
  return TO_CHART_CORE[tf] ?? (tf as unknown as ChartCoreTimeframe);
}

export function toDashboardTimeframe(tf: ChartCoreTimeframe | string): DashboardTimeframe {
  return TO_DASHBOARD[tf] ?? (tf.toLowerCase() as DashboardTimeframe);
}
