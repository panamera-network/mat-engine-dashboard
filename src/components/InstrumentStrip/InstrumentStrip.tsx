import React from "react";
import { theme } from "../../theme";
import { useStore } from "../system/store";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";

import { AuditTrail } from "./AuditTrail";
import { ScalpVerdict } from "./ScalpVerdict";
import { BiasConfidenceTimeline } from "./BiasConfidenceTimeline";
import { VolatilitySparkline } from "./VolatilitySparkline";
import { MomentumWaveform } from "./MomentumWaveform";
import { VolatilityMeter } from "./VolatilityMeter";
import { CCIMeter } from "./CCIMeter";
import { VolumeMeter } from "./VolumeMeter";
import { RiskRewardMeter } from "./RiskRewardMeter";
import { TrendAlignmentGauge } from "./TrendAlignmentGauge";
import { LiquidityHeatmapStrip } from "./LiquidityHeatmapStrip";

export const InstrumentStrip: React.FC = () => {
  const { feedKey, dataKey } = useActiveSymbol();

  const auditTrail = useStore((s) => s.auditTrail);
  const volatilityHistory = useStore((s) => s.volatilityHistory);
  const risk = useStore((s) => s.riskDistance);
  const reward = useStore((s) => s.rewardDistance);
  const trendSlope = useStore((s) => s.trendSlope);
  const liquidityLevels = useStore((s) => s.liquidityLevels);
  const biasTimeline = useStore((s) => s.biasTimeline);

  const sparkPoints = volatilityHistory[feedKey] ?? volatilityHistory[dataKey] ?? [];
  const trend = trendSlope[feedKey] ?? trendSlope[dataKey] ?? { short: 0, mid: 0, long: 0 };
  const liquidity = liquidityLevels[feedKey] ?? liquidityLevels[dataKey] ?? [];
  const timeline = biasTimeline[feedKey] ?? biasTimeline[dataKey] ?? [];

  const size = 200;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: "100%",
      }}
    >
      <AuditTrail events={auditTrail} />
      <ScalpVerdict timeline={timeline} symbol={feedKey} />
      <BiasConfidenceTimeline symbol={feedKey} />
      <div style={{ display: "flex", gap: theme.spacing.md, width: "100%" }}>
        <div style={{ flex: 1 }}>
          <VolatilitySparkline
            points={sparkPoints}
            marker={
              sparkPoints.length > 0
                ? {
                    index: sparkPoints.length - 1,
                    label: sparkPoints[sparkPoints.length - 1]?.toString(),
                  }
                : undefined
            }
          />
        </div>
        <div style={{ flex: 1 }}>
          <MomentumWaveform />
        </div>
      </div>
      <div style={{ display: "flex", gap: theme.spacing.md, width: "100%" }}>
        <div style={{ flex: 1 }}>
          <VolatilityMeter size={size} />
        </div>
        <div style={{ flex: 1 }}>
          <CCIMeter size={size} />
        </div>
      </div>
      <div style={{ display: "flex", gap: theme.spacing.md, width: "100%" }}>
        <div style={{ flex: 1 }}>
          <VolumeMeter size={size} />
        </div>
        <div style={{ flex: 1 }}>
          <RiskRewardMeter risk={risk} reward={reward} size={size} />
        </div>
      </div>
      <div style={{ display: "flex", gap: theme.spacing.md, width: "100%" }}>
        <div style={{ flex: 1 }}>
          <TrendAlignmentGauge short={trend.short} mid={trend.mid} long={trend.long} />
        </div>
        <div style={{ flex: 1 }}>
          <LiquidityHeatmapStrip levels={liquidity} />
        </div>
      </div>
    </div>
  );
};
