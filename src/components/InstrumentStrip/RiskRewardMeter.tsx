// src/components/RiskRewardMeter.tsx
import React from "react";
import { useSpring, animated } from "@react-spring/web";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";

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
  const targetAngle = isFinite(normalized)
    ? -90 + (normalized / 100) * 180
    : -90;


  const spring = useSpring({
    angle: targetAngle,
    config: { tension: 120, friction: 20 },
  });

  const color =
    ratio >= 2 ? theme.colors.green :
    ratio >= 1 ? theme.colors.amber :
    theme.colors.red;

  return (
    <Panel title="Risk/Reward">
      <div style={{ display: "grid", paddingTop: size * 0.1, placeItems: "center" }}>
        <div style={{ position: "relative", width: size, height: size / 2 }}>
          {/* Gauge arc */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderTopLeftRadius: size,
              borderTopRightRadius: size,
              background: theme.colors.gradientGauge,
              WebkitMaskImage: `radial-gradient(${size / 2}px ${size / 2}px at 50% 100%, transparent 49%, black 51%)`,
              maskImage: `radial-gradient(${size / 2}px ${size / 2}px at 50% 100%, transparent 49%, black 51%)`,
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))",
            }}
          />

          {/* Animated needle */}
          <animated.div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: 2,
              height: size * 0.45,
              background: color,
              transformOrigin: "bottom",
              transform: spring.angle.to((a) => `translateX(-50%) rotate(${a}deg)`),
              boxShadow: `0 0 12px ${color}`,
            }}
          />

          {/* Needle hub */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: size * 0.08,
              height: size * 0.08,
              borderRadius: "50%",
              background: theme.colors.panelAlt,
              border: `2px solid ${theme.colors.text}`,
              transform: "translate(-50%, 50%)",
              boxShadow: `0 0 18px ${color}`,
            }}
          />
        </div>

        {/* Value readout */}
        <div
          style={{
            marginTop: theme.spacing.sm,
            fontFamily: theme.fonts.value,
            fontWeight: 700,
            color,
          }}
        >
          {isFinite(ratio) ? ratio.toFixed(2) : "—"} : 1
        </div>
      </div>
    </Panel>
  );
};
