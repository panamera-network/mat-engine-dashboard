import React, { useCallback, useEffect, useRef, useState } from "react";
import { theme } from "../../theme";
import { Panel } from "../../ui/Panel";

interface Strategy {
  name: string;
  enabled: boolean;
  description?: string;
}

function normalizeStrategies(data: unknown): Strategy[] {
  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as { strategies?: unknown }).strategies)
    ? (data as { strategies: unknown[] }).strategies
    : [];

  return raw
    .map((item) => item as Partial<Strategy>)
    .filter((item): item is Strategy => typeof item.name === "string")
    .map((item) => ({
      name: item.name,
      enabled: Boolean(item.enabled),
      description: item.description,
    }));
}

export const StrategyControl: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const togglingRef = useRef<Record<string, boolean>>({});

  const setTogglingState = useCallback(
    (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      setToggling((prev) => {
        const next = updater(prev);
        togglingRef.current = next;
        return next;
      });
    },
    []
  );

  const fetchStrategies = useCallback(
    async (options?: { signal?: AbortSignal; initial?: boolean }) => {
      const initial = options?.initial ?? false;

      try {
        if (initial) setLoading(true);
        else setRefreshing(true);

        const res = await fetch("/core/strategies", { signal: options?.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const incoming = normalizeStrategies(await res.json());
        setStrategies((prev) =>
          incoming.map((strategy) => {
            if (!togglingRef.current[strategy.name]) return strategy;
            return prev.find((item) => item.name === strategy.name) ?? strategy;
          })
        );
        setError(null);
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to fetch strategies");
      } finally {
        if (initial) setLoading(false);
        else setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchStrategies({ signal: controller.signal, initial: true });

    const interval = setInterval(() => fetchStrategies(), 5000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchStrategies]);

  const toggleStrategy = async (name: string, currentState: boolean) => {
    const nextEnabled = !currentState;
    setTogglingState((prev) => ({ ...prev, [name]: true }));

    try {
      const res = await fetch(`/core/strategies/${encodeURIComponent(name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setStrategies((prev) =>
        prev.map((strategy) =>
          strategy.name === name ? { ...strategy, enabled: nextEnabled } : strategy
        )
      );
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Toggle failed";
      setError(msg);
      console.error("[StrategyControl] Toggle error:", err);
    } finally {
      setTogglingState((prev) => ({ ...prev, [name]: false }));
    }
  };

  return (
    <Panel title={`Strategy Control${refreshing && !loading ? " - refreshing" : ""}`}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          padding: theme.spacing.sm,
          maxHeight: 300,
          minHeight: 0,
          minWidth: 0,
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
            Loading strategies...
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
                minWidth: 0,
              }}
            >
              <input
                type="checkbox"
                checked={strategy.enabled}
                onChange={() => toggleStrategy(strategy.name, strategy.enabled)}
                disabled={toggling[strategy.name]}
                style={{
                  cursor: toggling[strategy.name] ? "wait" : "pointer",
                  accentColor: theme.colors.green,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  title={strategy.name}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
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
                  background: strategy.enabled
                    ? theme.colors.green + "33"
                    : theme.colors.red + "33",
                  color: strategy.enabled ? theme.colors.green : theme.colors.red,
                  whiteSpace: "nowrap",
                }}
              >
                {toggling[strategy.name] ? "..." : strategy.enabled ? "ON" : "OFF"}
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
};
