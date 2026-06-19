import React from "react";
import { theme } from "../theme";
import "../index.css";

interface ScrollBoxProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const ScrollBox: React.FC<ScrollBoxProps> = ({ children, style, className }) => {
  return (
    <div
      className={`themed-scroll ${className ?? ""}`}
      style={{
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.colors.accentBlue} transparent`,
        flex: 1,
        minHeight: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
