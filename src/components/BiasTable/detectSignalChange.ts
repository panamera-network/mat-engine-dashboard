// detectSignalChange.ts
import { pushNarrative } from "../Notification/pushNarrative";
import { pushSystemLog } from "../Notification/pushSystemLog";
import { logError } from "../Notification/logError";

type SignalMode = "scalping" | "swing";


export function detectSignalChange(
  symbol: string,
  mode: SignalMode,
  currentSignal: string,
  confidence: number,
  prevSignal: string | undefined,
  cooldownRef: React.MutableRefObject<Record<string, number>>,
  cooldownMs: number = 30_000
) {
  const now = Date.now();
  const cooldownKey = `${symbol}_${mode}`;
  const lastPing = cooldownRef.current[cooldownKey] ?? 0;
  const direction: "neutral" | "bullish" | "bearish" =
  currentSignal.toLowerCase() === "uptrend"
    ? "bullish"
    : currentSignal.toLowerCase() === "downtrend"
    ? "bearish"
    : "neutral";


  if (!prevSignal || prevSignal === currentSignal || now - lastPing < cooldownMs) return;

  try {
    pushNarrative(
    "notification",
    symbol,
    direction,
    confidence > 60 ? "rising" : confidence < 40 ? "fading" : "unclear",
    confidence > 70 ? "high" : confidence < 30 ? "low" : "moderate",
    Math.round(confidence),
    { source: "BiasTable", trigger: "signalChange", timeframe: mode }
    );


    pushSystemLog("heartbeat", `${mode} signal changed: ${prevSignal} → ${currentSignal}`, {
      source: "BiasTable",
      symbol,
      strength: confidence,
    });

    cooldownRef.current[cooldownKey] = now;
  } catch (err) {
    logError("BiasTable", `Failed to inject ${mode} signal change for ${symbol}`, err, {
      symbol,
      prevSignal,
      currentSignal,
    });
  }
}
