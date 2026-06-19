import React from "react";
import { theme } from "../theme";

type ButtonProps = {
  label: string;
  onClick?: () => void;
};

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      borderRadius: theme.radius.sm,
      border: `1px solid ${theme.colors.grid}`,
      background: theme.colors.panel,
      color: theme.colors.text,
      fontFamily: theme.fonts.label,
      fontSize: 13,
      cursor: "pointer",
      transition: "all 0.2s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = theme.colors.accentBlue;
      e.currentTarget.style.color = theme.colors.accentBlue;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = theme.colors.grid;
      e.currentTarget.style.color = theme.colors.text;
    }}
  >
    {label}
  </button>
);
