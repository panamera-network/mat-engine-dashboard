import type { Mode } from './csm_types';
import { useStore } from '../system/store';
import { useMemo, useEffect, useState, useRef } from 'react';
import { lerpColor, theme } from '../../theme';

export function ModeToggle() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const lastUpdated = useStore((s) => s.lastUpdated);

  const [pulse, setPulse] = useState(false);
  const prevUpdateRef = useRef<Date | null>(null);
  const [fadeDuration, setFadeDuration] = useState(60);
  const [progress, setProgress] = useState(100);

  const modes: Mode[] = ['scalping', 'swing'];

  // Smoothly adapt fadeDuration if WS interval changes
  useEffect(() => {
    if (lastUpdated && prevUpdateRef.current) {
      const diffSec = (lastUpdated.getTime() - prevUpdateRef.current.getTime()) / 1000;
      if (diffSec > 0) {
        setFadeDuration((prev) => prev + (diffSec - prev) * 0.5);
      }
    }
    prevUpdateRef.current = lastUpdated || null;
  }, [lastUpdated]);

  // Trigger pulse on new data
  useEffect(() => {
    if (!lastUpdated) return;
    setPulse(true);
    setProgress(100);
    const t = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(t);
  }, [lastUpdated]);

  // Progress countdown
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => {
      const ageSec = (Date.now() - lastUpdated.getTime()) / 1000;
      const ratio = Math.max(0, 1 - ageSec / fadeDuration);
      setProgress(ratio * 100);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [lastUpdated, fadeDuration]);

  // Freshness color for text/glow
  const freshnessColor = useMemo(() => {
    if (!lastUpdated) return theme.colors.textDim;
    const ageSec = (Date.now() - lastUpdated.getTime()) / 1000;
    const ratio = Math.min(ageSec / fadeDuration, 1);
    return lerpColor(theme.colors.green, theme.colors.textDim, ratio);
  }, [lastUpdated, fadeDuration]);


  // Progress bar color: green → yellow → red
  const progressBarColor = useMemo(() => {
    const ratio = 1 - progress / 100;
    let r, g, b;
    if (ratio < 0.5) {
      const t = ratio / 0.5;
      r = Math.round(105 + (255 - 105) * t);
      g = 240;
      b = Math.round(174 - (174 - 0) * t);
    } else {
      const t = (ratio - 0.5) / 0.5;
      r = 255;
      g = Math.round(240 - (240 - 0) * t);
      b = 0;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }, [progress]);

  return (
    <div
      style={{
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      {/* Mode buttons */}
      
      <div style={{ display: "flex", gap: theme.spacing.sm }}>
        {modes.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "4px 10px",
                borderRadius: theme.radius.sm,
                border: `1px solid ${active ? theme.colors.accentBlue : theme.colors.grid}`,
                background: active
                  ? `linear-gradient(180deg, ${theme.colors.accentBlue}33, ${theme.colors.accentBlue}11)`
                  : "transparent",
                color: active ? theme.colors.accentBlue : theme.colors.text,
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                letterSpacing: "0.5px",
                cursor: "pointer",
                transition: "all 0.25s ease",
                textTransform: "capitalize",
                boxShadow: active ? `0 0 8px ${theme.colors.accentBlue}` : "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = theme.colors.accentBlue;
                (e.currentTarget as HTMLButtonElement).style.color = theme.colors.accentBlue;
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = theme.colors.grid;
                  (e.currentTarget as HTMLButtonElement).style.color = theme.colors.text;
                }
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          );
        })}
      </div>


      {/* Last updated + progress bar */}
      {lastUpdated && (
        <div style={{ textAlign: 'right', minWidth: '160px' }}>
          <div
            style={{
              fontSize: '0.8rem',
              color: freshnessColor,
              fontWeight: pulse ? 'bold' : 'normal',
              transform: pulse ? 'scale(1.05)' : 'scale(1)',
              backgroundColor: pulse
                ? `${freshnessColor.replace('rgb', 'rgba').replace(')', ', 0.15)')}`
                : 'transparent',
              padding: '2px 6px',
              borderRadius: '4px',
              boxShadow: pulse ? `0 0 8px ${freshnessColor}` : 'none',
              transition:
                'color 0.5s linear, transform 0.3s ease, font-weight 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease'
            }}
          >
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          {/* Progress bar with pulsing track */}
          <div
            style={{
              marginTop: 2,
              height: 4,
              borderRadius: 2,
              overflow: "hidden",
              background: "rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: progressBarColor,
                transition: "width 0.25s linear",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
