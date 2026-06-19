// pushSystemLog.tsx
import { useLogStore } from "./logStore";

export const pushSystemLog = (
  label: "config-change" | "heartbeat" | "manual",
  message: string,
  context: Record<string, any> = {}
) => {
  const logEvent = useLogStore.getState().logEvent;

  logEvent({
    type: "system",
    label,
    severity: "info",
    message,
    context,
  });
};
