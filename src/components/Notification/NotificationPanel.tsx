// NotificationPanel.tsx
import React, { useEffect, useState } from "react";
import { LogPanel } from "./LogPanel";
import { EscalationModal } from "./EscalationModal";
import type { LogEntry } from "./logStore";
import { theme } from "../../theme";
import { HUDHeader, separator } from "../../ui/HUD";
import { ScrollBox } from "../../ui/ScrollBox";
import { PulseBox} from "../../ui/PulseBox";
import type { Pulse } from "../../ui/PulseBox";


const categoryMap: Record<string, string> = {
  verdictFlip: "signal",
  biasSpike: "signal",
  volatilitySpike: "notification", 
  confidenceSurge: "notification",
  signalChange: "signal",
  correlation: "signal",
  freshness: "signal",
  escalation: "signal",
  error: "error",
  order: "order",
  configChange: "system",
  heartbeat: "system",
  manual: "system",
  narrative: "notification",
  notification: "notification",
};


export const NotificationPanel: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [escalation, setEscalation] = useState<LogEntry | null>(null);
  const [pulseTrigger, setPulseTrigger] = useState<Pulse[]>([]);
  const prevLogCount = React.useRef(logs.length);

useEffect(() => {
  const newLogs = logs.length > prevLogCount.current;
  const latest = logs[logs.length - 1];

  if (newLogs && latest) {
    const category = categoryMap[latest.label ?? ""];

    if (latest.label === "verdictFlip") {
      const prev = latest.context?.previousBias;
      const current = latest.biasAlignment;

      const flipGradient =
        prev === "bullish" && current === "bearish"
          ? "linear-gradient(to right, #00ff88, #ff0044)" // green → red
        : prev === "bearish" && current === "bullish"
          ? "linear-gradient(to right, #ff0044, #00ff88)" // red → green
        : theme.colors.amber;

      latest.context = {
        ...latest.context,
        flipGradient,
      };
    }


    // 🔴 EscalationModal for critical tabs
    if (["signal", "error", "order"].includes(category)) {
      setEscalation(latest);
    }

    // 🌈 Pulse logic by category
    if (latest.severity === "critical") {
      setPulseTrigger([
        {
          ts: Date.now(),
          intensity: 1,
          color: theme.colors.red,
          glow: 24,
        },
      ]);
    } else if (category === "error") {
      setPulseTrigger([
        {
          ts: Date.now(),
          intensity: 0.8,
          color: theme.colors.amber,
          glow: 16,
        },
      ]);
    } else if (category === "order") {
      setPulseTrigger([
        {
          ts: Date.now(),
          intensity: 0.8,
          color: theme.colors.accentBlue,
          glow: 16,
        },
      ]);
    } else if (category === "signal") {
      setPulseTrigger([
        {
          ts: Date.now(),
          intensity: 0.8,
          color:
            latest.context?.previousBias === "bullish" &&
            latest.context?.biasAlignment === "bearish"
              ? theme.colors.red
            : latest.context?.previousBias === "bearish" &&
              latest.context?.biasAlignment === "bullish"
              ? theme.colors.green
            : theme.colors.amber,
          glow: 16,
        },
      ]);
    }
  }

  prevLogCount.current = logs.length;
}, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (selectedCategory === "all") return true;
    return categoryMap[log.label ?? ""] === selectedCategory;
  });

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${theme.colors.panel} 0%, ${theme.colors.panelAlt} 100%)`,
        border: `1px solid ${theme.colors.grid}`,
        borderRadius: theme.radius.sm,
        padding: theme.spacing.sm,
        color: theme.colors.text,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        backdropFilter: "blur(6px)",
        boxShadow: `0 0 ${theme.pulse.soft.glow}px ${theme.colors.glow}`,
        fontFamily: theme.fonts.mono ?? "JetBrains Mono, monospace",
      }}
    >
      <HUDHeader>🔔 Notifications & Escalation</HUDHeader>
      {separator}

      {/* Selector Row */}
      <div style={{ display: "flex", gap: theme.spacing.sm, margin: theme.spacing.sm }}>
        {["all", "signal", "error", "order", "system", "notification"].map((key) => {
          const active = selectedCategory === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              style={{
                padding: "4px 10px",
                borderRadius: theme.radius.sm,
                border: `1px solid ${active ? theme.colors.accentBlue : theme.colors.grid}`,
                background: active
                  ? `linear-gradient(180deg, ${theme.colors.accentBlue}33, ${theme.colors.accentBlue}11)`
                  : "transparent",
                color: active ? theme.colors.accentBlue : theme.colors.text,
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                letterSpacing: "0.5px",
                cursor: "pointer",
                transition: "all 0.25s ease",
                textTransform: "capitalize",
                boxShadow: active ? `0 0 8px ${theme.colors.accentBlue}` : "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = theme.colors.accentBlue;
                (e.currentTarget as HTMLButtonElement).style.color = theme.colors.accentBlue;
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = theme.colors.grid;
                  (e.currentTarget as HTMLButtonElement).style.color = theme.colors.text;
                }
              }}
            >
              {key === "all"
                ? "All"
                : key === "signal"
                ? "Signal"
                : key === "error"
                ? "Error"
                : key === "order"
                ? "Order"
                : key === "system"
                ? "System"
                : "Notification"}
            </button>
          );
        })}
      </div>

      {/* Log Feed */}
      <PulseBox trigger={pulseTrigger}>
        <ScrollBox>
          <LogPanel logs={filteredLogs} />
        </ScrollBox>
      </PulseBox>


      {/* Escalation Modal */}
      {escalation && (
        <EscalationModal
          title={
            escalation.label === "verdictFlip"
              ? "Directional Bias Flipped"
              : escalation.message
          }
          subtitle={
            escalation.label === "verdictFlip"
              ? `${escalation.context?.previousBias?.toUpperCase()} → ${escalation.context?.biasAlignment?.toUpperCase()}`
              : undefined
          }
          severity={escalation.severity ?? "info"}
          narrative={escalation.context?.narrative ?? ""}
          context={escalation.context}
          onClose={() => setEscalation(null)}
        />
      )}
    </div>
  );
};
