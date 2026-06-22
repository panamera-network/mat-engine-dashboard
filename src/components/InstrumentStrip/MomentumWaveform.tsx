import React from "react";
import { useStore } from "../system/store";
import { useActiveSymbol } from "../../hooks/useActiveSymbol";

interface MomentumWaveformProps {
  height?: number;
}

export const MomentumWaveform: React.FC<MomentumWaveformProps> = ({ height = 120 }) => {
  const { dataKey } = useActiveSymbol();
  const rawSamples = useStore((s) => (dataKey ? s.momentum[dataKey] : undefined));
  const samples: number[] = rawSamples ?? [];

  const baselineY = 50;
  const max = Math.max(1, ...samples.map((v) => Math.abs(v)));

  const path = samples
    .map((v, i) => {
      const x = (i / Math.max(1, samples.length - 1)) * 100;
      const y = baselineY - (v / max) * 50;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ position: "relative", width: "100%", height, color: "#e7ebf3" }}>
      <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.7 }}>Momentum waveform</div>
      <div style={{ position: "relative", width: "100%", height: height - 20 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 1,
            background: "#263041",
            opacity: 0.7,
          }}
        />
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0 }}
        >
          <path
            d={path || "M0,50 L100,50"}
            fill="none"
            stroke="#e7ebf3"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};
