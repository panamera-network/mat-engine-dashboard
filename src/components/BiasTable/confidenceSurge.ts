import { pushNarrative } from "../Notification/pushNarrative";
import { pushSystemLog } from "../Notification/pushSystemLog";

export function detectConfidenceSurge(
  symbol: string,
  mode: "scalping" | "swing",
  currentConfidence: number,
  prevConfidence: number | undefined,
  threshold: number = 20
) {
  if (prevConfidence === undefined) return;
  const delta = currentConfidence - prevConfidence;

  if (delta >= threshold) {
    pushNarrative(
      "notification",
      symbol,
      "neutral",
      "rising",
      "high",
      Math.round(currentConfidence),
      { 
        source: "BiasTable", 
        trigger: "confidenceSurge", 
        timeframe: mode,
      }
    );

    pushSystemLog("heartbeat", `${mode} confidence surged +${delta}%`, {
      source: "BiasTable",
      symbol,
      delta,
      currentConfidence,
    });
  }
}
