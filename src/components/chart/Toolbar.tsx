import React from "react";
import { theme } from "../../theme";
import { useStore } from "../system/store";

// ✅ Normalize broker symbols (strip suffixes like _I, .r, -pro, etc.)
function normalizeSymbol(sym: string): string {
  return sym.toUpperCase().replace(/[_\.\-].*$/, "");
}

// ✅ Group symbols into categories
function groupSymbols(symbols: string[] = []) {
  const groups: Record<string, string[]> = {
    Majors: [],
    Metals: [],
    Crypto: [],
    Energy: [],
    Others: [],
  };

  symbols.forEach((sym) => {
    const base = normalizeSymbol(sym);

    if (["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD"].includes(base)) {
      groups.Majors.push(sym);
    } else if (base.includes("XAU") || base.includes("XAG")) {
      groups.Metals.push(sym);
    } else if (base.includes("BTC") || base.includes("ETH")) {
      groups.Crypto.push(sym);
    } else if (base.includes("OIL") || base.includes("WTI") || base.includes("BRENT")) {
      groups.Energy.push(sym);
    } else {
      groups.Others.push(sym);
    }
  });

  return groups;
}

interface ToolbarProps {
  symbols: string[];
  wsStatus: "connected" | "disconnected" | "reconnecting";
}

const Toolbar: React.FC<ToolbarProps> = ({ symbols, wsStatus }) => {
  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const selectedTimeframe = useStore((s) => s.selectedTimeframe);
  const setSelectedTimeframe = useStore((s) => s.setSelectedTimeframe);

  return (
    <div
      className="toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between", // left group vs right dot
        padding: "4px 8px",
        borderBottom: `1px solid ${theme.colors.grid}`, // ✅ match chart border
        background: theme.colors.panelAlt,
      }}
    >
      {/* Left group: symbol + timeframe */}
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          style={{
            padding: "2px 6px",
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: theme.radius.sm,
            background: theme.colors.panel,
            color: theme.colors.text,
            fontSize: 12,
          }}
        >
          {Object.entries(groupSymbols(symbols)).map(([group, syms]) =>
            syms.length ? (
              <optgroup key={group} label={group}>
                {syms.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </optgroup>
            ) : null
          )}
        </select>

        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value as any)}
          style={{
            padding: "2px 6px",
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: theme.radius.sm,
            background: theme.colors.panel,
            color: theme.colors.text,
            fontSize: 12,
          }}
        >
          <option value="1m">1m</option>
          <option value="5m">5m</option>
          <option value="15m">15m</option>
          <option value="1h">1h</option>
          <option value="4h">4h</option>
          <option value="1d">1d</option>
        </select>
      </div>

      {/* Right: connection status */}
      <div
        className={`connection-dot ${wsStatus}`}
        title={
          wsStatus === "connected"
            ? "✅ WebSocket connected"
            : wsStatus === "reconnecting"
            ? "🔄 Reconnecting..."
            : "❌ WebSocket disconnected"
        }
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background:
            wsStatus === "connected"
              ? theme.colors.green
              : wsStatus === "disconnected"
              ? theme.colors.red
              : theme.colors.amber,
          boxShadow:
            wsStatus === "connected"
              ? `0 0 6px ${theme.colors.green}`
              : wsStatus === "disconnected"
              ? `0 0 6px ${theme.colors.red}`
              : `0 0 6px ${theme.colors.amber}`,
          animation:
            wsStatus === "reconnecting"
              ? "blink 1s infinite ease-in-out"
              : undefined,
        }}
      />

    </div>
  );
};

export default Toolbar;
