import React from "react";
import { theme } from "../../theme";

interface EscalationModalProps {
  title: string;
  subtitle?: string;
  severity: "info" | "warning" | "critical";
  narrative: string;
  context?: Record<string, any>;
  onClose: () => void;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({
  title,
  subtitle,
  severity,
  narrative,
  context,
  onClose,
}) => {
  const color =
    severity === "critical"
      ? theme.colors.red
      : severity === "warning"
      ? theme.colors.amber
      : theme.colors.green;

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        left: "50%",
        transform: "translateX(-50%)",
        background: `linear-gradient(180deg, ${theme.colors.panel} 0%, ${theme.colors.panelAlt} 100%)`,
        border: `2px solid ${color}`,
        borderRadius: theme.radius.sm,
        padding: theme.spacing.lg,
        width: 480,
        zIndex: 1000,
        boxShadow: `0 0 24px ${color}`,
        color: theme.colors.text,
        fontFamily: theme.fonts.mono ?? "JetBrains Mono, monospace",
        backdropFilter: "blur(6px)",
        animation:
          context?.trigger === "signalChange" &&
          context?.previousBias &&
          context?.biasAlignment
            ? "sweepPulse 1.2s ease-out"
            : undefined,
      }}
    >
      <h2
        style={{
          color,
          fontSize: 18,
          fontWeight: 600,
          marginBottom: theme.spacing.sm,
          textShadow: `0 0 6px ${color}`,
          display: "box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "normal",
        }}
      >
        {title}
      </h2>
        
        {subtitle && (
  <div style={{ fontSize: 13, color: theme.colors.textDim, marginTop: 4 }}>
    {subtitle}
  </div>
)}


      <p
        style={{
          marginBottom: theme.spacing.sm,
          fontSize: 14,
          lineHeight: 1.5,
          display: "box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "normal",
        }}
      >
        {narrative}
      </p>


      {context && (
        <pre
  style={{
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.textDim,
    background: theme.colors.panelAlt,
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    whiteSpace: "pre-wrap",       // ✅ preserve formatting but allow wrapping
    wordBreak: "break-word",      // ✅ break long keys/values
    overflow: "visible",          // ✅ allow full expansion
    maxHeight: "none",            // ✅ no vertical limit
  }}
>
  {JSON.stringify(context, null, 2)}
</pre>


      )}

      <div style={{ marginTop: theme.spacing.md, display: "flex", gap: theme.spacing.sm }}>
        {["Acknowledge", "Investigate", "Mute"].map((label, i) => (
          <button
            key={label}
            onClick={i === 0 ? onClose : undefined}
            style={{
              padding: "6px 14px",
              borderRadius: theme.radius.sm,
              border: `1px solid ${theme.colors.grid}`,
              background: `linear-gradient(180deg, ${theme.colors.panelAlt} 0%, ${theme.colors.panel} 100%)`,
              color: theme.colors.text,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: context?.flipGradient
                ? `0 0 24px ${theme.colors.glow}`
                : `0 0 24px ${color}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = color;
              (e.currentTarget as HTMLButtonElement).style.color = color;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = theme.colors.grid;
              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.text;
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
