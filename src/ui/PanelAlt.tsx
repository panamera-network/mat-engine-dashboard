import React from "react";
import { theme } from "../theme";

type PanelProps = {
  title?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const PanelAlt: React.FC<PanelProps> = ({ title, style, children }) => {
  return (
    <div
      style={{
        background: theme.colors.panelAlt, // ✅ dimmer background
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: theme.fonts.label,
            fontSize: 13,
            fontWeight: 600,
            color: theme.colors.textDim,
            marginBottom: theme.spacing.xs,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};
