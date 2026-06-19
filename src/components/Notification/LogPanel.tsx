// LogPanel.tsx
import React from "react";
import { EscalationModal } from "./EscalationModal";
import type { LogEntry } from "./logStore";
import { theme } from "../../theme";

export const LogPanel: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const [selectedLog, setSelectedLog] = React.useState<LogEntry | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  
  const labelColorMap: Record<string, string> = {
    heartbeat: theme.colors.textDim,
    "config-change": theme.colors.accentBlue,
    // manual: theme.colors.cyan, // optional
    narrative: theme.colors.green,
    notification: theme.colors.amber,
    escalation: theme.colors.red,
  };


  return (
    <div
      style={{
        padding: theme.spacing.md,
        background: `linear-gradient(180deg, ${theme.colors.panel} 0%, ${theme.colors.panelAlt} 100%)`,
        boxShadow: `0 0 ${theme.pulse.soft.glow}px ${theme.colors.glow}`,
        fontFamily: theme.fonts.mono ?? "JetBrains Mono, monospace",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          flexDirection: "column-reverse",
          gap: theme.spacing.xs,
          paddingRight: theme.spacing.xs,
          flex: 1,
          minHeight: 0,
        }}
      >
        {logs.length === 0 ? (
          <p style={{ color: theme.colors.textDim, fontStyle: "italic" }}>
            No log entries yet.
          </p>
        ) : (
          logs.map((log) => {
            const isError = log.type === "error";
            const baseColor =
              log.severity === "critical"
                ? theme.colors.red
                : log.severity === "warning"
                ? theme.colors.amber
                : theme.colors.green;

            const borderColor = isError ? theme.colors.amber : baseColor;
            const labelColor = labelColorMap[log.label ?? ""] ?? borderColor;
            const isVerdictFlip = log.label === "verdictFlip";
            const prev = log.context?.previousBias;
            const current = log.context?.biasAlignment;

            const flipGradient =
              isVerdictFlip && prev && current
                ? prev === "bullish" && current === "bearish"
                  ? "linear-gradient(to right, #00ff88, #ff0044)"
                  : prev === "bearish" && current === "bullish"
                  ? "linear-gradient(to right, #ff0044, #00ff88)"
                  : theme.colors.amber
                : undefined;

            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                style={{
                  padding: theme.spacing.xs,
                  cursor: "pointer",
                  borderLeft: flipGradient
                    ? `3px solid transparent`
                    : `3px solid ${labelColor}`,
                  background: flipGradient ?? theme.colors.panelAlt,
                  backgroundClip: "padding-box",
                  borderRadius: theme.radius.sm,
                  boxShadow: `0 0 8px ${labelColor}55`,
                  transition: "all 0.3s ease",
                  animation:
                    log.severity === "critical" ? "pulseGlow 1s ease-out" : undefined,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: theme.colors.text,
                    marginBottom: 4,
                  }}
                >
                  <strong style={{ color: labelColor }}>{log.symbol}</strong>{" "}
                  — <span>{log.message}</span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.colors.textDim,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  {log.label && (
                    <span style={{ fontStyle: "italic", color: labelColor }}>
                      {log.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedLog?.label === "narrative" && (
        <EscalationModal
          title={selectedLog.message}
          severity={selectedLog.severity ?? "info"}
          narrative={selectedLog.context?.narrative ?? ""}
          context={selectedLog.context}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};
