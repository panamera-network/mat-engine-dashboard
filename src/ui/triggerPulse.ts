// triggerPulse.ts

import { emitPulse } from "./pulseBus";

export function triggerPulse(symbol: string, trigger: string) {
  emitPulse(symbol, trigger);
}
