import React from "react";
import { GaugeMeter } from "../../ui/GaugeMeter";
import { useStore } from "../system/store";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";

interface VolatilityMeterProps {
  size?: number;
}

export const VolatilityMeter: React.FC<VolatilityMeterProps> = ({ size = 200 }) => {
  const { dataKey } = useActiveSymbol();
  const rawVol = useStore((s) => (dataKey ? s.volatility[dataKey] : undefined));
  const value = typeof rawVol === "number" && !isNaN(rawVol) ? rawVol : 0;

  return (
    <GaugeMeter
      title="Volatility meter"
      value={value}
      min={0}
      max={100}
      size={size}
      formatValue={(v) => (
        <>
          <span style={{ opacity: 0.75, marginRight: 6 }}>Value:</span>
          <span style={{ fontWeight: 700 }}>{v.toFixed(2)}</span>
        </>
      )}
    />
  );
};
