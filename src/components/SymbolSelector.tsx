import React, { useEffect, useRef, useState } from "react";
import { theme } from "../theme";
import { useStore } from "./system/store";
import { fetchAvailableSymbols } from "../api/engineClient";

export const SymbolSelector: React.FC = () => {
  const selectedSymbols = useStore((s) => s.selectedSymbols);
  const setSelectedSymbols = useStore((s) => s.setSelectedSymbols);

  const [available, setAvailable] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAvailableSymbols()
      .then(setAvailable)
      .catch((err) => console.error("[SymbolSelector] Failed to load symbols", err));
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = (sym: string) => {
    setSelectedSymbols(
      selectedSymbols.includes(sym)
        ? selectedSymbols.filter((s) => s !== sym)
        : [...selectedSymbols, sym]
    );
  };

  return (
    <div ref={containerRef} style={{ position: "relative", fontSize: 12 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "3px 10px",
          border: `1px solid ${theme.colors.grid}`,
          borderRadius: theme.radius.sm,
          background: theme.colors.bg,
          color: theme.colors.text,
          cursor: "pointer",
        }}
      >
        Symbols ({selectedSymbols.length}) ▾
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: 200,
            maxHeight: 320,
            overflowY: "auto",
            background: theme.colors.panel,
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: theme.radius.sm,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 50,
            padding: theme.spacing.xs,
          }}
        >
          {available.length === 0 && (
            <div style={{ color: theme.colors.textDim, padding: 6 }}>Loading…</div>
          )}
          {available.map((sym) => (
            <label
              key={sym}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 6px",
                color: theme.colors.text,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedSymbols.includes(sym)}
                onChange={() => toggle(sym)}
              />
              {sym}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default SymbolSelector;
