import React, { useMemo, useState } from "react";
import { useStore } from "../system/store";
import { theme } from "../../theme";

type Mode = "scalping" | "swing";

interface Tile {
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  strengthPct: number;
}

function deriveDirection(decision: string | undefined): Tile["direction"] {
  const d = (decision ?? "").toLowerCase();
  if (d.includes("long")) return "bullish";
  if (d.includes("short")) return "bearish";
  return "neutral";
}

// Darker/more intense fill = stronger bias; neutral tiles stay flat/dark.
function tileColor(tile: Tile): string {
  if (tile.direction === "neutral") return theme.colors.panelAlt;
  const base = tile.direction === "bullish" ? theme.colors.green : theme.colors.red;
  const alpha = Math.round(20 + (Math.min(100, Math.max(0, tile.strengthPct)) / 100) * 60);
  return `${base}${alpha.toString(16).padStart(2, "0")}`;
}

const MarketHeatmap: React.FC = () => {
  const [mode, setMode] = useState<Mode>("scalping");
  const liveFeed = useStore((s) => s.feed);
  const biasTableFeed = useStore((s) => s.biasTableFeed);
  const feed = Object.keys(biasTableFeed).length > 0 ? biasTableFeed : liveFeed;

  // Reuses the same alignment_signal.decision / confidence_pct already
  // shown in BiasTable's Signal column — no new engine/API fields.
  const tiles = useMemo<Tile[]>(() => {
    return Object.entries(feed).map(([symbol, data]: [string, any]) => {
      const modeData = data?.[mode];
      const decision = modeData?.alignment_signal?.decision;
      const confidence = modeData?.alignment_signal?.confidence_pct;
      return {
        symbol,
        direction: deriveDirection(decision),
        strengthPct: Math.round(confidence ?? 0),
      };
    });
  }, [feed, mode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "flex", gap: theme.spacing.sm, marginBottom: theme.spacing.sm, flex: "0 0 auto" }}>
        {(["scalping", "swing"] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "4px 10px",
                borderRadius: theme.radius.sm,
                border: `1px solid ${active ? theme.colors.accentBlue : theme.colors.grid}`,
                background: active
                  ? `linear-gradient(180deg, ${theme.colors.accentBlue}33, ${theme.colors.accentBlue}11)`
                  : "transparent",
                color: active ? theme.colors.accentBlue : theme.colors.text,
                fontWeight: active ? 600 : 400,
                fontSize: 12,
                letterSpacing: "0.5px",
                cursor: "pointer",
                transition: "all 0.25s ease",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {tiles.length === 0 ? (
        <div style={{ color: theme.colors.textDim, fontStyle: "italic" }}>
          No heatmap data available.
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
            gap: 6,
            alignContent: "start",
          }}
        >
          {tiles.map((tile) => (
            <div
              key={tile.symbol}
              title={`${tile.symbol} — ${tile.direction} ${tile.strengthPct}%`}
              style={{
                background: tileColor(tile),
                border: `1px solid ${theme.colors.grid}`,
                borderRadius: theme.radius.sm,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 4px",
                minHeight: 48,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.colors.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {tile.symbol}
              </span>
              <span style={{ fontSize: 11, color: theme.colors.textDim }}>{tile.strengthPct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketHeatmap;
