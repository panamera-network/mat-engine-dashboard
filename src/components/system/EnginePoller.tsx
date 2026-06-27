// EnginePoller.tsx — polls POST /core/output for the selected symbols only.
// Runs alongside LiveSignalFeed's websocket (which always fetches all
// symbols) rather than replacing it: CurrencyMeter's strength calculation
// needs full symbol coverage, while this gives a fast, filtered refresh for
// the panels that only care about the selected symbols.
import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { fetchOutput } from "../../api/engineClient";

const POLL_INTERVAL_MS = 30_000;

export function EnginePoller() {
  const selectedSymbols = useStore((s) => s.selectedSymbols);
  const setFeed = useStore((s) => s.setFeed);
  const setEngineStatus = useStore((s) => s.setEngineStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      setEngineStatus({ loading: true });
      try {
        const data = await fetchOutput(selectedSymbols);
        if (cancelled) return;
        setFeed(data);
        setEngineStatus({ loading: false, error: null, lastUpdated: new Date() });
      } catch (err) {
        if (cancelled) return;
        console.error("[EnginePoller] fetchOutput failed", err);
        setEngineStatus({ loading: false, error: "Engine offline" });
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbols.join(",")]);

  return null;
}

export default EnginePoller;
