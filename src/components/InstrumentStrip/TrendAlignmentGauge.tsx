import React from "react";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";

interface Props {
  short: number; // short-term trend slope
  mid: number;   // mid-term trend slope
  long: number;  // long-term trend slope
}

export const TrendAlignmentGauge: React.FC<Props> = ({ short, mid, long }) => {
  const safeShort = typeof short === "number" && isFinite(short) ? short : 0;
  const safeMid = typeof mid === "number" && isFinite(mid) ? mid : 0;
  const safeLong = typeof long === "number" && isFinite(long) ? long : 0;

  const aligned =
    Math.sign(safeShort) === Math.sign(safeMid) &&
    Math.sign(safeMid) === Math.sign(safeLong);

  const color = aligned ? theme.colors.green : theme.colors.red;

  return (
    <Panel title="Trend Alignment">
      <div style={{ display: "flex", justifyContent: "space-around", fontWeight: 700 }}>
        <span style={{ color: safeShort > 0 ? theme.colors.green : theme.colors.red }}>
          {isFinite(short) ? "S" : "—"}
        </span>
        <span style={{ color: mid > 0 ? theme.colors.green : theme.colors.red }}>M</span>
        <span style={{ color: long > 0 ? theme.colors.green : theme.colors.red }}>L</span>
      </div>
      <div style={{ marginTop: 8, fontWeight: 700, color }}>
        {aligned ? "Aligned" : "Conflict"}
      </div>
    </Panel>
  );
};
