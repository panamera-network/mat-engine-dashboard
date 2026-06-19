import React from "react";
import { useSystemStatus } from "./useSystemStatus";
import { theme } from "../../theme";
import { PulseBox } from "../../ui/PulseBox";
import { HUDHeader, separator } from "../../ui/HUD";
import SystemAlertPulse from "./SystemAlertPulse";
import { useStore } from "../system/store";

interface MetricProps {
  label: string;
  value: React.ReactNode;
  type?: "cpu" | "ram" | "gpu" | "default";
}

const blinkStyle = {
  fontFamily: "monospace",
  animation: "blink 1s infinite ease-in-out",
};

const renderStatus = (status: "connected" | "disconnected" | "reconnecting") => {
  if (status === "connected") return "🟢 Connected";
  if (status === "disconnected") return "🔴 Disconnected";
  return <span style={blinkStyle}>(...)</span>;
};

const ResourceMonitorPanel: React.FC = () => {
  const wsBiasStatus = useStore((s) => s.wsBiasStatus);
  const wsTickStatus = useStore((s) => s.wsTickStatus);
  const { data: status, isLoading, isError } = useSystemStatus();

  if (isLoading) return <p>Loading system status...</p>;
  if (isError || !status) return <p style={{ color: theme.colors.red }}>⚠️ Unable to load system status</p>;

  const { cpu, ram, gpu, llm, backend, strategy, mt5 } = status;

  return (
    <div style={{
      background: theme.colors.panel,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.lg,
      color: theme.colors.text,
    }}>
      <style>{`
        @keyframes blink {
          0% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>

      <SystemAlertPulse status={status} />
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
      {/* System Resources */}
      <PulseBox flex={1}>
        <HUDHeader>System Resources</HUDHeader>
        {separator}
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
          <Metric label="CPU Usage" value={cpu.toFixed(1)} type="cpu" />
          <Metric label="RAM Usage" value={ram.toFixed(1)} type="ram" />
          <Metric label="GPU Usage" value={gpu !== null ? gpu.toFixed(1) : "N/A"} type="gpu" />
          <Metric label="UI FPS" value="60 fps" />
        </div>
      </PulseBox>

      {/* LLM Status */}
      <PulseBox flex={1}>
        <HUDHeader>LLM Status</HUDHeader>
        {separator}
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
          <Metric label="Model" value={llm.model ?? "N/A"} />
          <Metric label="Loaded" value={llm.loaded ? "✅" : "❌"} />
          <Metric label="Response Time" value={llm.response_time !== null ? `${llm.response_time.toFixed(2)} ms` : "N/A"} />
        </div>
      </PulseBox>

      {/* Services */}
      <PulseBox flex={1}>
        <HUDHeader>Services</HUDHeader>
        {separator}
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
          <Metric label="Backend" value={backend} />
          <Metric label="Strategy Engine" value={strategy} />
          <Metric label="Bias Feed" value={renderStatus(wsBiasStatus)} />
          <Metric label="Tick Stream" value={renderStatus(wsTickStatus)} />
        </div>
      </PulseBox>

      {/* MT5 Status */}
      <PulseBox flex={1}>
        <HUDHeader>MT5 Status</HUDHeader>
        {separator}
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
          <Metric label="Initialized" value={mt5?.initialized ? "✅" : "❌"} />
          <Metric label="Account ID" value={mt5?.account?.login?.toString() ?? "N/A"} />
          <Metric label="Terminal Name" value={mt5?.terminal?.name ?? "N/A"} />
        </div>
      </PulseBox>
    </div>
    </div>
  );
};

const Metric: React.FC<MetricProps> = ({ label, value, type = "default" }) => {
  const getColor = () => {
    const num = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
    if (type === "cpu" || type === "gpu") {
      if (isNaN(num)) return theme.colors.text;
      if (num > 90) return theme.colors.red;
      if (num > 70) return theme.colors.amber;
      return theme.colors.green;
    }
    if (type === "ram") {
      if (isNaN(num)) return theme.colors.text;
      if (num > 15) return theme.colors.red;
      if (num > 8) return theme.colors.amber;
      return theme.colors.green;
    }
    return theme.colors.text;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: theme.spacing.xs }}>
      <span style={{
        fontSize: "0.75rem",
        color: theme.colors.textDim,
        marginBottom: "0.25rem",
        fontFamily: theme.fonts.label,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "monospace",
        fontSize: "0.875rem",
        fontWeight: 600,
        color: getColor(),
      }}>
        {value}
      </span>
    </div>
  );
};

export default ResourceMonitorPanel;
