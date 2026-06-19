type PulseListener = (pulse: { symbol: string; trigger: string }) => void;

let listeners: PulseListener[] = [];

export function emitPulse(symbol: string, trigger: string) {
  listeners.forEach((fn) => fn({ symbol, trigger }));
}

export function onPulse(fn: PulseListener) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
