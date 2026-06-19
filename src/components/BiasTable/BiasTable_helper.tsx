import { theme } from "../../theme";
import type { BiasTF, StyleSnapshotTF } from "./types";

export const timeframes = ["M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"];

export const mapBiasCell = (biasObj: BiasTF | undefined) => {
  if (!biasObj || !biasObj.label) {
    return {
      text: "",
      style: { background: theme.colors.panelAlt, color: theme.colors.textDim },
      dataStrength: 0,
    };
  }
  const label = biasObj.label.toLowerCase();
  const strengthPct = Math.round(biasObj.strength_pct || 0);
  const roundedStrength = Math.min(
    100,
    Math.max(0, Math.round(strengthPct / 25) * 25)
  );

  let style: React.CSSProperties;
  if (label === "uptrend") {
    style = {
      background: theme.colors.green + "22",
      color: theme.colors.green,
      fontWeight: 600,
    };
  } else if (label === "downtrend") {
    style = {
      background: theme.colors.red + "22",
      color: theme.colors.red,
      fontWeight: 600,
    };
  } else {
    style = { background: theme.colors.panelAlt, color: theme.colors.textDim };
  }

  return {
    text: label === "neutral" ? "" : `${strengthPct}%`,
    style,
    dataStrength: roundedStrength,
  };
};

export const PanelCell: React.FC<{
  modeData: any;
  styleSnapshotTF: StyleSnapshotTF | undefined;
}> = ({ modeData, styleSnapshotTF }) => {
  const signal = `${modeData.alignment_signal.decision} ${modeData.alignment_signal.confidence_pct}%`;
  const breakdown = Object.entries(modeData.alignment_signal.breakdown ?? {})
    .map(([tf, val]) => `${tf}: ${val}`)
    .join(", ");
  const signalTooltip = `${modeData.alignment_signal.summary || ""}\n\nBreakdown: ${breakdown}`;

  const stageCheck = modeData.diagnostic?.stage ? "✅" : "";
  const actionCheck = modeData.diagnostic?.action ? "✅" : "";
  const reasonsText = modeData.diagnostic?.reasons?.length
    ? modeData.diagnostic.reasons.join(", ")
    : "No reasons provided";

  const momentum =
    styleSnapshotTF?.momentum ?? styleSnapshotTF?.momentum_pct ?? "";
  const duration = styleSnapshotTF?.duration ?? "";

  return (
    <>
      <td
        style={{
          padding: "2px 6px",
          fontSize: 12,
          color: theme.colors.text,
          textAlign: "center",
        }}
        title={signalTooltip}
      >
        {signal} <span style={{ marginLeft: 4 }}>ℹ️</span>
      </td>
      <td
        style={{
          padding: "2px 6px",
          fontSize: 12,
          color: theme.colors.text,
          textAlign: "center",
        }}
        title={reasonsText}
      >
        {stageCheck}
        {actionCheck} <span style={{ marginLeft: 4 }}>ℹ️</span>
      </td>
      <td
        style={{
          padding: "2px 6px",
          fontSize: 12,
          color: theme.colors.text,
          textAlign: "center",
        }}
      >
        {momentum}
      </td>
      <td
        style={{
          padding: "2px 6px",
          fontSize: 12,
          color: theme.colors.text,
          textAlign: "center",
        }}
      >
        {duration}
      </td>
    </>
  );
};
