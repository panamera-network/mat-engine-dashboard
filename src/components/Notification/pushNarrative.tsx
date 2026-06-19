// pushNarrative.tsx
import { useLogStore } from "./logStore";
import { generateNarrative } from "./generateNarrative";
import { triggerPulse } from "../../ui/triggerPulse"

export type NarrativeLabel = "narrative" | "notification" | "verdictFlip";

export const pushNarrative = (
  label: NarrativeLabel,
  symbol: string,
  biasAlignment: "bullish" | "bearish" | "neutral",
  momentumState: "rising" | "fading" | "unclear",
  volatilityLevel: "high" | "low" | "moderate",
  confidenceScore: number,
  context: Record<string, any> = {}
) => {
  const logEvent = useLogStore.getState().logEvent;

  const message = generateNarrative(
    symbol,
    biasAlignment,
    momentumState,
    volatilityLevel,
    confidenceScore
  );

  const triggerType = context.trigger ?? label;

  const isSignal = triggerType === "signalChange";

  logEvent({
    type: isSignal ? "signal" : "notification",
    label,
    severity: "info",
    message,
    context: {
      ...context,
      symbol,
      biasAlignment,
      momentumState,
      volatilityLevel,
      confidenceScore,
      narrative: message,
    },
    source: "pushNarrative",
  });

  // ✅ Trigger pulse animation
  triggerPulse(symbol, context.trigger ?? label);
};
