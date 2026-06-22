import React from "react";
import { GaugeMeter } from "../../ui/GaugeMeter";
import { useStore } from "../system/store";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";

interface VolumeMeterProps {
  size?: number;
}

export const VolumeMeter: React.FC<VolumeMeterProps> = ({ size = 200 }) => {
  const { dataKey } = useActiveSymbol();
  const rawVol = useStore((s) => (dataKey ? s.volume[dataKey] : undefined));
  const avgVol = useStore((s) => (dataKey ? s.avgVolume[dataKey] : 100));
  const value = typeof rawVol === "number" && isFinite(rawVol) ? rawVol : 0;
  const safeAvg = typeof avgVol === "number" && isFinite(avgVol) && avgVol > 0 ? avgVol : 100;
  const ratio = value / safeAvg;
  const clamped = Math.max(0, Math.min(200, ratio * 100));

  return (
    <GaugeMeter
      title="Volume meter"
      value={clamped}
      min={0}
      max={200}
      size={size}
      formatValue={() => (
        <>
          <span style={{ opacity: 0.75 }}>Vol:</span>
          <span style={{ fontWeight: 700, marginLeft: 6 }}>
            {isFinite(value) ? value.toFixed(0) : "—"}
          </span>
          <span style={{ opacity: 0.6, marginLeft: 6 }}>
            ({isFinite(clamped) ? Math.round(clamped) : "—"}%)
          </span>
        </>
      )}
    />
  );
};
