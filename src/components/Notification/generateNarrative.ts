export function generateNarrative(
  symbol: string,
  biasAlignment: "bullish" | "bearish" | "neutral",
  momentumState: "rising" | "fading" | "unclear",
  volatilityLevel: "high" | "low" | "moderate",
  confidenceScore: number
): string {
  let narrative = `${symbol} bias is ${biasAlignment}`;

  switch (momentumState) {
    case "rising":
      narrative += ", momentum building";
      break;
    case "fading":
      narrative += ", momentum fading";
      break;
    default:
      narrative += ", momentum unclear";
  }

  switch (volatilityLevel) {
    case "high":
      narrative += ", volatility supportive";
      break;
    case "low":
      narrative += ", volatility too weak";
      break;
    default:
      narrative += ", volatility moderate";
  }

  narrative += ` (confidence ${confidenceScore}%).`;

  return narrative;
}
