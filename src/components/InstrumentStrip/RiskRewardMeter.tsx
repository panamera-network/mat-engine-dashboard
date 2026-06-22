import React from "react";
import { theme } from "../../theme";
import { GaugeMeter } from "../../ui/GaugeMeter";

interface Props {
  risk: number;
  reward: number;
  size?: number;
}

export const RiskRewardMeter: React.FC<Props> = ({ risk, reward, size = 200 }) => {
  const safeRisk = typeof risk === "number" && isFinite(risk) && risk > 0 ? risk : 1;
  const safeReward = typeof reward === "number" && isFinite(reward) ? reward : 0;
  const ratio = safeReward / safeRisk;
  const clamped = Math.min(5, Math.max(0, ratio));
  const normalized = (clamped / 5) * 100;

  const color =
    ratio >= 2 ? theme.colors.green :
    ratio >= 1 ? theme.colors.amber :
    theme.colors.red;

  return (
    <GaugeMeter
      title="Risk/Reward"
      value={normalized}
      min={0}
      max={100}
      size={size}
      needleColor={color}
      formatValue={() => (
        <span style={{ fontWeight: 700, color }}>
          {isFinite(ratio) ? ratio.toFixed(2) : "—"} : 1
        </span>
      )}
    />
  );
};
