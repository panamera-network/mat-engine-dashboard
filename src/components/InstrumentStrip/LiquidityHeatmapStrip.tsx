import React from "react";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";

export interface Level {
  price: number;
  size: number;
}

export const LiquidityHeatmapStrip: React.FC<{ levels: Level[] }> = ({ levels }) => {
  const maxSize = Math.max(...levels.map(l => l.size), 1);

  return (
    <Panel title="Liquidity Heatmap">
      <div style={{ display: "flex", height: 40, background: theme.colors.panelAlt }}>
        {levels.map((l, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: `rgba(0, 200, 255, ${l.size / maxSize})`,
              borderLeft: "1px solid rgba(255,255,255,0.05)",
            }}
            title={`${l.price} (${l.size})`}
          />
        ))}
      </div>
    </Panel>
  );
};
