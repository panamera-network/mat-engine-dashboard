import type { UTCTimestamp } from "lightweight-charts";

export function normalizeTimeframe(tf: string): number {
  const lower = tf.toLowerCase().trim();
  if (lower.endsWith("m")) return parseInt(lower.replace("m", ""), 10);
  if (lower.endsWith("h")) return parseInt(lower.replace("h", ""), 10) * 60;
  if (lower.endsWith("d")) return parseInt(lower.replace("d", ""), 10) * 1440;
  const parsed = parseInt(lower, 10);
  return isNaN(parsed) ? 1 : parsed;
}

export function coerceToSeconds(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number")
    return raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
  if (typeof raw === "string")
    return Math.floor(new Date(raw).getTime() / 1000);
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if ("seconds" in obj) return Math.floor(Number(obj.seconds));
    if ("epoch" in obj) return Math.floor(Number(obj.epoch));
    if (typeof (obj as { valueOf?: () => number }).valueOf === "function") {
      return Math.floor(Number((obj as { valueOf: () => number }).valueOf()));
    }
  }
  return 0;
}

export function toCandleTime(
  tickTime: number,
  tfSeconds: number
): UTCTimestamp {
  return Math.floor(tickTime / tfSeconds) * tfSeconds as UTCTimestamp;
}
