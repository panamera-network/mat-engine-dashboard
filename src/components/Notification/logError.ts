// system/logError.ts
import { pushSystemLog } from "./pushSystemLog";

export function logError(source: string, message: string, error: unknown, context: Record<string, any> = {}) {
  pushSystemLog("manual", message, {
    source,
    error: String(error),
    ...context,
  });
}
