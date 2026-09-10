import React, { useState } from "react";
import LiveChart from "./LiveChart";
import ErrorBoundary from "./ErrorBoundary";
import { Panel } from "../../ui/Panel";
import { useStore } from "../system/store";
import PanelHeader from "./PanelHeader";
import { theme } from "../../theme";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const MultiTimeframeView: React.FC = () => {
  const { selectedSymbol, chartSymbol, dataKey, isReady } = useActiveSymbol();
  const ticks = useStore((s) => (dataKey ? s.ticks[dataKey] : undefined));

  const profiles = useStore((s) => s.profiles);
  const activeProfile = useStore((s) => s.activeProfile);
  const saveProfile = useStore((s) => s.saveProfile);

  const timeframes = profiles[activeProfile] ?? ["5m", "1h"];
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const available: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

  const updateTimeframe = (index: number, tf: Timeframe) => {
    const updated = [...timeframes];
    updated[index] = tf;
    saveProfile(activeProfile, updated);
  };

  const removePanel = (index: number) =>
    saveProfile(activeProfile, timeframes.filter((_, i) => i !== index));

  if (!selectedSymbol) {
    return (
      <div style={{ color: theme.colors.textDim, fontSize: 13 }}>
        No symbol selected
      </div>
    );
  }

  const chartReady = isReady && chartSymbol;

  const renderChart = (tf: Timeframe, key: string) => (
    <ErrorBoundary>
      {chartReady ? (
        <LiveChart
          key={key}
          baseSymbol={chartSymbol}
          timeframe={tf}
          ticks={ticks ?? []}
          onStatsUpdate={() => {}}
          showHeader={false}
          enableDrawing={false}
          enableOverlays={false}
          enableStrategyMarkers={false}
        />
      ) : (
        <div style={{ padding: 12, color: theme.colors.textDim, fontSize: 12 }}>
          Resolving symbol…
        </div>
      )}
    </ErrorBoundary>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {fullscreenIndex !== null ? (
        <div style={{ flex: 1, width: "100%", height: "80vh" }}>
          <Panel
            title={
              <PanelHeader
                symbol={selectedSymbol}
                timeframe={timeframes[fullscreenIndex]}
                available={available}
                onTimeframeChange={(newTf) =>
                  updateTimeframe(fullscreenIndex, newTf as Timeframe)
                }
                onRemove={() => removePanel(fullscreenIndex)}
                onToggleFullscreen={() => setFullscreenIndex(null)}
              />
            }
          >
            <div style={{ flex: 1, minHeight: 300, display: "flex" }}>
              {renderChart(timeframes[fullscreenIndex], `fs-${chartSymbol}-${timeframes[fullscreenIndex]}`)}
            </div>
          </Panel>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: theme.spacing.md,
            width: "100%",
            flex: 1,
          }}
        >
          {timeframes.map((tf, i) => (
            <Panel
              key={i}
              title={
                <PanelHeader
                  symbol={selectedSymbol}
                  timeframe={tf}
                  available={available}
                  onTimeframeChange={(newTf) => updateTimeframe(i, newTf as Timeframe)}
                  onRemove={() => removePanel(i)}
                  onToggleFullscreen={() => setFullscreenIndex(i)}
                />
              }
            >
              <div style={{ flex: 1, minHeight: 200, display: "flex" }}>
                {renderChart(tf, `${chartSymbol}-${tf}-${i}`)}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiTimeframeView;
