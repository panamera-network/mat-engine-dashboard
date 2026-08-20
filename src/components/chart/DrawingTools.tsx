import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { theme } from "../../theme";

interface DrawingToolsProps {
  containerRef: React.RefObject<HTMLDivElement>;
  storageKey?: string;
  hideToolbar?: boolean;
  controlledMode?: DrawMode;
  controlledColor?: string;
  controlledLineWidth?: number;
  controlledBoxLabel?: string;
  onDrawingModeChange?: (mode: DrawMode) => void;
  onActionsReady?: (actions: { undo: () => void; clear: () => void }) => void;
}

type Point = { x: number; y: number };
type DrawMode = "trendline" | "hline" | "rect" | "brush" | null;
type Drawing =
  | { id: string; type: "trendline" | "hline" | "rect"; start: Point; end: Point; color: string; width: number; label?: string }
  | { id: string; type: "brush"; points: Point[]; color: string; width: number };

const TOOL_BUTTONS: Array<{ mode: Exclude<DrawMode, null>; label: string; icon: string }> = [
  { mode: "trendline", label: "Trend line", icon: "/" },
  { mode: "hline", label: "Horizontal line", icon: "-" },
  { mode: "rect", label: "Zone box", icon: "[]" },
  { mode: "brush", label: "Brush", icon: "P" },
];

const COLORS = [theme.colors.accentBlue, theme.colors.green, theme.colors.red, theme.colors.amber, "#c084fc"];

function pointerPosition(canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawShape(ctx: CanvasRenderingContext2D, drawing: Drawing) {
  ctx.save();
  ctx.strokeStyle = drawing.color;
  ctx.fillStyle = drawing.type === "rect" ? `${drawing.color}24` : drawing.color;
  ctx.lineWidth = drawing.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (drawing.type === "trendline") {
    ctx.beginPath();
    ctx.moveTo(drawing.start.x, drawing.start.y);
    ctx.lineTo(drawing.end.x, drawing.end.y);
    ctx.stroke();
  }

  if (drawing.type === "hline") {
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, drawing.start.y);
    ctx.lineTo(ctx.canvas.width, drawing.start.y);
    ctx.stroke();
  }

  if (drawing.type === "rect") {
    const left = Math.min(drawing.start.x, drawing.end.x);
    const top = Math.min(drawing.start.y, drawing.end.y);
    const width = Math.abs(drawing.end.x - drawing.start.x);
    const height = Math.abs(drawing.end.y - drawing.start.y);
    ctx.fillRect(left, top, width, height);
    ctx.strokeRect(left, top, width, height);

    if (drawing.label) {
      ctx.font = "700 12px Arial";
      const labelWidth = ctx.measureText(drawing.label).width + 10;
      const labelTop = Math.max(2, top - 18);
      ctx.fillStyle = drawing.color;
      ctx.fillRect(left, labelTop, labelWidth, 16);
      ctx.fillStyle = theme.colors.bg;
      ctx.fillText(drawing.label, left + 5, labelTop + 12);
    }
  }

  if (drawing.type === "brush" && drawing.points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
    for (const point of drawing.points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

export const DrawingTools: React.FC<DrawingToolsProps> = ({
  containerRef,
  storageKey = "default",
  hideToolbar = false,
  controlledMode,
  controlledColor,
  controlledLineWidth,
  controlledBoxLabel,
  onDrawingModeChange,
  onActionsReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftRef = useRef<Drawing | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(2);
  const [boxLabel, setBoxLabel] = useState("zone");
  const activeMode = controlledMode !== undefined ? controlledMode : drawMode;
  const activeColor = controlledColor ?? color;
  const activeLineWidth = controlledLineWidth ?? lineWidth;
  const activeBoxLabel = controlledBoxLabel ?? boxLabel;

  const persistedKey = useMemo(() => `mat-chart-drawings:${storageKey}`, [storageKey]);

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawings.forEach((drawing) => drawShape(ctx, drawing));
    if (draftRef.current) drawShape(ctx, draftRef.current);
  };

  useEffect(() => {
    const raw = window.localStorage.getItem(persistedKey);
    if (!raw) {
      setDrawings([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setDrawings(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDrawings([]);
    }
  }, [persistedKey]);

  useEffect(() => {
    window.localStorage.setItem(persistedKey, JSON.stringify(drawings));
  }, [drawings, persistedKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const nextWidth = Math.max(1, container.clientWidth);
      const nextHeight = Math.max(1, container.clientHeight);
      const widthRatio = canvas.width > 0 ? nextWidth / canvas.width : 1;
      const heightRatio = canvas.height > 0 ? nextHeight / canvas.height : 1;

      canvas.width = nextWidth;
      canvas.height = nextHeight;

      if (widthRatio !== 1 || heightRatio !== 1) {
        setDrawings((current) =>
          current.map((drawing) => scaleDrawing(drawing, widthRatio, heightRatio))
        );
      } else {
        redraw();
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  useEffect(() => {
    redraw();
  }, [drawings]);

  const toggleMode = (mode: Exclude<DrawMode, null>) => {
    const nextMode = activeMode === mode ? null : mode;
    setDrawMode(nextMode);
    onDrawingModeChange?.(nextMode);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeMode || !canvasRef.current) return;
    const point = pointerPosition(canvasRef.current, event);
    setIsDrawing(true);
    canvasRef.current.setPointerCapture(event.pointerId);

    if (activeMode === "brush") {
      draftRef.current = { id: crypto.randomUUID(), type: "brush", points: [point], color: activeColor, width: activeLineWidth };
    } else {
      const label = activeMode === "rect" ? activeBoxLabel.trim() : "";
      draftRef.current = {
        id: crypto.randomUUID(),
        type: activeMode,
        start: point,
        end: point,
        color: activeColor,
        width: activeLineWidth,
        label: label || undefined,
      };
    }
    redraw();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !draftRef.current) return;
    const point = pointerPosition(canvasRef.current, event);

    if (draftRef.current.type === "brush") {
      draftRef.current = { ...draftRef.current, points: [...draftRef.current.points, point] };
    } else {
      draftRef.current = { ...draftRef.current, end: point };
    }

    redraw();
  };

  const finishDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    if (canvasRef.current.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }

    const draft = draftRef.current;
    draftRef.current = null;
    setIsDrawing(false);

    if (draft && !isTinyDrawing(draft)) {
      setDrawings((current) => [...current, draft]);
    } else {
      redraw();
    }
  };

  const undo = useCallback(() => setDrawings((current) => current.slice(0, -1)), []);
  const clear = useCallback(() => setDrawings([]), []);
  const actions = useMemo(() => ({ undo, clear }), [undo, clear]);

  useEffect(() => {
    onActionsReady?.(actions);
  }, [actions, onActionsReady]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 8,
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
        style={{
          position: "absolute",
          inset: 0,
          cursor: activeMode ? "crosshair" : "default",
          pointerEvents: activeMode ? "auto" : "none",
        }}
      />

      {!hideToolbar && (
        <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: theme.colors.panelAlt,
          border: `1px solid ${theme.colors.grid}`,
          borderRadius: theme.radius.sm,
          padding: 6,
          pointerEvents: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.24)",
        }}
      >
        {TOOL_BUTTONS.map(({ mode, label, icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => toggleMode(mode)}
            title={label}
            aria-label={label}
            style={toolButtonStyle(activeMode === mode)}
          >
            {icon}
          </button>
        ))}

        <div style={{ width: 1, height: 22, background: theme.colors.grid }} />

        {COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => setColor(swatch)}
            title={`Color ${swatch}`}
            aria-label={`Color ${swatch}`}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: `2px solid ${activeColor === swatch ? theme.colors.text : theme.colors.grid}`,
              background: swatch,
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}

        <input
          type="range"
          min={1}
          max={5}
          value={activeLineWidth}
          onChange={(event) => setLineWidth(Number(event.target.value))}
          title="Line width"
          aria-label="Line width"
          style={{ width: 54 }}
        />

        {activeMode === "rect" && (
          <input
            type="text"
            value={activeBoxLabel}
            onChange={(event) => setBoxLabel(event.target.value)}
            placeholder="box label"
            title="Box label"
            aria-label="Box label"
            style={{
              width: 92,
              height: 26,
              padding: "0 8px",
              border: `1px solid ${theme.colors.grid}`,
              borderRadius: theme.radius.sm,
              background: theme.colors.bg,
              color: theme.colors.text,
              fontSize: 12,
              outline: "none",
            }}
          />
        )}

        <div style={{ width: 1, height: 22, background: theme.colors.grid }} />

        <button type="button" onClick={undo} title="Undo" aria-label="Undo" style={toolButtonStyle(false)}>
          U
        </button>
        <button type="button" onClick={clear} title="Clear drawings" aria-label="Clear drawings" style={toolButtonStyle(false)}>
          X
        </button>
      </div>
      )}
    </div>
  );
};

export { COLORS, TOOL_BUTTONS };
export type { DrawMode };

function toolButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: active ? theme.colors.accentBlue : theme.colors.bg,
    color: active ? theme.colors.bg : theme.colors.text,
    border: `1px solid ${active ? theme.colors.accentBlue : theme.colors.grid}`,
    borderRadius: theme.radius.sm,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1,
  };
}

function isTinyDrawing(drawing: Drawing) {
  if (drawing.type === "brush") return drawing.points.length < 3;
  return Math.abs(drawing.start.x - drawing.end.x) < 3 && Math.abs(drawing.start.y - drawing.end.y) < 3;
}

function scalePoint(point: Point, widthRatio: number, heightRatio: number): Point {
  return { x: point.x * widthRatio, y: point.y * heightRatio };
}

function scaleDrawing(drawing: Drawing, widthRatio: number, heightRatio: number): Drawing {
  if (drawing.type === "brush") {
    return { ...drawing, points: drawing.points.map((point) => scalePoint(point, widthRatio, heightRatio)) };
  }

  return {
    ...drawing,
    start: scalePoint(drawing.start, widthRatio, heightRatio),
    end: scalePoint(drawing.end, widthRatio, heightRatio),
  };
}
