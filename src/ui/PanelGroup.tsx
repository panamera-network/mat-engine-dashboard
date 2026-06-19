import React from "react";
import { theme } from "../theme";

type PanelGroupProps = {
  direction?: "row" | "column";
  gap?: keyof typeof theme.spacing;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const PanelGroup: React.FC<PanelGroupProps> = ({
  direction = "row",
  gap = "md",
  style,
  children,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        gap: theme.spacing[gap],
        alignItems: "stretch",
        justifyContent: "stretch",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
