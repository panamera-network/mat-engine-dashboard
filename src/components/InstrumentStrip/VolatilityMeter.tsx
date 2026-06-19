// src/components/VolatilityMeter.tsx
import React from "react";
import { useSpring, animated } from "@react-spring/web";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";
import { useStore } from "../system/store";

interface VolatilityMeterProps {
  size?: number; // default 200
}

export const VolatilityMeter: React.FC<VolatilityMeterProps> = ({ size = 200 }) => {
  const symbol = useStore((s) => s.selectedSymbol);
  const rawVol = useStore((s) => (symbol ? s.volatility[symbol] : undefined));
  const value = typeof rawVol === "number" && !isNaN(rawVol) ? rawVol : 0;

  const clamped = Math.max(0, Math.min(100, value));
  const targetAngle = typeof clamped === "number" && !isNaN(clamped)
    ? -90 + (clamped / 100) * 180
    : -90;

  // ✅ Animate needle angle
  const spring = useSpring({
    angle: targetAngle,
    config: { tension: 120, friction: 20 },
  });

  return (
    <Panel title="Volatility meter">
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
              background: `linear-gradient(${theme.colors.text}, ${theme.colors.glow})`,
              transformOrigin: "bottom",
              transform: spring.angle.to((a) => `translateX(-50%) rotate(${a}deg)`),
              boxShadow: `0 0 12px ${theme.colors.glow}`,
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
              boxShadow: `0 0 18px ${theme.colors.glow}`,
            }}
          />
        </div>

        {/* Value readout */}
        <div
          style={{
            marginTop: theme.spacing.sm,
            fontFamily: theme.fonts.value,
            color: theme.colors.text,
          }}
        >
          <span style={{ opacity: 0.75, marginRight: 6 }}>Value:</span>
          <span style={{ fontWeight: 700 }}>{clamped.toFixed(2)}</span>
        </div>
      </div>
    </Panel>
  );
};
