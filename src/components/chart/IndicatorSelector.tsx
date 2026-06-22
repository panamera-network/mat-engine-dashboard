import React, { useState } from "react";
import { theme } from "../../theme";
import { INDICATOR_REGISTRY, type IndicatorKey } from "../../lib/indicators";

interface IndicatorSelectorProps {
  selectedIndicators: Set<IndicatorKey>;
  onToggleIndicator: (indicator: IndicatorKey) => void;
}

export const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({
  selectedIndicators,
  onToggleIndicator,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const indicators = Object.keys(INDICATOR_REGISTRY) as IndicatorKey[];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "4px 12px",
          background: theme.colors.accentBlue,
          color: theme.colors.text,
          border: "none",
          borderRadius: theme.radius.sm,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          transition: "opacity 0.2s",
        }}
      >
        📈 Indicators {selectedIndicators.size > 0 && `(${selectedIndicators.size})`}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            background: theme.colors.panelAlt,
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: theme.radius.sm,
            padding: theme.spacing.sm,
            minWidth: 180,
            maxHeight: 300,
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          {indicators.map((indicator) => (
            <label
              key={indicator}
              style={{
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                cursor: "pointer",
                background: selectedIndicators.has(indicator)
                  ? theme.colors.bg + "66"
                  : "transparent",
                borderRadius: theme.radius.sm,
                marginBottom: 4,
                transition: "background 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={selectedIndicators.has(indicator)}
                onChange={() => onToggleIndicator(indicator)}
                style={{
                  cursor: "pointer",
                  accentColor: theme.colors.accentBlue,
                }}
              />
              <span style={{ fontSize: 12, color: theme.colors.text, flex: 1 }}>
                {indicator}
              </span>
              {selectedIndicators.has(indicator) && (
                <span style={{ fontSize: 10, color: theme.colors.accentBlue }}>✓</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
