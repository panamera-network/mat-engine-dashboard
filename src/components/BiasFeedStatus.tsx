import React from "react";
import { theme } from "../theme";
import { useStore } from "./system/store";

export const BiasFeedStatus: React.FC = () => {
  const loading = useStore((s) => s.engineLoading);
  const error = useStore((s) => s.engineError);
  const lastUpdated = useStore((s) => s.engineLastUpdated);

  const color = error ? theme.colors.red : loading ? theme.colors.amber : theme.colors.green;
  const label = error ? "Offline" : loading ? "Refreshing…" : lastUpdated ? "Live" : "—";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap" }}>
      <span style={{ color: theme.colors.textDim }}>Bias Feed</span>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ color: theme.colors.text }}>{label}</span>
    </div>
  );
};

export default BiasFeedStatus;
