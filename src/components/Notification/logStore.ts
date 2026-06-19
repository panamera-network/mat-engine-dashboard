// logStore.ts
import { create } from "zustand";
import type { Pulse } from "../../ui/PulseBox";

type LogType = "signal" | "error" | "system" | "notification" | "escalation";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  symbol?: string;
  severity?: "info" | "warning" | "critical";
  message: string;
  context?: Record<string, any>;
  label?: string;
  source?: string
  biasAlignment?: "bullish" | "bearish" | "neutral";
}


interface LogState {
  logs: LogEntry[];
  logEvent: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  pulseTrigger: Pulse[];
  triggerPulse: (pulse: Pulse) => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  logEvent: (entry) => {
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...entry,
        },
      ],
    }));
  },
  pulseTrigger: [],
  triggerPulse: (pulse) => {
    set(() => ({
      pulseTrigger: [pulse],
    }));
  },
}));

