//header.tsx
import React, { useState } from "react";
import { theme } from "../../theme";

const Header: React.FC = () => {
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "dim">("dark");

  const toggleTheme = () => {
    const nextTheme =
      themeMode === "dark" ? "dim" :
      themeMode === "dim" ? "light" : "dark";

    setThemeMode(nextTheme);
    document.body.setAttribute("data-theme", nextTheme);
  };

  return (
    <header
      style={{
        width: "100%",
        height: "35px",
        background: theme.colors.panel,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: theme.colors.accentBlue,
        borderBottom: `1px solid ${theme.colors.grid}`,
        position: "relative",
      }}
    >
      <div style={{ fontWeight: 600 }}>Mat-AI Engine Dashboard</div>

      <button
        onClick={toggleTheme}
        style={{
          position: "absolute",
          right: 20,
          padding: "2px 8px",
          fontSize: 12,
          border: `1px solid ${theme.colors.grid}`,
          borderRadius: theme.radius.sm,
          background: theme.colors.bg,
          color: theme.colors.text,
          cursor: "pointer",
          transition: "all 0.2s ease",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = theme.colors.accentBlue;
          e.currentTarget.style.borderColor = theme.colors.accentBlue;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = theme.colors.text;
          e.currentTarget.style.borderColor = theme.colors.grid;
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.colors.accentBlue;
          e.currentTarget.style.boxShadow = `0 0 6px ${theme.colors.accentBlue}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = theme.colors.grid;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {themeMode === "dark"
          ? "🌙 Dim"
          : themeMode === "dim"
          ? "☀️ Light"
          : "🌑 Dark"}
      </button>
    </header>
  );
};

export default Header;
