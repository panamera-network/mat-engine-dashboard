import React from "react";
import { theme } from "../theme";
import { useStore } from "./system/store";

export const EngineStatus: React.FC = () => {
  const loading = useStore((s) => s.engineLoading);
  const error = useStore((s) => s.engineError);
  const lastUpdated = useStore((s) => s.engineLastUpdated);

  const color = error ? theme.colors.red : loading ? theme.colors.amber : theme.colors.green;
  const label = error ?? (loading ? "Refreshing…" : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "—");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.colors.textDim }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </div>
  );
};

export default EngineStatus;
