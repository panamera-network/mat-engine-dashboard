// src/components/Panel.tsx
import React from "react";
import { theme } from "../theme";

type PanelProps = React.PropsWithChildren<{
  title?: React.ReactNode;
}> & Omit<React.HTMLAttributes<HTMLDivElement>, "title">; // ✅ inherit div props but avoid HTML title conflict

export const Panel: React.FC<PanelProps> = ({ title, children, style, ...rest }) => {
  return (
    <div
      {...rest} // ✅ spreads className, onClick, etc.
      style={{
        border: `1px solid ${theme.colors.grid}`,
        borderRadius: theme.radius.sm,
        background: theme.colors.panel,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        ...(style || {}), // ✅ merge user style
      }}
    >
      {title && (
        <div
          style={{
            borderBottom: `1px solid ${theme.colors.grid}`,
            padding: "4px 8px",
            background: theme.colors.panelAlt,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
};
