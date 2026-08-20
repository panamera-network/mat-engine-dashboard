import React from "react";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";

interface Props {
  short: number;
  mid: number;
  long: number;
}

export const TrendAlignmentGauge: React.FC<Props> = ({ short, mid, long }) => {
  const safeShort = Number.isFinite(short) ? short : 0;
  const safeMid = Number.isFinite(mid) ? mid : 0;
  const safeLong = Number.isFinite(long) ? long : 0;
  const values = [safeShort, safeMid, safeLong];
  const hasTrend = values.some((value) => value !== 0);
  const aligned =
    hasTrend &&
    Math.sign(safeShort) === Math.sign(safeMid) &&
    Math.sign(safeMid) === Math.sign(safeLong);

  const color = !hasTrend ? theme.colors.textDim : aligned ? theme.colors.green : theme.colors.red;
  const legColor = (value: number) =>
    value > 0 ? theme.colors.green : value < 0 ? theme.colors.red : theme.colors.textDim;

  return (
    <Panel title="Trend Alignment">
      <div style={{ display: "flex", justifyContent: "space-around", fontWeight: 700 }}>
        <span style={{ color: legColor(safeShort) }}>S</span>
        <span style={{ color: legColor(safeMid) }}>M</span>
        <span style={{ color: legColor(safeLong) }}>L</span>
      </div>
      <div style={{ marginTop: 8, fontWeight: 700, color }}>
        {!hasTrend ? "No trend data" : aligned ? "Aligned" : "Conflict"}
      </div>
    </Panel>
  );
};
