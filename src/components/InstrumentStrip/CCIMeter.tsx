import React from "react";
import { useSpring, animated } from "@react-spring/web";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";
import { useStore } from "../system/store";

interface CCIMeterProps {
  size?: number;
}

export const CCIMeter: React.FC<CCIMeterProps> = ({ size = 200 }) => {
  const symbol = useStore((s) => s.selectedSymbol);
  const rawCci = useStore((s) => (symbol ? s.cci[symbol] : undefined));
  const value = typeof rawCci === "number" && !isNaN(rawCci) ? rawCci : 0;

  const clamped = Math.max(-200, Math.min(200, value));
  const normalized = (clamped + 200) / 400 * 100;
  const targetAngle = isFinite(normalized)
    ? -90 + (normalized / 100) * 180
    : -90;

  const spring = useSpring({
    angle: targetAngle,
    config: { tension: 120, friction: 20 },
  });

  return (
    <Panel title="CCI meter" style={{ width: "100%" }}>
      <div style={{ display: "grid", paddingTop: size * 0.1, placeItems: "center", width: "100%" }}>
        <div style={{ position: "relative", width: size, height: size / 2 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderTopLeftRadius: size,
              borderTopRightRadius: size,
              background: theme.colors.gradientGauge,
              WebkitMaskImage: `radial-gradient(${size/2}px ${size/2}px at 50% 100%, transparent 49%, black 51%)`,
              maskImage: `radial-gradient(${size/2}px ${size/2}px at 50% 100%, transparent 49%, black 51%)`,
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))",
            }}
          />
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
        <div
          style={{
            marginTop: theme.spacing.sm,
            fontFamily: theme.fonts.value,
            color: theme.colors.text,
          }}
        >
          <span style={{ opacity: 0.75, marginRight: 6 }}>CCI:</span>
          <span style={{ fontWeight: 700 }}>
            {typeof rawCci === "number" && isFinite(rawCci) ? clamped.toFixed(0) : "—"}
          </span>
        </div>
      </div>
    </Panel>
  );
};
