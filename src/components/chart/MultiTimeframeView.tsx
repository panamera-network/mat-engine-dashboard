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
  const setActiveProfile = useStore((s) => s.setActiveProfile);
  const saveProfile = useStore((s) => s.saveProfile);
  const deleteProfile = useStore((s) => s.deleteProfile);

  const timeframes = profiles[activeProfile] ?? ["5m", "1h"];
  const [newProfileName, setNewProfileName] = useState("");
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const available: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

  const updateTimeframe = (index: number, tf: Timeframe) => {
    const updated = [...timeframes];
    updated[index] = tf;
    saveProfile(activeProfile, updated);
  };

  const addPanel = () => saveProfile(activeProfile, [...timeframes, "15m"]);
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: `${theme.spacing.sm} 0`,
          gap: theme.spacing.md,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
          <select
            value={activeProfile}
            onChange={(e) => setActiveProfile(e.target.value)}
            style={{
              padding: theme.spacing.xs,
              border: `1px solid ${theme.colors.grid}`,
              borderRadius: theme.radius.sm,
              background: theme.colors.panel,
              color: theme.colors.text,
              fontSize: 12,
            }}
          >
            {Object.keys(profiles).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="New profile"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            style={{
              padding: theme.spacing.xs,
              border: `1px solid ${theme.colors.grid}`,
              borderRadius: theme.radius.sm,
              background: theme.colors.panelAlt,
              color: theme.colors.text,
              fontSize: 12,
            }}
          />

          <button
            onClick={() => {
              if (newProfileName.trim()) {
                saveProfile(newProfileName.trim(), timeframes);
                setNewProfileName("");
              }
            }}
            style={{
              padding: "4px 8px",
              border: `1px solid ${theme.colors.accentBlue}`,
              borderRadius: theme.radius.sm,
              background: "transparent",
              color: theme.colors.accentBlue,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            💾 Save As
          </button>

          {activeProfile !== "Default" && (
            <button
              onClick={() => deleteProfile(activeProfile)}
              style={{
                padding: "4px 8px",
                border: `1px solid ${theme.colors.red}`,
                borderRadius: theme.radius.sm,
                background: "transparent",
                color: theme.colors.red,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              🗑 Delete
            </button>
          )}
        </div>

        <button
          onClick={addPanel}
          style={{
            padding: "4px 8px",
            border: `1px solid ${theme.colors.accentBlue}`,
            borderRadius: theme.radius.sm,
            background: "transparent",
            color: theme.colors.accentBlue,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ➕ Add Chart
        </button>
      </div>

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
