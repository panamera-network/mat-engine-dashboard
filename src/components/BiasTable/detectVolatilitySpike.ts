import { pushNarrative } from "../Notification/pushNarrative";
import { pushSystemLog } from "../Notification/pushSystemLog";

export function detectVolatilitySpike(
  symbol: string,
  mode: "scalping" | "swing",
  momentum: number,
  threshold: number = 80
) {
  if (momentum < threshold) return;

  pushNarrative(
    "notification",
    symbol,
    "neutral", // valid BiasDirection
    "rising",
    "high",
    Math.round(momentum),
    {
      source: "BiasTable",
      trigger: "volatilitySpike",
      timeframe: mode,
    }
  );

  pushSystemLog("heartbeat", `${mode} volatility spike: ${momentum}%`, {
    source: "BiasTable",
    symbol,
    momentum,
  });
}
