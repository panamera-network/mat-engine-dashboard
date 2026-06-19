//indicators.ts
export interface Candle {
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calcCCI(data: Candle[], period = 20): number | undefined {
  if (data.length < period) return undefined;

  // Slice last N candles
  const slice = data.slice(-period);

  // Typical prices
  const tps = slice.map(c => (c.high + c.low + c.close) / 3);

  // SMA of typical prices
  const sma = tps.reduce((a, b) => a + b, 0) / period;

  // Mean deviation
  const md =
    tps.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;

  if (md === 0) return 0;

  // Current TP is last one
  const currentTP = tps[tps.length - 1];

  return (currentTP - sma) / (0.015 * md);
}

export function calcVolatility(data: Candle[], period = 20): number {
  if (data.length < period) return 0;

  const slice = data.slice(-period);
  const closes = slice.map(c => c.close);

  const mean =
    closes.reduce((sum, v) => sum + v, 0) / closes.length;

  const variance =
    closes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    closes.length;

  const stdDev = Math.sqrt(variance);

  // Normalize to 0–100 scale for your gauge
  return Math.min(100, (stdDev / mean) * 1000);
}

// Average volume over N candles
export function calcAvgVolume(data: Candle[], period = 20): number {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  const total = slice.reduce((sum, c) => sum + (c as any).volume, 0);
  return total / period;
}