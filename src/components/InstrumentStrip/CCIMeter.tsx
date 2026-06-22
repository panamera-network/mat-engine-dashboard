import React from "react";
import { GaugeMeter } from "../../ui/GaugeMeter";
import { useStore } from "../system/store";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";

interface CCIMeterProps {
  size?: number;
}

export const CCIMeter: React.FC<CCIMeterProps> = ({ size = 200 }) => {
  const { dataKey } = useActiveSymbol();
  const rawCci = useStore((s) => (dataKey ? s.cci[dataKey] : undefined));
  const value = typeof rawCci === "number" && !isNaN(rawCci) ? rawCci : 0;

  return (
    <GaugeMeter
      title="CCI meter"
      value={value}
      min={-200}
      max={200}
      size={size}
      formatValue={(v) => (
        <>
          <span style={{ opacity: 0.75, marginRight: 6 }}>CCI:</span>
          <span style={{ fontWeight: 700 }}>
            {typeof rawCci === "number" && isFinite(rawCci) ? v.toFixed(0) : "—"}
          </span>
        </>
      )}
    />
  );
};
