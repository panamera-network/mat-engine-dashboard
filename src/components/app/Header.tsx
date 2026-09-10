//header.tsx
import React, { useState } from "react";
import { theme } from "../../theme";
import { useSystemStatus } from "../sidepanel/useSystemStatus";
import { useStore } from "../system/store";

type DotStatus = "ok" | "bad" | "neutral";

const dotColor = (status: DotStatus) => {
  if (status === "ok") return theme.colors.green;
  if (status === "bad") return theme.colors.red;
  return theme.colors.textDim;
};

const StatusDot: React.FC<{ status: DotStatus; label: string }> = ({ status, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: dotColor(status),
        flexShrink: 0,
      }}
    />
    <span style={{ color: theme.colors.textDim, fontSize: 12 }}>{label}</span>
  </div>
);

const Divider: React.FC = () => (
  <span style={{ color: theme.colors.grid, fontSize: 12 }}>|</span>
);

const PercentStat: React.FC<{ label: string; value: number | null }> = ({ label, value }) => {
  const color =
    value === null
      ? theme.colors.textDim
      : value > 90
      ? theme.colors.red
      : value > 70
      ? theme.colors.amber
      : theme.colors.green;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span style={{ color: theme.colors.textDim, fontSize: 12 }}>{label}</span>
      <span style={{ color, fontSize: 12, fontFamily: theme.fonts.mono, fontWeight: 600 }}>
        {value === null ? "—" : `${value.toFixed(0)}%`}
      </span>
    </div>
  );
};

const Header: React.FC = () => {
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "dim">("dark");

  const { data: status, dataUpdatedAt } = useSystemStatus();
  const wsBiasStatus = useStore((s) => s.wsBiasStatus);
  const wsTickStatus = useStore((s) => s.wsTickStatus);

  const toggleTheme = () => {
    const nextTheme =
      themeMode === "dark" ? "dim" :
      themeMode === "dim" ? "light" : "dark";

    setThemeMode(nextTheme);
    document.body.setAttribute("data-theme", nextTheme);
  };

  const strategyStatus: DotStatus = !status
    ? "neutral"
    : status.strategy === "unknown"
    ? "neutral"
    : status.strategy === "offline"
    ? "bad"
    : "ok";

  const backendStatus: DotStatus = !status
    ? "neutral"
    : status.backend === "unknown"
    ? "neutral"
    : status.backend === "offline"
    ? "bad"
    : "ok";

  const mt5Status: DotStatus = !status?.mt5 ? "neutral" : status.mt5.initialized ? "ok" : "bad";

  const dataFeedStatus: DotStatus =
    wsBiasStatus === "connected" && wsTickStatus === "connected"
      ? "ok"
      : wsBiasStatus === "disconnected" || wsTickStatus === "disconnected"
      ? "bad"
      : "neutral";

  const lastUpdateLabel = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";

  return (
    <header
      style={{
        width: "100%",
        height: "40px",
        background: theme.colors.panel,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: theme.spacing.md,
        fontSize: 13,
        color: theme.colors.accentBlue,
        borderBottom: `1px solid ${theme.colors.grid}`,
        flexShrink: 0,
        padding: `0 ${theme.spacing.md}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.md,
          minWidth: 0,
          overflowX: "auto",
        }}
      >
        <StatusDot status={strategyStatus} label="Strategy Engine" />
        <Divider />
        <StatusDot status={backendStatus} label="Backend" />
        <Divider />
        <StatusDot status={mt5Status} label="MT5" />
        <Divider />
        <StatusDot status={dataFeedStatus} label="Data Feed" />
        <Divider />
        <PercentStat label="CPU" value={status ? status.cpu : null} />
        <Divider />
        <PercentStat label="RAM" value={status ? status.ram : null} />
      </div>

      <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>Mat-AI Engine Dashboard</div>

      <div style={{ display: "flex", alignItems: "center", justifySelf: "end", gap: theme.spacing.md, whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{ color: theme.colors.textDim }}>Last Update</span>
          <span style={{ color: theme.colors.text, fontFamily: theme.fonts.mono }}>{lastUpdateLabel}</span>
        </div>

        <button
          onClick={toggleTheme}
          style={{
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
        >
          {themeMode === "dark"
            ? "🌙 Dim"
            : themeMode === "dim"
            ? "☀️ Light"
            : "🌑 Dark"}
        </button>
      </div>
    </header>
  );
};

export default Header;
