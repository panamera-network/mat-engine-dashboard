export const cockpit = {
  devMode: import.meta.env.DEV,
  // other flags...
};

export type Theme = typeof theme;
export const theme = {
  radius: {
    sm: '8px',
    md: '12px',
  },
  spacing: {
    xs: '6px',
    sm: '10px',
    md: '16px',
    lg: '24px',
  },
  colors: {
    bg: '#0f1218',
    panel: '#141922',
    panelAlt: '#171d27',
    text: '#e7ebf3',
    textDim: '#a9b4c9',
    grid: '#263041',
    glow: 'rgba(83, 200, 255, 0.35)',
    
    green: '#3bd389',
    amber: '#f4be59',
    red: '#ff6b6b',

    // Gradients
    gradientGauge:
      'conic-gradient(from 200deg, #3bd389 0 35%, #f4be59 35% 70%, #ff6b6b 70% 100%)',
    gradientWavePos:
      'linear-gradient(180deg, rgba(59,211,137,0.35), rgba(59,211,137,0.07))',
    gradientWaveNeg:
      'linear-gradient(180deg, rgba(255,107,107,0.35), rgba(255,107,107,0.07))',
    gradientSparkBg:
      'linear-gradient(180deg, rgba(59,211,137,0.15), rgba(244,190,89,0.15) 50%, rgba(255,107,107,0.15))',

    bgPrimary: '#0f1218',         // alias for bg
    bgSecondary: '#141922',       // alias for panel
    textPrimary: '#e7ebf3',       // alias for text
    textSecondary: '#a9b4c9',     // alias for textDim
    border: '#263041',            // alias for grid

    accentGreen: '#3bd389',       // alias for green
    accentYellow: '#f4be59',      // alias for amber
    accentRed: '#ff6b6b',         // alias for red
    accentBlue: '#53c8ff',
    accentCyan: "#00FFFF",
    purple : "#9b39f2ff",

    freshness: {
      good: "#00ff99",
      warn: "#ffaa33",
      bad: "#ff3366",
    },

  },
  fonts: {
    label:
      'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    value:
      'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    mono:
       "'JetBrains Mono', monospace",
  },



  // 🔹 Additions for cockpit polish
  glow: {
    swing: (conf: number, color: string) =>
      conf === 100 ? `0 0 ${12 + conf / 10}px ${color}` : 'none',
    scalp: (conf: number, color: string) =>
      conf === 100 ? `0 0 ${8 + conf / 12}px ${color}` : 'none',
  },

  gradients: {
    bias: (color: string) =>
      `linear-gradient(90deg, ${color} 0%, rgba(15,18,24,0.2) 100%)`,
  },

  easing: {
    grow: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    snap: 'width 0.3s cubic-bezier(0.7, -0.4, 0.9, 0.6)',
  },

  pulse: {
    soft: { min: 0, max: 0.3, glow: 10 },
    medium: { min: 0.3, max: 0.7, glow: 18 },
    critical: { min: 0.7, max: 1, glow: 28 },
  },

};

/** Glow sizing from numeric intensity (0–1) — used by Zustand store pulses */
export function classifyPulseIntensity(intensity: number) {
  if (intensity >= theme.pulse.critical.min) return { level: "critical", glow: theme.pulse.critical.glow };
  if (intensity >= theme.pulse.medium.min) return { level: "medium", glow: theme.pulse.medium.glow };
  return { level: "soft", glow: theme.pulse.soft.glow };
}

export function lerpColor(c1: string, c2: string, t: number) {
  const parse = (c: string) =>
    c.match(/\w\w/g)!.map((x) => parseInt(x, 16));
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}