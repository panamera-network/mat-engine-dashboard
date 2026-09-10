import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { TradingTerminalSurface, type TerminalPanelId, type TerminalPanelSlots } from "@mat/trading-terminal-surface";
import { LocalStorageDrawingAdapter, type ChartType, type DrawingType } from "@mat/chart-core";
import ErrorBoundary from "./ErrorBoundary";
import { useStore } from "../system/store";
import { theme } from "../../theme";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";
import { createStrategyEngineFeed } from "../../lib/strategyEngineFeed";
import { createStrategyOverlayPluginFactory } from "../../lib/strategyOverlayPlugin";
import { TERMINAL_TIMEFRAMES, toChartCoreTimeframe, toDashboardTimeframe } from "../../lib/terminalTimeframe";
import { useStrategyOverlayToggles, type StrategyOverlayToggles } from "../../lib/strategyOverlayToggles";
import { useLogStore } from "../Notification/logStore";
import { NotificationPanel } from "../Notification/NotificationPanel";
import { AuditTrail } from "../InstrumentStrip/AuditTrail";
import { StrategyControl } from "../StrategyControl/StrategyControl";
import AccInfo from "../AccInfo";
import { useSystemStatus } from "../sidepanel/useSystemStatus";
import MultiTimeframeView from "./MultiTimeframeView";

const CHART_TYPES: readonly ChartType[] = ["candlestick", "line", "area"];
const OVERLAY_TOGGLE_KEYS: readonly (keyof StrategyOverlayToggles)[] = ["snr", "snd", "ob", "fvg", "bos", "choch"];
// Strategy is rendered as a custom toolbarControls button (see below) so it
// sits right after Indicators, ahead of SNR/SND/OB/FVG/BOS/CHOCH — the
// native panelActions group always renders after toolbarControls, so it
// can't be placed there. DOM / Order / P&L dropped: DOM and Order are
// non-functional placeholders (see NotConnectedPanel below) and P&L just
// duplicated the header's "Account ▾" dropdown.
const PANEL_ACTIONS: readonly TerminalPanelId[] = ["alerts", "journal", "mtf"];

/** Honest "not available" panel — used where this dashboard genuinely has no
 *  underlying data/capability, instead of faking one. */
function NotConnectedPanel({ reason }: { reason: string }) {
  return (
    <div style={{ padding: theme.spacing.sm, color: theme.colors.textDim, fontSize: 12, lineHeight: 1.5 }}>
      {reason}
    </div>
  );
}

function overlayToggleStyle(active: boolean): CSSProperties {
  return {
    height: 22,
    padding: "0 7px",
    background: active ? `${theme.colors.accentBlue}33` : "transparent",
    color: active ? theme.colors.accentBlue : theme.colors.textDim,
    border: `1px solid ${active ? theme.colors.accentBlue : theme.colors.grid}`,
    borderRadius: theme.radius.sm,
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 700,
  };
}

const ChartPanel = () => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const selectedTimeframe = useStore((s) => s.selectedTimeframe);
  const setSelectedTimeframe = useStore((s) => s.setSelectedTimeframe);
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const wsTickStatus = useStore((s) => s.wsTickStatus);
  const isResolvingSymbol = useStore((s) => s.isResolvingSymbol);

  const { chartSymbol, isReady } = useActiveSymbol();
  const ticks = useStore((s) => (chartSymbol ? s.ticks[chartSymbol] : undefined));
  const lastTick = ticks?.[ticks.length - 1];

  // Panel-action content — each reuses the exact component/state the rest of
  // the dashboard already uses (same as Dashboard.tsx), not a duplicate.
  const logs = useLogStore((s) => s.logs);
  const auditTrail = useStore((s) => s.auditTrail);
  const { data: systemStatus } = useSystemStatus();

  const overlayToggles = useStrategyOverlayToggles((s) => s.toggles);
  const toggleOverlay = useStrategyOverlayToggles((s) => s.toggle);

  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [drawingTool, setDrawingTool] = useState<DrawingType>("cursor");
  const [magnetEnabled, setMagnetEnabled] = useState(false);
  const [fullCanvas, setFullCanvas] = useState(false);
  // Lifted so the custom Strategy toolbar button (below) can open the same
  // native "strategy" panel slot the terminal surface itself manages.
  const [activePanel, setActivePanel] = useState<TerminalPanelId | null>(null);

  useEffect(() => {
    fetch("/api/mt5/symbols")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.symbols) && data.symbols.length) {
          setSymbols(data.symbols);
        }
      })
      .catch((err) => console.error("Symbol list fetch error", err));
  }, []);

  // Stable across re-renders: the feed reads live store state on each call
  // rather than closing over it, and the plugin subscribes to the store
  // itself (see strategyEngineFeed.ts / strategyOverlayPlugin.ts) — neither
  // needs to be recreated when unrelated dashboard state changes.
  const feed = useMemo(() => createStrategyEngineFeed(), []);
  const plugins = useMemo(() => [createStrategyOverlayPluginFactory()], []);
  const drawingAdapter = useMemo(() => new LocalStorageDrawingAdapter(), []);

  const chartCoreTimeframe = toChartCoreTimeframe(selectedTimeframe);
  const showChart = isReady && chartSymbol && !isResolvingSymbol;

  // Rendered inside the terminal surface's own chart toolbar (right after
  // Indicators, before Alerts/Journal/MTF) instead of a separate row above
  // the chart — same toggles/store, just relocated.
  const toolbarControls = (
    <>
      <button
        type="button"
        onClick={() => setActivePanel((prev) => (prev === "strategy" ? null : "strategy"))}
        title="Toggle Strategy panel"
        aria-label="Toggle Strategy panel"
        style={overlayToggleStyle(activePanel === "strategy")}
      >
        Strategy
      </button>
      {OVERLAY_TOGGLE_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => toggleOverlay(key)}
          title={`Toggle ${key.toUpperCase()}`}
          aria-label={`Toggle ${key.toUpperCase()}`}
          style={overlayToggleStyle(overlayToggles[key])}
        >
          {key.toUpperCase()}
        </button>
      ))}
    </>
  );

  const panels: TerminalPanelSlots = {
    alerts: {
      title: "Alerts",
      badge: logs.length || undefined,
      content: <NotificationPanel logs={logs} />,
    },
    strategy: {
      title: "Strategy",
      content: <StrategyControl />,
    },
    dom: {
      title: "DOM",
      content: (
        <NotConnectedPanel reason="Depth of market is not available — this dashboard has no order-book/DOM data source (mat-strategy-engine does not expose one)." />
      ),
    },
    order: {
      title: "Order",
      content: (
        <NotConnectedPanel reason="Order entry is intentionally disabled — Engine Dashboard is read-only monitoring only. No MT5 execution path is wired here." />
      ),
    },
    pnl: {
      title: "P&L",
      content: <AccInfo account={systemStatus?.mt5?.account ?? null} />,
    },
    journal: {
      title: "Journal",
      content: (
        <div>
          <p style={{ margin: "0 0 8px", color: theme.colors.textDim, fontSize: 11 }}>
            Signal &amp; structure event history (no trade journal exists — this dashboard does not execute trades).
          </p>
          <AuditTrail events={auditTrail} />
        </div>
      ),
    },
    mtf: {
      title: "MTF",
      content: <MultiTimeframeView />,
    },
  };

  return (
    <div
      style={{
        background: theme.colors.panel,
        border: `1px solid ${theme.colors.grid}`,
        borderRadius: theme.radius.sm,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <ErrorBoundary>
          {showChart ? (
            <TradingTerminalSurface
              key={chartSymbol}
              topBar={{
                title: "MAT Engine Dashboard",
                mode: { label: "LIVE", tone: "live" },
                connection: {
                  label:
                    wsTickStatus === "connected"
                      ? "Engine tick feed connected"
                      : wsTickStatus === "reconnecting"
                      ? "Reconnecting…"
                      : "Tick feed offline",
                  state:
                    wsTickStatus === "connected"
                      ? "ready"
                      : wsTickStatus === "reconnecting"
                      ? "connecting"
                      : "offline",
                },
              }}
              chart={{
                chartId: "engine-dashboard-chart",
                symbolCatalog: {
                  // The engine's symbol list (and this dashboard's `feed`
                  // keys) are broker-suffixed ("XAUUSD_i"); `chartSymbol`
                  // (resolved via useActiveSymbol/resolveBrokerSymbol) is
                  // the suffixed form, matching `symbols` below — using the
                  // raw `selectedSymbol` ("XAUUSD") here would never match
                  // an option in the list.
                  symbols: symbols.map((sym) => ({ id: sym, label: sym })),
                  selectedSymbolId: chartSymbol,
                  onSelectSymbol: setSelectedSymbol,
                },
                timeframes: TERMINAL_TIMEFRAMES,
                selectedTimeframe: chartCoreTimeframe,
                onSelectTimeframe: (tf) => setSelectedTimeframe(toDashboardTimeframe(tf)),
                chartTypes: CHART_TYPES,
                selectedChartType: chartType,
                onSelectChartType: setChartType,
                quote: lastTick ? { last: lastTick.price, updatedAt: lastTick.time } : undefined,
                feed,
                plugins,
                persistence: {
                  scope: {
                    workspaceId: "mat-engine-dashboard",
                    layoutId: "chart-panel",
                    chartId: "engine-dashboard-chart",
                    symbol: chartSymbol,
                    timeframe: chartCoreTimeframe,
                  },
                  adapter: drawingAdapter,
                },
                activeDrawingTool: drawingTool,
                onSelectDrawingTool: setDrawingTool,
                magnetEnabled,
                onMagnetEnabledChange: setMagnetEnabled,
                fullCanvas: { isFullCanvas: fullCanvas, onFullCanvasChange: setFullCanvas },
                toolbarControls,
              }}
              panels={panels}
              activePanel={activePanel}
              onActivePanelChange={setActivePanel}
              chrome={{ panelActions: PANEL_ACTIONS, showBottomDock: false, drawingRailMode: "grouped" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: theme.colors.textDim,
                fontSize: 13,
              }}
            >
              Resolving symbol…
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ChartPanel;
