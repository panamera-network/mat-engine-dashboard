/** Standard technical indicators */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface IndicatorData {
  type: string;
  data: IndicatorPoint[];
  color?: string;
  lineWidth?: number;
}

// Simple Moving Average
export function calculateSMA(candles: Candle[], period: number): IndicatorData {
  const data: IndicatorPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0);
    data.push({ time: candles[i].time, value: sum / period });
  }
  return { type: `SMA(${period})`, data, color: "#53c8ff", lineWidth: 1 };
}

// Exponential Moving Average
export function calculateEMA(candles: Candle[], period: number): IndicatorData {
  const data: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);
  let ema = 0;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      ema = candles[i].close;
    } else {
      ema = candles[i].close * multiplier + ema * (1 - multiplier);
    }
    if (i >= period - 1) {
      data.push({ time: candles[i].time, value: ema });
    }
  }

  return { type: `EMA(${period})`, data, color: "#f4be59", lineWidth: 2 };
}

// Bollinger Bands
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDev: number = 2
) {
  const bands = { upper: [] as IndicatorPoint[], middle: [] as IndicatorPoint[], lower: [] as IndicatorPoint[] };

  for (let i = period - 1; i < candles.length; i++) {
    const prices = candles.slice(i - period + 1, i + 1).map((c) => c.close);
    const mean = prices.reduce((s, p) => s + p, 0) / period;
    const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);

    const time = candles[i].time;
    bands.middle.push({ time, value: mean });
    bands.upper.push({ time, value: mean + std * stdDev });
    bands.lower.push({ time, value: mean - std * stdDev });
  }

  return {
    type: `BB(${period},${stdDev})`,
    upper: { ...bands.upper, color: "#ff6b6b" },
    middle: { ...bands.middle, color: "#53c8ff" },
    lower: { ...bands.lower, color: "#3bd389" },
  };
}

// RSI (Relative Strength Index)
export function calculateRSI(candles: Candle[], period: number = 14): IndicatorData {
  const data: IndicatorPoint[] = [];
  const changes = [];

  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  for (let i = period; i < changes.length; i++) {
    const gains = changes.slice(i - period, i).filter((c) => c > 0).reduce((s, c) => s + c, 0);
    const losses = changes.slice(i - period, i).filter((c) => c < 0).reduce((s, c) => s + Math.abs(c), 0);

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    data.push({ time: candles[i].time, value: rsi });
  }

  return { type: `RSI(${period})`, data, color: "#9d6bff", lineWidth: 2 };
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(candles: Candle[], fast: number = 12, slow: number = 26, signal: number = 9) {
  const emaFast = calculateEMA(candles, fast);
  const emaSlow = calculateEMA(candles, slow);

  const macdLine: IndicatorPoint[] = [];
  let fi = 0,
    si = 0;

  for (let i = 0; i < candles.length; i++) {
    if (fi < emaFast.data.length && emaFast.data[fi].time === candles[i].time) {
      if (si < emaSlow.data.length && emaSlow.data[si].time === candles[i].time) {
        macdLine.push({ time: candles[i].time, value: emaFast.data[fi].value - emaSlow.data[si].value });
        fi++;
        si++;
      } else {
        fi++;
      }
    }
  }

  const signalLine = calculateEMA(
    macdLine.map((p) => ({ time: p.time, open: p.value, high: p.value, low: p.value, close: p.value })),
    signal
  );

  const histogram: IndicatorPoint[] = [];
  for (const ml of macdLine) {
    const sl = signalLine.data.find((p) => p.time === ml.time);
    if (sl) {
      histogram.push({ time: ml.time, value: ml.value - sl.value });
    }
  }

  return {
    type: `MACD(${fast},${slow},${signal})`,
    macd: { data: macdLine, color: "#53c8ff", lineWidth: 2 },
    signal: { data: signalLine.data, color: "#ff6b6b", lineWidth: 1 },
    histogram: { data: histogram, color: "#3bd389", type: "histogram" },
  };
}

// Volume
export function calculateVolume(candles: Candle[]): IndicatorData {
  const data = candles.map((c) => ({ time: c.time, value: c.volume ?? 0 }));
  return { type: "Volume", data, color: "#a9b4c9", lineWidth: 1 };
}

// Generic indicator registry
export const INDICATOR_REGISTRY = {
  "SMA-20": () => ({ fn: calculateSMA, params: [20] }),
  "SMA-50": () => ({ fn: calculateSMA, params: [50] }),
  "SMA-200": () => ({ fn: calculateSMA, params: [200] }),
  "EMA-12": () => ({ fn: calculateEMA, params: [12] }),
  "EMA-26": () => ({ fn: calculateEMA, params: [26] }),
  "Bollinger Bands": () => ({ fn: calculateBollingerBands, params: [20, 2] }),
  "RSI": () => ({ fn: calculateRSI, params: [14] }),
  "MACD": () => ({ fn: calculateMACD, params: [12, 26, 9] }),
  "Volume": () => ({ fn: calculateVolume, params: [] }),
} as const;

export type IndicatorKey = keyof typeof INDICATOR_REGISTRY;
