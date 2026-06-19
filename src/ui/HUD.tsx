// src/ui/HUD.tsx
import React from "react";
import { theme } from "../theme";

type HUDVariant = "default" | "info" | "warning" | "critical";


export const HUDHeader: React.FC<{
  children: React.ReactNode;
  variant?: HUDVariant;
}> = ({ children, variant = "default" }) => {
  const colorMap: Record<HUDVariant, string> = {
    default: theme.colors.accentBlue,
    info: theme.colors.accentCyan,
    warning: theme.colors.amber,
    critical: theme.colors.red,
  };

  const baseColor = colorMap[variant];

  return (
    <h4
      style={{
        margin: 0,
        marginBottom: theme.spacing.xs,
        fontSize: 18,
        fontWeight: 600,
        color: baseColor,
        textShadow: `0 0 6px ${baseColor}`,
        letterSpacing: "0.5px",
        transition: "text-shadow 0.3s ease, color 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textShadow = `0 0 12px ${baseColor}`;
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textShadow = `0 0 6px ${baseColor}`;
        e.currentTarget.style.color = baseColor;
      }}
    >
      {children}
    </h4>
  );
};


export const separator = (
  <div
    style={{
      height: 1,
      background: `linear-gradient(90deg, transparent, ${theme.colors.accentBlue}, transparent)`,
      margin: `${theme.spacing.xs} 0`,
    }}
  />
);

// usage :
// <HUDHeader variant="warning">⚠️ Escalation Detected</HUDHeader>
// <HUDHeader variant="critical">🔥 System Overload</HUDHeader>
// <HUDHeader variant="info">ℹ️ Session Tracker</HUDHeader>
