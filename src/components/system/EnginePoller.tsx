// EnginePoller polls POST /core/output for the selected symbols only.
// Its result is intentionally kept separate from the websocket feed and is
// used by BiasTable only. Full-market widgets keep using LiveSignalFeed data.
import { useEffect, useRef, type MutableRefObject } from "react";
import { useStore } from "./store";
import { fetchOutput } from "../../api/engineClient";
import { useLogStore } from "../Notification/logStore";

const POLL_INTERVAL_MS = 30_000;
const ESCALATING_ACTIONS = new Set(["Alert", "Enter", "Invalidate"]);

function emitEngineEscalations(
  feed: Record<string, any>,
  lastActions: MutableRefObject<Record<string, string>>
) {
  const logEvent = useLogStore.getState().logEvent;

  for (const [symbol, symbolData] of Object.entries(feed)) {
    for (const mode of ["scalping", "swing"] as const) {
      const diagnostic = symbolData?.[mode]?.diagnostic;
      const action = diagnostic?.action;
      const stage = diagnostic?.stage;
      if (!action || !ESCALATING_ACTIONS.has(action)) continue;

      const key = `${symbol}:${mode}`;
      const signature = `${stage}:${action}:${diagnostic?.summary ?? ""}`;
      if (lastActions.current[key] === signature) continue;
      lastActions.current[key] = signature;

      const severity = action === "Enter" ? "critical" : "warning";
      const score = diagnostic?.score_pct ?? diagnostic?.cascade_score ?? diagnostic?.conviction_score;
      const summary = diagnostic?.summary ?? `${mode} ${stage} / ${action}`;

      logEvent({
        type: "escalation",
        label: "engineEscalation",
        symbol,
        severity,
        message: `${symbol} ${mode} ${stage}: ${action}`,
        context: {
          source: "EnginePoller",
          symbol,
          mode,
          stage,
          action,
          score,
          risk: diagnostic?.risk,
          reasons: diagnostic?.reasons ?? [],
          narrative: summary,
          diagnostic,
        },
        source: "EnginePoller",
      });
    }
  }
}

export function EnginePoller() {
  const selectedSymbols = useStore((s) => s.selectedSymbols);
  const setBiasTableFeed = useStore((s) => s.setBiasTableFeed);
  const setEngineStatus = useStore((s) => s.setEngineStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEscalationActionsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      setEngineStatus({ loading: true });
      try {
        const data = await fetchOutput(selectedSymbols);
        if (cancelled) return;
        setBiasTableFeed(data);
        emitEngineEscalations(data, lastEscalationActionsRef);
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
  }, [selectedSymbols, setBiasTableFeed, setEngineStatus]);

  return null;
}

export default EnginePoller;

