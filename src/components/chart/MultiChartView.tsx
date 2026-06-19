import React, { useState, useEffect } from "react";
import LiveChart from "./LiveChart";

const MultiChartView: React.FC = () => {
  const [symbols, setSymbols] = useState<string[]>(["EURUSD", "GBPJPY"]);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, { latest: number }>>({});

  useEffect(() => {
    fetch("http://localhost:8000/api/mt5/symbols")
      .then(res => res.json())
      .then(data => setAvailableSymbols(data.symbols))
      .catch(err => console.error("Failed to load symbols", err));
  }, []);

  const toggleSymbol = (sym: string) => {
    setSymbols(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  return (
    <div style={{ display: "flex", gap: "24px" }}>
      {/* Sidebar */}
      <div style={{ minWidth: "180px", color: "#d1d1d1" }}>
        <h3>Symbols</h3>
        {availableSymbols.map(sym => (
          <label key={sym} style={{ display: "block", marginBottom: "4px" }}>
            <input
              type="checkbox"
              checked={symbols.includes(sym.replace("_i", ""))}
              onChange={() => toggleSymbol(sym.replace("_i", ""))}
            />
            {sym}
          </label>
        ))}
      </div>

      {/* Chart grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        {symbols.map(sym => (
          <div key={sym} style={{ border: "1px solid #333", borderRadius: "8px", padding: "8px" }}>
            <h3 style={{ color: "#d1d1d1", margin: "0 0 8px" }}>{sym}</h3>
            <LiveChart
              baseSymbol={sym}
              timeframe="1m"
              ticks={[]}
              onStatsUpdate={s => {
                if (s) setStats(prev => ({ ...prev, [s.name]: { latest: s.ohlc.close } }));
              }}
            />
            <div style={{ color: "#aaa", fontSize: "12px", marginTop: "4px" }}>
              Latest: {stats[sym]?.latest ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiChartView;
