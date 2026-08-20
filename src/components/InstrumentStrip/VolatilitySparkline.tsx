// src/components/VolatilitySparkline.tsx
import React from 'react';
import { theme } from '../../theme';
import { Panel } from '../../ui/Panel';

interface VolatilitySparklineProps {
  points: number[];
  marker?: { index: number; label: string };
  height?: number;
}

export const VolatilitySparkline: React.FC<VolatilitySparklineProps> = ({
  points,
  marker,
  height = 90,
}) => {
  const max = Math.max(1, ...points);
  const hasPoints = points.length > 0;

  const path = points
    .map((v, i) => {
      const x = (i / Math.max(1, points.length - 1)) * 100; // % based
      const y = 100 - (v / max) * 100;
      return `${i === 0 ? 'M' : 'L'}${x}%,${y}%`;
    })
    .join(' ');

  const markerX = marker && points.length > 1 ? (marker.index / (points.length - 1)) * 100 : null;
  const markerY = marker && points[marker.index] !== undefined ? 100 - (points[marker.index] / max) * 100 : null;

  return (
    <Panel title="Volatility sparkline" style={{ width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', height }}>
        {/* Background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.colors.gradientSparkBg,
            borderRadius: theme.radius.sm,
          }}
        />
        {/* Grid line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 1,
            background: theme.colors.grid,
            opacity: 0.6,
          }}
        />
        {/* Spark path */}
        <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none"
             style={{ position: 'absolute', inset: 0 }}>
          <path
            d={hasPoints ? path : "M0%,50% L100%,50%"}
            fill="none"
            stroke={hasPoints ? theme.colors.text : theme.colors.textDim}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {marker && markerX !== null && markerY !== null && (
            <>
              <circle cx={`${markerX}%`} cy={`${markerY}%`} r={2} fill={theme.colors.red} />
              {/* Label bubble */}
              <text
                x={`${markerX}%`}
                y={`${markerY}%`}
                dy={-6}
                textAnchor="middle"
                fill={theme.colors.text}
                fontFamily={theme.fonts.value}
                fontSize="11"
                fontWeight={700}
              >
                {marker.label}
              </text>
            </>
          )}
        </svg>
        {!hasPoints && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: theme.colors.textDim, fontSize: 12 }}>
            No volatility history
          </div>
        )}
      </div>
    </Panel>
  );
};
