import React from "react";
import { theme } from "../../theme";
import { useStore } from "../system/store";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";

import { AuditTrail } from "./AuditTrail";
import { ScalpVerdict } from "./ScalpVerdict";
import { CCIMeter } from "./CCIMeter";

// Simplified to Scalp Diagnostics: Audit Trail, verdict bar, CCI only.
// BiasConfidenceTimeline / VolatilitySparkline / MomentumWaveform /
// VolatilityMeter / VolumeMeter / RiskRewardMeter / TrendAlignmentGauge /
// LiquidityHeatmapStrip are unmounted, not deleted — their components and
// backing store fields (volatilityHistory, riskDistance, rewardDistance,
// trendSlope, liquidityLevels) are untouched for later reuse.
export const InstrumentStrip: React.FC = () => {
  const { feedKey, dataKey } = useActiveSymbol();

  const auditTrail = useStore((s) => s.auditTrail);
  const biasTimeline = useStore((s) => s.biasTimeline);

  const timeline = biasTimeline[feedKey] ?? biasTimeline[dataKey] ?? [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: theme.spacing.md,
        width: "100%",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <div style={{ flex: 1.4, minWidth: 0 }}>
        <AuditTrail events={auditTrail} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <ScalpVerdict timeline={timeline} symbol={feedKey} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <CCIMeter size={90} />
      </div>
    </div>
  );
};
