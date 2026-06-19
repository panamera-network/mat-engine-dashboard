import { theme } from "../theme";
import type { Pulse } from "./PulseBox";

export function classifyPulse(trigger: string): Pulse {
  const ts = Date.now();

  switch (trigger) {
    case "signalChange":
      return {
        ts,
        intensity: 1,
        color: theme.colors.green,
        glow: 12,
      };
    case "confidenceSurge":
      return {
        ts,
        intensity: 0.9,
        color: theme.colors.amber,
        glow: 14,
      };
    case "volatilitySpike":
      return {
        ts,
        intensity: 1,
        color: theme.colors.red,
        glow: 16,
      };
    case "manual":
      return {
        ts,
        intensity: 0.6,
        color: theme.colors.accentBlue,
        glow: 10,
      };
    case "trendReversal":
      return {
         ts, 
         intensity: 1, 
         color: theme.colors.purple, 
         glow: 18 };

    default:
      return {
        ts,
        intensity: 0.5,
        color: theme.colors.glow,
        glow: 8,
      };
  }
}
