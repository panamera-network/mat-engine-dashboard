import { useEffect, useState } from "react";
import LiveChart from "./LiveChart";
import ErrorBoundary from "./ErrorBoundary";
import { useStore } from "../system/store";
import { theme } from "../../theme";
import Toolbar from "./Toolbar";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";

const ChartPanel = () => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const selectedTimeframe = useStore((s) => s.selectedTimeframe);
  const wsTickStatus = useStore((s) => s.wsTickStatus);
  const isResolvingSymbol = useStore((s) => s.isResolvingSymbol);

  const { chartSymbol, dataKey, isReady } = useActiveSymbol();
  const ticks = useStore((s) => (dataKey ? s.ticks[dataKey] : undefined));

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

  const showChart = isReady && chartSymbol && !isResolvingSymbol;

  return (
    <div
      style={{
        background: theme.colors.panel,
        border: `1px solid ${theme.colors.grid}`,
        borderRadius: theme.radius.sm,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Toolbar symbols={symbols} wsStatus={wsTickStatus} />

      <div style={{ flex: 1, minHeight: 0 }}>
        <ErrorBoundary>
          {showChart ? (
            <LiveChart
              key={`${chartSymbol}-${selectedTimeframe}`}
              baseSymbol={chartSymbol}
              timeframe={selectedTimeframe}
              ticks={ticks ?? []}
              onStatsUpdate={() => {}}
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
