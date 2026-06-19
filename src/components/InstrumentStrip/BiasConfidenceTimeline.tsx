import React from "react";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";
import type { BiasPoint } from "../Strength_meter/csm_types";
import { useStore } from "../system/store";

const EMPTY: BiasPoint[] = [];

interface BiasConfidenceTimelineProps {
  symbol?: string;
}

export const BiasConfidenceTimeline: React.FC<BiasConfidenceTimelineProps> = ({
  symbol = "XAUUSD",
}) => {
  const timeline = useStore((s) => s.biasTimeline[symbol] ?? EMPTY);

  const swing = React.useMemo(() => {
  const found = [...timeline].reverse().find((p) => p.mode === "swing");
  return found &&
    typeof found.bias === "number" &&
    typeof found.confidence === "number" &&
    isFinite(found.bias) &&
    isFinite(found.confidence)
    ? found
    : undefined;
}, [timeline]);

const scalp = React.useMemo(() => {
  const found = [...timeline].reverse().find((p) => p.mode === "scalp");
  return found &&
    typeof found.bias === "number" &&
    typeof found.confidence === "number" &&
    isFinite(found.bias) &&
    isFinite(found.confidence)
    ? found
    : undefined;
}, [timeline]);


  if (!swing || !scalp) {
    return (
      <Panel title="Bias/Confidence Timeline" style={{ width: "100%" }}>
        <div style={{ padding: theme.spacing.sm, color: theme.colors.textDim, fontSize: 12 }}>
          No bias data yet…
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Bias/Confidence Timeline" style={{ width: `${Math.max(0, Math.min(100, swing.confidence))}%`,
 }}>
      <div
        style={{
          position: "relative",
          height: 36, // ✅ inlined, no unused prop
          background: theme.colors.panel,
          borderRadius: theme.radius.md,
          overflow: "hidden",
        }}
      >
        {/* Swing track */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            height: "40%",
            left: 0,
            width: `${swing.confidence}%`,
            background: swing.bias > 0
              ? theme.colors.green
              : swing.bias < 0
              ? theme.colors.red
              : theme.colors.amber,
            borderRadius: theme.radius.md,
            transition: theme.easing.grow,
          }}
        />
        {/* Scalp track */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            height: "40%",
            left: 0,
            width: `${scalp.confidence}%`,
            background: scalp.bias > 0
              ? theme.colors.green
              : scalp.bias < 0
              ? theme.colors.red
              : theme.colors.amber,
            borderRadius: theme.radius.sm,
            transition: theme.easing.snap,
          }}
        />
      </div>

      <div style={{ marginTop: theme.spacing.xs, fontSize: 12, color: theme.colors.textDim }}>
        Swing: {isFinite(swing.bias) ? (swing.bias > 0 ? "Bullish" : swing.bias < 0 ? "Bearish" : "Neutral") : "—"} ({isFinite(swing.confidence) ? swing.confidence : "—"}%) ·
        Scalp: {isFinite(scalp.bias) ? (scalp.bias > 0 ? "Bullish" : scalp.bias < 0 ? "Pullback" : "Neutral") : "—"} ({isFinite(scalp.confidence) ? scalp.confidence : "—"}%)
      </div>
    </Panel>
  );
};
