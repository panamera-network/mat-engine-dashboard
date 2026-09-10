import React from "react";
import { useStore } from "../system/store";
import { theme } from "../../theme";

// Same add-panel logic MultiTimeframeView used internally (saveProfile on
// the active profile with a new "15m" entry) — just rendered in the
// Dashboard-level panel header instead of MultiTimeframeView's own row.
export const MultiTimeframeAddChart: React.FC = () => {
  const profiles = useStore((s) => s.profiles);
  const activeProfile = useStore((s) => s.activeProfile);
  const saveProfile = useStore((s) => s.saveProfile);

  const timeframes = profiles[activeProfile] ?? ["5m", "1h"];
  const addPanel = () => saveProfile(activeProfile, [...timeframes, "15m"]);

  return (
    <button
      onClick={addPanel}
      style={{
        padding: "3px 8px",
        border: `1px solid ${theme.colors.accentBlue}`,
        borderRadius: theme.radius.sm,
        background: "transparent",
        color: theme.colors.accentBlue,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      ➕ Add Chart
    </button>
  );
};

export default MultiTimeframeAddChart;
