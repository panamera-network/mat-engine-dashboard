// usePulseTrigger.ts

import { useCallback } from "react";
import { theme } from "../theme";
import type { Pulse } from "./PulseBox";

export const usePulseTrigger = () => {
  return useCallback(
    (intensity: number = 1, color: string = theme.colors.green, glow: number = 12): Pulse[] => {
      return [
        {
          ts: Date.now(),
          intensity,
          color,
          glow,
        },
      ];
    },
    []
  );
};
