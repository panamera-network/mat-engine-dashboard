type LogType =
  | "order"
  | "error"
  | "notification"
  | "escalation"
  | "verdict-flip"
  | "bias-spike"
  | "narrative"
  | "manual";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  symbol?: string;
  severity?: "info" | "warning" | "critical";
  message: string;
  context?: Record<string, any>;
}
