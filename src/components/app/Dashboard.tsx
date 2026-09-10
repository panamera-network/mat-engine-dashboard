//Dashboard.tsx
import React from "react";
import { theme } from "../../theme";
import { useStore } from "../system/store";
import { HUDHeader, separator } from "../../ui/HUD";

import CurrencyMeter from "../Strength_meter/CurrencyMeter";
import { BiasTable } from "../BiasTable/BiasTable";
import { ModeToggle } from "../Strength_meter/toggle";
import ChartPanel from "../chart/ChartPanel";
import MarketHeatmap from "../Heatmap/MarketHeatmap";
import { InstrumentStrip } from "../InstrumentStrip/InstrumentStrip";
import MultiTimeframeView from "../chart/MultiTimeframeView";
import { MultiTimeframeAddChart } from "../chart/MultiTimeframeAddChart";
import { PulseBox } from "../../ui/PulseBox";
import { LiveSignalFeed } from "../system/LiveSignalFeed";
import { TickStream } from "../system/TickStream";
import { EnginePoller } from "../system/EnginePoller";
import { StrategyControl } from "../StrategyControl/StrategyControl";
import { SymbolSelector } from "../SymbolSelector";
import { BiasFeedStatus } from "../BiasFeedStatus";

const Dashboard: React.FC = () => {
  const pulses = useStore((s) => s.pulses);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 2fr) minmax(0, 1fr)",
        gap: theme.spacing.md,
        width: "100%",
        height: "100%",
        padding: theme.spacing.sm,
        background: theme.colors.bg,
        minHeight: 0,
      }}
    >
      {/* Background data streams */}
      <LiveSignalFeed />
      <TickStream />
      <EnginePoller />

      {/* Pair Selection — Pair Bias Overview on top, Market Heatmap +
          Currency Strength directly below. Header controls (Symbols /
          Bias Feed) unchanged. */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md, minHeight: 0, minWidth: 0 }}>
        <PulseBox flex={1.6} trigger={pulses.bias}>
          <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, flexWrap: "nowrap" }}>
            <HUDHeader>📊 Pair Bias Overview</HUDHeader>
            <span style={{ color: theme.colors.grid, fontSize: 13 }}>|</span>
            <SymbolSelector />
            <span style={{ color: theme.colors.grid, fontSize: 13 }}>|</span>
            <BiasFeedStatus />
          </div>
          {separator}
          <BiasTable />
        </PulseBox>
        <div style={{ display: "flex", gap: theme.spacing.md, flex: 1, minHeight: 0, minWidth: 0 }}>
          <PulseBox flex={1} trigger={pulses.correlation}>
            <HUDHeader>🗺️ Market Heatmap</HUDHeader>
            {separator}
            <MarketHeatmap />
          </PulseBox>
          <PulseBox flex={1} trigger={pulses.currency}>
            <HUDHeader>💪 Currency Strength</HUDHeader>
            {separator}
            <ModeToggle />
            <CurrencyMeter />
          </PulseBox>
        </div>
      </div>

      {/* Trade Inspection — Scalp Diagnostics shrunk to content height on
          top (InstrumentStrip.tsx now lays Audit Trail / Verdict / CCI
          out as one row instead of stacked), then Multi-timeframe view,
          then Market Overview as the dominant chart. */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md, minHeight: 0, minWidth: 0 }}>
        <div style={{ flex: "0 0 auto", minWidth: 0 }}>
          <PulseBox trigger={pulses.timeline || pulses.volatility}>
            <HUDHeader>⚡ Scalp Diagnostics</HUDHeader>
            {separator}
            <InstrumentStrip />
          </PulseBox>
        </div>
        <PulseBox flex={1} trigger={pulses.multiTimeframe}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }}>
            <HUDHeader>📊 Multi‑timeframe view</HUDHeader>
            <MultiTimeframeAddChart />
          </div>
          {separator}
          <MultiTimeframeView />
        </PulseBox>
        <PulseBox flex={1.8} trigger={pulses.market}>
          <HUDHeader>📈 Market Overview</HUDHeader>
          {separator}
          <ChartPanel />
        </PulseBox>
      </div>

      {/* Strategy — Strategy Control, with reserved space below for the
          future Strategy Tester (placeholder only, no logic yet). */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md, minHeight: 0, minWidth: 0 }}>
        <PulseBox flex={1.5}>
          <StrategyControl />
        </PulseBox>
        <PulseBox flex={1}>
          <HUDHeader>🧪 Strategy Tester</HUDHeader>
          {separator}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.colors.textDim,
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            Coming soon
          </div>
        </PulseBox>
      </div>
    </div>
  );
};

export default Dashboard;
