import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StyleSnapshot } from "./types";
import { useStore } from "../system/store";
import { theme } from "../../theme";
import { pushNarrative } from "../Notification/pushNarrative";
import { pushSystemLog } from "../Notification/pushSystemLog";
import { logError } from "../Notification/logError";
import { mapBiasCell, PanelCell, timeframes } from "./BiasTable_helper";
import { detectSignalChange } from "./detectSignalChange";
import { detectConfidenceSurge } from "./confidenceSurge";
import { detectVolatilitySpike } from "./detectVolatilitySpike";

export const BiasTable: React.FC = () => {
  const feed = useStore((state) => state.feed);
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const activeSymbol = useStore((s) => s.selectedSymbol);

  const prevSignalsRef = useRef<Record<string, {
    scalping?: string;
    swing?: string;
    scalpingConfidence?: number;
    swingConfidence?: number;
  }>>({});

  const signalCooldownRef = useRef<Record<string, number>>({});

  const [sortConfig, setSortConfig] = useState({ key: "scalping_signal", direction: "desc" });

  const symbolsData = useMemo(() => {
    return Object.entries(feed).map(([symbol, data]: [string, any]) => {
      const style_snapshot: StyleSnapshot = {};
      Object.keys(data.scalping || {}).forEach(
        (k) => /^[A-Z0-9]+$/.test(k) && (style_snapshot[k] = data.scalping[k])
      );
      Object.keys(data.swing || {}).forEach(
        (k) => /^[A-Z0-9]+$/.test(k) && (style_snapshot[k] = data.swing[k])
      );

      return {
        symbol,
        bias: data.bias || {},
        scalping: data.scalping || {},
        swing: data.swing || {},
        style_snapshot,
      };
    });
  }, [feed]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig) return symbolsData;

    return [...symbolsData].sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      switch (sortConfig.key) {
        case "scalping_signal":
          aVal = a.scalping.alignment_signal?.confidence_pct ?? 0;
          bVal = b.scalping.alignment_signal?.confidence_pct ?? 0;
          break;
        case "scalping_momentum":
          aVal = a.style_snapshot["M1"]?.momentum_pct ?? 0;
          bVal = b.style_snapshot["M1"]?.momentum_pct ?? 0;
          break;
        case "scalping_duration":
          aVal = parseFloat(a.style_snapshot["M1"]?.duration ?? "0");
          bVal = parseFloat(b.style_snapshot["M1"]?.duration ?? "0");
          break;
        case "swing_signal":
          aVal = a.swing.alignment_signal?.confidence_pct ?? 0;
          bVal = b.swing.alignment_signal?.confidence_pct ?? 0;
          break;
        case "swing_momentum":
          aVal = a.style_snapshot["H1"]?.momentum_pct ?? 0;
          bVal = b.style_snapshot["H1"]?.momentum_pct ?? 0;
          break;
        case "swing_duration":
          aVal = parseFloat(a.style_snapshot["H1"]?.duration ?? "0");
          bVal = parseFloat(b.style_snapshot["H1"]?.duration ?? "0");
          break;
        default:
          return 0;
      }

      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [symbolsData, sortConfig]);

  const preparedData = useMemo(() => {
    const fav = sortedData.filter((d) => d.symbol.toUpperCase().includes("XAUUSD"));
    const others = sortedData.filter((d) => !d.symbol.toUpperCase().includes("XAUUSD"));
    return [...fav, ...others].slice(0, 25);
  }, [sortedData]);

  useEffect(() => {
    if (sortedData.length === 0) return;

    const top = sortedData[0];
    if (top.symbol !== activeSymbol) {
      try {
        const biasObj = top.bias["H1"];
        const label = biasObj?.label?.toLowerCase() ?? "neutral";
        const strength = biasObj?.strength_pct ?? 0;

        pushNarrative(
          "notification",
          top.symbol,
          label === "uptrend" ? "bullish" : label === "downtrend" ? "bearish" : "neutral",
          strength > 60 ? "rising" : strength < 40 ? "fading" : "unclear",
          strength > 70 ? "high" : strength < 30 ? "low" : "moderate",
          Math.round(strength),
          { source: "BiasTable", timeframe: "H1", trigger: "topRanked" }
        );

        pushSystemLog("heartbeat", `Top-ranked symbol changed: ${top.symbol}`, {
          source: "BiasTable",
          strength,
          label,
        });
      } catch (err) {
        logError("BiasTable", `Failed to inject top-ranked narrative for ${top.symbol}`, err, {
          symbol: top.symbol,
        });
      }
    }
  }, [sortedData, activeSymbol]);

  useEffect(() => {
    sortedData.forEach((symbolData) => {
      const symbol = symbolData.symbol;
      const prev = prevSignalsRef.current[symbol] || {};

      const scalpingSignal = symbolData.scalping?.alignment_signal?.decision ?? "";
      const swingSignal = symbolData.swing?.alignment_signal?.decision ?? "";

      const scalpingConfidence = symbolData.scalping?.alignment_signal?.confidence_pct ?? 0;
      const swingConfidence = symbolData.swing?.alignment_signal?.confidence_pct ?? 0;

      const scalpingMomentum = symbolData.style_snapshot["M1"]?.momentum_pct ?? 0;
      const swingMomentum = symbolData.style_snapshot["H1"]?.momentum_pct ?? 0;

      const scalpingThreshold = 75;
      const swingThreshold = 60;

      detectSignalChange(symbol, "scalping", scalpingSignal, scalpingConfidence, prev.scalping, signalCooldownRef);
      detectSignalChange(symbol, "swing", swingSignal, swingConfidence, prev.swing, signalCooldownRef);

      detectConfidenceSurge(symbol, "scalping", scalpingConfidence, prev.scalpingConfidence);
      detectConfidenceSurge(symbol, "swing", swingConfidence, prev.swingConfidence);

      detectVolatilitySpike(symbol, "scalping", scalpingMomentum, scalpingThreshold);
      detectVolatilitySpike(symbol, "swing", swingMomentum, swingThreshold);

      prevSignalsRef.current[symbol] = {
        scalping: scalpingSignal,
        swing: swingSignal,
        scalpingConfidence,
        swingConfidence,
      };

    });
  }, [sortedData]);

  if (!feed || Object.keys(feed).length === 0) {
    return <div style={{ color: theme.colors.textDim }}>Loading dashboard…</div>;
  }
    return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 12,
        color: theme.colors.text,
      }}
    >
      <thead>
        <tr style={{ background: theme.colors.panelAlt }}>
          <th style={{ padding: "4px 6px" }} rowSpan={2}>
            Symbol
          </th>
          <th colSpan={timeframes.length} style={{ padding: "4px 6px" }}>
            Timeframes
          </th>
          <th colSpan={4} style={{ padding: "4px 6px" }}>
            Scalping
          </th>
          <th rowSpan={2} style={{ padding: "4px 6px" }}>
            Align
          </th>
          <th colSpan={4} style={{ padding: "4px 6px" }}>
            Swing
          </th>
        </tr>
        <tr style={{ background: theme.colors.panelAlt }}>
          {timeframes.map((tf) => (
            <th key={tf} style={{ padding: "2px 4px" }}>
              {tf}
            </th>
          ))}
          <th
            style={{ cursor: "pointer", padding: "2px 4px" }}
            onClick={() => handleSort("scalping_signal")}
          >
            Signal
          </th>
          <th style={{ padding: "2px 4px" }}>S.A.R.</th>
          <th
            style={{ cursor: "pointer", padding: "2px 4px" }}
            onClick={() => handleSort("scalping_momentum")}
          >
            Momentum
          </th>
          <th
            style={{ cursor: "pointer", padding: "2px 4px" }}
            onClick={() => handleSort("scalping_duration")}
          >
            Duration
          </th>
          <th
            style={{ cursor: "pointer", padding: "2px 4px" }}
            onClick={() => handleSort("swing_signal")}
          >
            Signal
          </th>
          <th style={{ padding: "2px 4px" }}>S.A.R.</th>
          <th
            style={{ cursor: "pointer", padding: "2px 4px" }}
            onClick={() => handleSort("swing_momentum")}
          >
            Momentum
          </th>
          <th
            style={{ cursor: "pointer", padding: "2px 4px" }}
            onClick={() => handleSort("swing_duration")}
          >
            Duration
          </th>
        </tr>
      </thead>

      <tbody>
        {preparedData.map((symbolData, idx) => {
          const isActive = activeSymbol === symbolData.symbol;
          let background = "transparent";
          if (isActive) background = theme.colors.panelAlt;
          else if (idx === 0) background = theme.colors.accentBlue + "22";
          else if (idx >= 1 && idx <= 4) background = theme.colors.accentBlue + "11";

          return (
            <tr
              key={idx}
              onClick={() => {
                setSelectedSymbol(symbolData.symbol);
                try {
                  const biasObj = symbolData.bias["H1"];
                  const label = biasObj?.label?.toLowerCase() ?? "neutral";
                  const strength = biasObj?.strength_pct ?? 0;

                  pushNarrative(
                    "notification",
                    symbolData.symbol,
                    label === "uptrend" ? "bullish" : label === "downtrend" ? "bearish" : "neutral",
                    strength > 60 ? "rising" : strength < 40 ? "fading" : "unclear",
                    strength > 70 ? "high" : strength < 30 ? "low" : "moderate",
                    Math.round(strength),
                    { source: "BiasTable", timeframe: "H1" }
                  );

                  pushSystemLog("manual", `Symbol selected: ${symbolData.symbol}`, {
                    source: "BiasTable",
                    strength,
                    label,
                  });
                } catch (err) {
                  logError("BiasTable", `Failed to inject narrative for ${symbolData.symbol}`, err, {
                    symbol: symbolData.symbol,
                  });
                }
              }}
              style={{ cursor: "pointer", background, transition: "background 0.2s ease" }}
            >
              <td style={{ padding: "4px 8px", fontWeight: 600, color: theme.colors.text, borderBottom: `1px solid ${theme.colors.grid}` }}>
                {symbolData.symbol}
              </td>
              {timeframes.map((tf) => {
                const { text, style, dataStrength } = mapBiasCell(symbolData.bias[tf]);

                return (
                  <td
                    key={tf}
                    style={{
                      ...style,
                      textAlign: "center",
                      padding: "2px 6px",
                      borderBottom: `1px solid ${theme.colors.grid}`,
                    }}
                    data-strength={dataStrength}
                  >
                    {text}
                  </td>
                );
              })}

              {/* Scalping panel */}
              <PanelCell
                modeData={symbolData.scalping}
                styleSnapshotTF={symbolData.style_snapshot["M1"]}
              />

              {/* Align column */}
              <td
                style={{
                  borderLeft: `1px solid ${theme.colors.grid}`,
                  borderBottom: `1px solid ${theme.colors.grid}`,
                }}
              />

              {/* Swing panel */}
              <PanelCell
                modeData={symbolData.swing}
                styleSnapshotTF={symbolData.style_snapshot["H1"]}
              />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
