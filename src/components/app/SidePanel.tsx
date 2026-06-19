// SidePanel.tsx
import React from "react";

import { theme } from "../../theme";
import ResourceMonitorPanel from "../sidepanel/ResourceMonitorPanel";


const SidePanel: React.FC = () => {
  return (
    <div
      style={{
        width: "210px",
        background: theme.colors.panel,
        borderRight: `1px solid ${theme.colors.grid}`,
        color: theme.colors.textDim,
        padding: 1,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: theme.spacing.sm,
          width: "100%",
          maxWidth: "23rem",
        }}
      >
        <ResourceMonitorPanel />
      </div>
    </div>
  );
};

export default SidePanel;
