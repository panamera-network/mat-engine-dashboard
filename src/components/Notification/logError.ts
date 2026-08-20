// system/logError.ts
import { useLogStore } from "./logStore";

export function logError(source: string, message: string, error: unknown, context: Record<string, any> = {}) {
  useLogStore.getState().logEvent({
    type: "error",
    label: "error",
    severity: "warning",
    message,
    context: {
      source,
      error: String(error),
      ...context,
    },
  });
}
