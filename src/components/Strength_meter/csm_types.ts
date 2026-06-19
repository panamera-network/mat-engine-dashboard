import type { ChartData } from 'chart.js';

// Strict shape for each strength entry
export interface Strength {
  currency: string;
  value: number;
}

// Internal locked type (readonly, length-safe)
export type LockedCurrencyStrengthData<L extends string, N extends number> = {
  labels: readonly L[] & { length: N };
  datasets: [
    {
      data: readonly number[] & { length: N };
      backgroundColor: readonly string[] & { length: N };
      borderRadius: number;
      borderSkipped: false;
    }
  ];
};

// Chart.js expects mutable arrays, so we alias that too
export type MutableCurrencyStrengthData = ChartData<'bar', number[], string>;
 
export interface BiasSignal {
  symbol: string;       // e.g. "EURUSD"
  bias: number;         // -1 to 1
  momentum: number;     // -1 to 1
  confidence: number;   // 0 to 1
}

export type Mode = 'scalping' | 'swing' | 'blend';

export interface BiasPoint {
  ts: number;
  bias: number;
  confidence: number;
  mode: "swing" | "scalp";
  escalations?: ("badge" | "push" | "slack" | "voice")[];
}