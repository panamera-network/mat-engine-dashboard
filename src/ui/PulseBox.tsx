import React, { useState, useEffect, useMemo } from "react";
import { theme } from "../theme";
import { onPulse } from "./pulseBus";
import { classifyPulseTrigger } from "./classifyPulse";

export interface Pulse {
  ts: number;
  intensity: number; // 0–1
  color: string;     // e.g. theme.colors.green/red/amber
  glow: number;      // px radius from classifyPulse
  flashOnMount?: boolean;
}

export const PulseBox: React.FC<{
  children: React.ReactNode;
  flex?: number;
  trigger?: Pulse[];
  flashOnMount?: boolean;
}> = ({ children, flex, trigger, flashOnMount }) => {
  const triggerKey = useMemo(() => trigger?.map((p) => p.ts).join(","), [trigger]);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [flash, setFlash] = useState(false);
  
  
  useEffect(() => {
    if (trigger && trigger.length > 0) {
      setPulses(trigger);
      const timeout = setTimeout(() => setPulses([]), 1200);
      return () => clearTimeout(timeout);
    }
  }, [triggerKey]);

  useEffect(() => {
  if (trigger?.some((p) => p.intensity === 1 && p.color === theme.colors.green)) {
    setFlash(true);
    const timeout = setTimeout(() => setFlash(false), 300);
    return () => clearTimeout(timeout);
  }
}, [trigger]);

  useEffect(() => {
  if (flashOnMount) {
    setFlash(true);
    const timeout = setTimeout(() => setFlash(false), 300);
    return () => clearTimeout(timeout);
  }
}, [flashOnMount]);

useEffect(() => {
  const unsubscribe = onPulse(({ trigger }) => {
    const pulse = classifyPulseTrigger(trigger);

    setPulses((prev) => [...prev, pulse]);
    setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.ts !== pulse.ts));
    }, 1200);
  });

  return () => unsubscribe();
}, []);
  const shadows =
    pulses.length > 0
      ? pulses.map((p) => `0 0 ${p.glow}px ${p.color}`).join(", ")
      : `0 0 ${theme.pulse.soft.glow}px ${theme.colors.glow}`;

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${theme.colors.panel} 0%, ${theme.colors.panelAlt} 100%)`,
        border: `1px solid ${theme.colors.grid}`,
        borderRadius: theme.radius.sm,
        padding: theme.spacing.sm,
        color: theme.colors.text,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: flex ?? 1,
        boxShadow: shadows,
        backdropFilter: "blur(6px)",
        transition: "box-shadow 0.4s ease",
        animation: flash ? "pulseFlash 0.3s ease-out" : undefined,
      }}
    >
      {children}
    </div>
  );
};
