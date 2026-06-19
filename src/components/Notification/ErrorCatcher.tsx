import React, { useState } from "react";
import { cockpit } from "../../theme";
import { ErrorBoundary } from "react-error-boundary";
import { theme } from "../../theme";
import { useLogStore } from "./logStore";

export const ErrorCatcher: React.FC<{
  children: React.ReactNode;
  module?: string;
  onRecovery?: () => void;
}> = ({ children, module, onRecovery }) => {
  const logEvent = useLogStore((s) => s.logEvent);
  const [retryKey, setRetryKey] = useState(0);
  const [retryPulse, setRetryPulse] = useState(false);
  const triggerPulse = useLogStore((s) => s.triggerPulse);

  const handleRetry = () => {
    setRetryPulse(true);
    setTimeout(() => {
        logEvent({
            type: "error",
            severity: "info",
            message: `Retry triggered for ${module ?? "Unknown"}`,
            context: { module },
        });
        triggerPulse({
          ts: Date.now(),
          intensity: 1,
          color: theme.colors.amber, // 🟠 warning pulse
          glow: 12,
        });
        onRecovery?.();
        setRetryKey((k) => k + 1);
        setRetryPulse(false);
    }, 300); // duration of pulse
};

  return (
    <ErrorBoundary
      fallbackRender={({ error }) => {
        logEvent({
          type: "error",
          severity: "critical",
          message: `Render error${module ? ` in ${module}` : ""}`,
          context: { error: error.message, module },
        });

        return (
          <div
            style={{
              padding: theme.spacing.md,
              background: theme.colors.panelAlt,
              color: theme.colors.red,
              fontFamily: theme.fonts.mono,
              border: `1px solid ${theme.colors.red}`,
              borderRadius: theme.radius.sm,
              boxShadow: `0 0 12px ${theme.colors.red}`,
            }}
          >
            ⚠️ Module failed to render: {module ?? "Unknown"}
            {cockpit.devMode && (
              <pre
                style={{
                  marginTop: theme.spacing.sm,
                  fontSize: 12,
                  color: theme.colors.textDim,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {error.stack}
              </pre>
            )}
            <button
              onClick={handleRetry}
              style={{
                marginTop: theme.spacing.sm,
                padding: "6px 12px",
                background: theme.colors.red,
                color: theme.colors.panelAlt,
                border: "none",
                borderRadius: theme.radius.sm,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        );
      }}
    >
      <div
        key={retryKey}
        style={{
            animation: retryPulse ? "pulseGlow 0.3s ease-out" : undefined,
            animationFillMode: retryPulse ? "forwards" : undefined,
        }}
        >
        {children}
        </div>
    </ErrorBoundary>
  );
};
