// src/components/MomentumWaveform.tsx
import React from "react";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";
import { useStore } from "../system/store";

interface MomentumWaveformProps {
  height?: number;
}

export const MomentumWaveform: React.FC<MomentumWaveformProps> = ({ height = 120 }) => {
  const symbol = useStore((s) => s.selectedSymbol);
  const rawSamples = useStore((s) => (symbol ? s.momentum[symbol] : undefined));
  const samples: number[] = rawSamples ?? [];

  const baselineY = 50; // percent
  const max = Math.max(1, ...samples.map((v) => Math.abs(v)));

  const path = samples
    .map((v, i) => {
      const x = (i / Math.max(1, samples.length - 1)) * 100;
      const y = baselineY - (v / max) * 50;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <Panel title="Momentum waveform" style={{ width: "100%" }}>
      <div style={{ position: "relative", width: "100%", height }}>
        {/* Baseline */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 1,
            background: theme.colors.grid,
            opacity: 0.7,
          }}
        />
        {/* Positive glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: theme.colors.gradientWavePos,
            maskImage: `linear-gradient(180deg, transparent 50%, black 50%)`,
          }}
        />
        {/* Negative glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: theme.colors.gradientWaveNeg,
            maskImage: `linear-gradient(180deg, black 50%, transparent 50%)`,
          }}
        />
        {/* Wave path */}
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
             style={{ position: "absolute", inset: 0 }}>
          <path
            d={path}
            fill="none"
            stroke={theme.colors.text}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        {/* Label */}
        <div
          style={{
            position: "absolute",
            left: 8,
            bottom: 4,
            fontFamily: theme.fonts.label,
            color: theme.colors.textDim,
            fontSize: 12,
          }}
        >
          Negative pulses
        </div>
      </div>
    </Panel>
  );
};
