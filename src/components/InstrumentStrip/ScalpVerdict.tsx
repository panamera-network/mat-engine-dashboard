import React from "react";
import { theme } from "../../theme";
import { useLogStore } from "../Notification/logStore";
import type { BiasPoint } from "../Strength_meter/csm_types";

export const ScalpVerdict: React.FC<{ timeline: BiasPoint[]; symbol: string }> = ({
  timeline,
  symbol,
}) => {
  const logEvent = useLogStore((s) => s.logEvent);

  const scalp = React.useMemo(
    () => [...timeline].reverse().find((p) => p.mode === "scalp"),
    [timeline]
  );

  const active = !!scalp;
  const direction =
    typeof scalp?.bias === "number" && isFinite(scalp.bias)
      ? scalp.bias > 0
        ? "long"
        : scalp.bias < 0
        ? "short"
        : "neutral"
      : "neutral";

  const color =
    direction === "long"
      ? theme.colors.green
      : direction === "short"
      ? theme.colors.red
      : active
      ? theme.colors.amber
      : theme.colors.panelAlt;

  const previousDirection = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (previousDirection.current && previousDirection.current !== direction) {
      logEvent({
        type: "notification",
        symbol,
        severity: "info",
        message: `ScalpVerdict flipped from ${previousDirection.current} to ${direction}`,
        context: {
          verdict: direction,
          previousVerdict: previousDirection.current,
          bias: scalp?.bias,
        },
      });
    }
    previousDirection.current = direction;
  }, [direction, symbol, scalp?.bias, logEvent]);

  return (
    <div
      style={{
        height: 32,
        borderRadius: theme.radius.sm,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: "0.5px",
        color: "#fff",
        background: active ? color : theme.colors.panelAlt,
        boxShadow: active ? `0 0 12px ${color}` : "none",
        transition: "all 0.3s ease",
        textTransform: "uppercase",
      }}
    >
      {active
        ? direction === "long"
          ? "⚡ SCALP LONG"
          : direction === "short"
          ? "⚡ SCALP SHORT"
          : "⚠ Neutral"
        : "— No Scalp Signal —"}
    </div>
  );
};
