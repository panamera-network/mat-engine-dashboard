// useVerdictFlipDetector.ts
import { useEffect, useRef } from "react";
import { pushNarrative } from "./Notification/pushNarrative";

export const useVerdictFlipDetector = (
  symbol: string,
  biasAlignment: "bullish" | "bearish" | "neutral",
  momentumState: "rising" | "fading" | "unclear",
  volatilityLevel: "high" | "low" | "moderate",
  confidenceScore: number,
  context: Record<string, any> = {}
) => {
  const prevBias = useRef<"bullish" | "bearish" | "neutral" | null>(null);

  useEffect(() => {
    if (prevBias.current && prevBias.current !== biasAlignment) {
      // ✅ Emit verdictFlip log
      pushNarrative(
        "verdictFlip",
        symbol,
        biasAlignment,
        momentumState,
        volatilityLevel,
        confidenceScore,
        {
          ...context,
          trigger: "signalChange",
          previousBias: prevBias.current,
        }
      );
    }

    prevBias.current = biasAlignment;
  }, [biasAlignment]);
};
