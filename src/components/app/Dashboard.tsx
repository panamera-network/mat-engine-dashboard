//Dashboard.tsx
import React from "react";
import { theme } from "../../theme";
import { useStore } from "../system/store";
import { HUDHeader, separator } from "../../ui/HUD";

import SessionTracker from "../SessionTracker/SessionTracker";
import CurrencyMeter from "../Strength_meter/CurrencyMeter";
import BiasTableWrapper from "../BiasTable/BiasTableWrapper";
import { ModeToggle } from "../Strength_meter/toggle";
import ChartPanel from "../chart/ChartPanel";
import CorrelationClusters from "../Correlation/CorrelationClusters";
import { InstrumentStrip } from "../InstrumentStrip/InstrumentStrip";
import MultiTimeframeView from "../chart/MultiTimeframeView";
import { PulseBox } from "../../ui/PulseBox";
import { useLogStore, type LogEntry } from "../Notification/logStore";
import { EscalationModal } from "../Notification/EscalationModal";
import { NotificationPanel } from "../Notification/NotificationPanel";
import { LiveSignalFeed } from "../system/LiveSignalFeed";
import AccInfo from "../AccInfo";
import { useSystemStatus } from "../sidepanel/useSystemStatus";

useLogStore.getState().logEvent({
  type: "escalation",
  symbol: "XAUUSD_i",
  severity: "critical",
  message: "Bias spike detected on Gold",
  context: {
    narrative: "Gold bias surged across all timeframes. Volatility expanding. EURUSD and AUDUSD aligned.",
    biasVector: [0.8, 0.9, 0.95],
    freshness: 0.22,
    volatility: 1.4,
    correlatedSymbols: ["EURUSD_i", "AUDUSD_i"],
  },
});


const Dashboard: React.FC = () => {
  const pulses = useStore((s) => s.pulses);
  const logs = useLogStore((s) => s.logs);
  
  const [escalation, setEscalation] = React.useState<LogEntry | null>(null);
  const lastEscalationId = React.useRef<string | null>(null);
  const { data: status } = useSystemStatus();


  React.useEffect(() => {
    const latest = logs.at(-1);
    if (
      latest?.type === "escalation" &&
      latest.id !== lastEscalationId.current
    ) {
      setEscalation(latest);
      lastEscalationId.current = latest.id;
    }
  }, [logs]);


  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr 1.5fr 1fr",
        gap: theme.spacing.md,
        width: "100%",
        height: "100%",
        padding: theme.spacing.sm,
        background: theme.colors.bg,
        minHeight: 0,
      }}
    >
      {/* Column 1 */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md, minHeight: 0 }}>
        <PulseBox flex={1}>
          <HUDHeader>Acc Info</HUDHeader>
          {separator}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.colors.textDim }}>
            <AccInfo account={status?.mt5?.account ?? null} />
          </div>
        </PulseBox>
        <PulseBox flex={0.6}>
          <HUDHeader>🕒 Session Tracker</HUDHeader>
          {separator}
          <SessionTracker />
        </PulseBox>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            flex: 2.4,
            minHeight: 0,
          }}
        >
          <NotificationPanel logs={logs} />

          {escalation && (
            <EscalationModal
              title={escalation.message}
              severity={escalation.severity ?? "info"}
              narrative={escalation.context?.narrative ?? ""}
              context={escalation.context}
              onClose={() => setEscalation(null)}
            />
          )}
        </div>
      </div>
      {/* Column 2 */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md, minHeight: 0 }}>
        <PulseBox flex={2} trigger={pulses.bias}>
          <HUDHeader>📊 Pair Bias Overview</HUDHeader>
          {separator}
          <BiasTableWrapper />
        </PulseBox>
        <div style={{ display: "flex", gap: theme.spacing.md, flex: 1.2, minHeight: 0 }}>
          <PulseBox flex={1} trigger={pulses.correlation}>
            <HUDHeader>🔗 Correlation Clusters</HUDHeader>
            {separator}
            <CorrelationClusters />
          </PulseBox>
          <PulseBox flex={1} trigger={pulses.currency}>
            <HUDHeader>💪 Currency Strength</HUDHeader>
            {separator}
            <LiveSignalFeed />
            <ModeToggle />
            <CurrencyMeter />
          </PulseBox>
        </div>
      </div>

      {/* Column 3 */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md, minHeight: 0 }}>
        <PulseBox flex={1} trigger={pulses.multiTimeframe}>
          <HUDHeader>📊 Multi‑timeframe view</HUDHeader>
          {separator}
          <MultiTimeframeView symbols={[]} wsConnected={false} />
        </PulseBox>
        <PulseBox flex={1.5} trigger={pulses.market}>
          <HUDHeader>📈 Market Overview</HUDHeader>
          {separator}
          <ChartPanel />
        </PulseBox>
      </div>
      
      {/* Column 4 */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md, minHeight: 0 }}>
        <PulseBox flex={2.5} trigger={pulses.timeline || pulses.volatility}>
          <HUDHeader>⚡ Scalp Verdict · Bias & Volatility</HUDHeader>
          {separator}
          <InstrumentStrip />
        </PulseBox>
      </div>

    </div>
  );
};

export default Dashboard;
