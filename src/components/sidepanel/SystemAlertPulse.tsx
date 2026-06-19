// src/system/SystemAlertPulse.tsx
import React, { useEffect } from "react";

import { theme } from "../../theme";
import { useStore } from "../system/store";

const SystemAlertPulse: React.FC<{ status: any }> = ({ status }) => {
  const triggerPulse = useStore((s) => s.triggerPulse);

  useEffect(() => {
    if (!status) {
      triggerPulse("sidepanel", 0.9, theme.colors.red); // ❌ no status
      return;
    }

    const { cpu, ram, gpu, llm, backend, strategy, mt5 } = status;

    const alerts = [
      cpu > 90,
      ram > 15,
      gpu !== null && gpu > 90,
      !llm.loaded,
      backend === "offline",
      strategy === "offline",
      !mt5?.initialized,
    ];

    const hasWarning = alerts.some(Boolean);

    if (hasWarning) {
      triggerPulse("sidepanel", 0.7, theme.colors.amber); // ⚠️ warning
    }
  }, [status, triggerPulse]);

  return null;
};

export default SystemAlertPulse;
