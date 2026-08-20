import React, { useRef, useState, useEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { transformCorrelationGraph } from "./correlationData";
import { useStore } from "../system/store";
import { theme } from "../../theme";
import { feedLookupKey } from "../../lib/symbolUtils";

const DEFAULT_FOCUS_OPTIONS = ["XAUUSD_i", "WTIUSD_i", "USDJPY_i", "BTCUSD_i"];

const LABEL_MAP: Record<string, string> = {
  XAUUSD_i: "Gold",
  WTIUSD_i: "Crude Oil",
  USDJPY_i: "USD/JPY",
  BTCUSD_i: "Bitcoin",
};

const CorrelationClusters: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 320, height: 180 });

  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const rawBiasData = useStore((s) => s.rawBiasData);

  const syncedFocus = useMemo(
    () => feedLookupKey(selectedSymbol, rawBiasData),
    [selectedSymbol, rawBiasData]
  );

  const [focusSymbol, setFocusSymbol] = useState(syncedFocus);

  useEffect(() => {
    setFocusSymbol(syncedFocus);
  }, [syncedFocus]);

  useEffect(() => {
    if (!graphRef.current) return;
    const resize = () => {
      if (!graphRef.current) return;
      setDims({
        width: graphRef.current.offsetWidth,
        height: graphRef.current.offsetHeight,
      });
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(graphRef.current);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(
    () => transformCorrelationGraph(rawBiasData, focusSymbol),
    [rawBiasData, focusSymbol]
  );

  const displayLabel = LABEL_MAP[focusSymbol] ?? focusSymbol;
  const focusOptions = useMemo(() => {
    const options = new Set([syncedFocus, ...DEFAULT_FOCUS_OPTIONS, ...Object.keys(rawBiasData)]);
    return Array.from(options).filter(Boolean);
  }, [rawBiasData, syncedFocus]);

  if (!graphData.nodes.length) {
    return (
      <div
        style={{
          padding: 12,
          color: theme.colors.textDim,
          fontStyle: "italic",
          backgroundColor: theme.colors.panel,
          border: `2px solid ${theme.colors.grid}`,
        }}
      >
        No correlation data found for <strong>{displayLabel}</strong>.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        border: `1px solid ${theme.colors.grid}`,
        borderRadius: 4,
        backgroundColor: theme.colors.panel,
        padding: 8,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          flex: "0 0 auto",
          gap: 8,
          minWidth: 0,
        }}
      >
        <h3 style={{ color: theme.colors.amber, fontWeight: "bold", margin: 0, fontSize: 16 }}>
          {displayLabel}
        </h3>
        <select
          value={focusSymbol}
          onChange={(e) => setFocusSymbol(e.target.value)}
          style={{
            padding: "4px 8px",
            fontWeight: "bold",
            backgroundColor: theme.colors.panelAlt,
            color: theme.colors.text,
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: 4,
            minWidth: 0,
            maxWidth: "65%",
          }}
        >
          {focusOptions.map((sym) => (
            <option key={sym} value={sym}>
              Focus: {sym}
            </option>
          ))}
        </select>
      </div>

      <div ref={graphRef} style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <ForceGraph2D
          key={focusSymbol}
          graphData={graphData}
          width={dims.width}
          height={dims.height}
          nodeLabel="label"
          nodeAutoColorBy="group"
          linkColor={(link: { value: number }) =>
            link.value > 0 ? theme.colors.green : theme.colors.red
          }
          linkWidth={(link: { value: number }) => (Math.abs(link.value) > 0.8 ? 5 : 2)}
          linkDirectionalParticles={(link: { value: number }) =>
            Math.abs(link.value) > 0.8 ? 4 : 2
          }
          linkDirectionalParticleSpeed={(link: { value: number }) =>
            Math.abs(link.value) * 0.01
          }
          nodeCanvasObject={(
            node: { x?: number; y?: number; label?: string; color?: string },
            ctx: CanvasRenderingContext2D,
            globalScale: number
          ) => {
            if (node.x === undefined || node.y === undefined) return;
            const label = node.label ?? "";
            const fontSize = 12 / globalScale;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color || theme.colors.accentBlue;
            ctx.fill();
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = theme.colors.text;
            ctx.fillText(label, node.x + 8, node.y + 3);
          }}
        />
      </div>
    </div>
  );
};

export default CorrelationClusters;
