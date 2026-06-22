import React, { useRef, useState, useEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { transformCorrelationGraph } from "./correlationData";
import { useStore } from "../system/store";
import { theme } from "../../theme";
import { feedLookupKey } from "../../lib/symbolUtils";

const FOCUS_OPTIONS = ["XAUUSD_i", "WTIUSD_i", "USDJPY_i", "BTCUSD_i"];

const LABEL_MAP: Record<string, string> = {
  XAUUSD_i: "Gold",
  WTIUSD_i: "Crude Oil",
  USDJPY_i: "USD/JPY",
  BTCUSD_i: "Bitcoin",
};

const CorrelationClusters: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 400, height: 400 });

  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const rawBiasData = useStore((s) => s.rawBiasData) ?? {};

  const syncedFocus = useMemo(
    () => feedLookupKey(selectedSymbol, rawBiasData),
    [selectedSymbol, rawBiasData]
  );

  const [focusSymbol, setFocusSymbol] = useState(syncedFocus);

  useEffect(() => {
    setFocusSymbol(syncedFocus);
  }, [syncedFocus]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resize = () => {
      setDims({
        width: containerRef.current!.offsetWidth,
        height: containerRef.current!.offsetHeight,
      });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const graphData = useMemo(
    () => transformCorrelationGraph(rawBiasData, focusSymbol),
    [rawBiasData, focusSymbol]
  );

  const displayLabel = LABEL_MAP[focusSymbol] ?? focusSymbol;

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
        height: "380px",
        border: `1px solid ${theme.colors.grid}`,
        borderRadius: 4,
        backgroundColor: theme.colors.panel,
        padding: 8,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h3 style={{ color: theme.colors.amber, fontWeight: "bold", margin: 0 }}>
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
          }}
        >
          {FOCUS_OPTIONS.map((sym) => (
            <option key={sym} value={sym}>
              Focus: {sym}
            </option>
          ))}
        </select>
      </div>

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
          const label = node.label ?? "";
          const fontSize = 12 / globalScale;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 6, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color || theme.colors.accentBlue;
          ctx.fill();
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = theme.colors.text;
          ctx.fillText(label, node.x! + 8, node.y! + 3);
        }}
      />
    </div>
  );
};

export default CorrelationClusters;
