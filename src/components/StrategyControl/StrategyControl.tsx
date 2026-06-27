import React, { useEffect, useState } from "react";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";

interface Strategy {
  name: string;
  enabled: boolean;
  description?: string;
}

export const StrategyControl: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  // Fetch strategies on mount
  useEffect(() => {
    fetchStrategies();
    const interval = setInterval(fetchStrategies, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/core/strategies");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStrategies(Array.isArray(data) ? data : data.strategies || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch strategies");
    } finally {
      setLoading(false);
    }
  };

  const toggleStrategy = async (name: string, currentState: boolean) => {
    setToggling((prev) => ({ ...prev, [name]: true }));
    try {
      const res = await fetch(`/core/strategies/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentState }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setStrategies((prev) =>
        prev.map((s) => (s.name === name ? { ...s, enabled: !currentState } : s))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Toggle failed";
      setError(msg);
      console.error("[StrategyControl] Toggle error:", err);
    } finally {
      setToggling((prev) => ({ ...prev, [name]: false }));
    }
  };

  return (
    <Panel title="⚙️ Strategy Control">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          padding: theme.spacing.sm,
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
        {error && (
          <div
            style={{
              color: theme.colors.red,
              fontSize: 12,
              padding: theme.spacing.xs,
              background: theme.colors.bg + "99",
              borderRadius: theme.radius.sm,
            }}
          >
            {error}
          </div>
        )}

        {loading && strategies.length === 0 ? (
          <div style={{ color: theme.colors.textDim, fontSize: 12 }}>
            Loading strategies…
          </div>
        ) : strategies.length === 0 ? (
          <div style={{ color: theme.colors.textDim, fontSize: 12 }}>
            No strategies available
          </div>
        ) : (
          strategies.map((strategy) => (
            <div
              key={strategy.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                background: theme.colors.panelAlt,
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.colors.grid}`,
              }}
            >
              <input
                type="checkbox"
                checked={strategy.enabled}
                onChange={() =>
                  toggleStrategy(strategy.name, strategy.enabled)
                }
                disabled={toggling[strategy.name]}
                style={{
                  cursor: toggling[strategy.name] ? "wait" : "pointer",
                  accentColor: theme.colors.green,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.text,
                  }}
                >
                  {strategy.name}
                </div>
                {strategy.description && (
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.colors.textDim,
                      marginTop: 2,
                    }}
                  >
                    {strategy.description}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: theme.radius.sm,
                  background:
                    strategy.enabled
                      ? theme.colors.green + "33"
                      : theme.colors.red + "33",
                  color: strategy.enabled ? theme.colors.green : theme.colors.red,
                  whiteSpace: "nowrap",
                }}
              >
                {strategy.enabled ? "ON" : "OFF"}
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
};
