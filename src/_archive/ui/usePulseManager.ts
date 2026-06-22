// usePulseManager.ts
import { useState, useCallback } from "react";

type PulseMap = Record<string, number>;

export function usePulseManager() {
  const [pulses, setPulses] = useState<PulseMap>({});

  // Call this whenever a module updates
  const triggerPulse = useCallback((id: string) => {
    setPulses((prev) => ({
      ...prev,
      [id]: Date.now(), // unique timestamp per module
    }));
  }, []);

  return { pulses, triggerPulse };
}
