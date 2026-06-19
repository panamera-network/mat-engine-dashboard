// src/components/MultiTimeframe/PanelHeader.tsx
import React from "react";
import { theme } from "../../theme";

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

interface PanelHeaderProps {
  symbol: string;
  timeframe: Timeframe;
  available: Timeframe[];
  onTimeframeChange: (tf: Timeframe) => void;
  onRemove: () => void;
  onToggleFullscreen?: () => void;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  symbol,
  timeframe,
  available,
  onTimeframeChange,
  onRemove,
  onToggleFullscreen,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      }}
    >
      {/* Left group: symbol + timeframe */}
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.text }}>
          {symbol}
        </span>
        <select
          value={timeframe}
          onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
          style={{
            padding: "2px 6px",
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: theme.radius.sm,
            background: theme.colors.panel,
            color: theme.colors.text,
            fontSize: 12,
          }}
        >
          {available.map((tf) => (
            <option key={tf} value={tf}>
              {tf}
            </option>
          ))}
        </select>
      </div>

      {/* Right group: fullscreen + remove */}
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            style={{
              padding: "2px 6px",
              border: `1px solid ${theme.colors.grid}`,
              borderRadius: theme.radius.sm,
              background: theme.colors.panel,
              color: theme.colors.text,
              fontSize: 12,
              cursor: "pointer",
            }}
            title="Toggle fullscreen"
          >
            ⛶
          </button>
        )}
        <button
          onClick={onRemove}
          style={{
            padding: "2px 8px",
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: theme.radius.sm,
            background: theme.colors.panel,
            color: theme.colors.red,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ✖ Remove
        </button>
      </div>
    </div>
  );
};

export default PanelHeader;
