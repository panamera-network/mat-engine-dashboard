import React, { useRef, useEffect, useState } from "react";
import { theme } from "../../theme";

interface DrawingToolsProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onDrawingModeChange?: (mode: string | null) => void;
}

type DrawMode = "line" | "rect" | "freehand" | null;

export const DrawingTools: React.FC<DrawingToolsProps> = ({ containerRef, onDrawingModeChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawMode || !canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !startPos) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Redraw (clear and redraw all strokes - simplified)
    ctx.strokeStyle = theme.colors.accentBlue;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    if (drawMode === "line") {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else if (drawMode === "rect") {
      const width = currentPos.x - startPos.x;
      const height = currentPos.y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (drawMode === "freehand") {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
      setStartPos(currentPos);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartPos(null);
  };

  const toggleMode = (mode: DrawMode) => {
    if (drawMode === mode) {
      setDrawMode(null);
      onDrawingModeChange?.(null);
    } else {
      setDrawMode(mode);
      onDrawingModeChange?.(mode);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor: drawMode ? "crosshair" : "default",
          zIndex: 5,
        }}
      />

      {/* Drawing tools toolbar */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          display: "flex",
          gap: 6,
          background: theme.colors.panelAlt,
          border: `1px solid ${theme.colors.grid}`,
          borderRadius: theme.radius.sm,
          padding: theme.spacing.xs,
          zIndex: 10,
        }}
      >
        {[
          { mode: "line" as DrawMode, label: "Line", emoji: "📏" },
          { mode: "rect" as DrawMode, label: "Rect", emoji: "◻️" },
          { mode: "freehand" as DrawMode, label: "Draw", emoji: "✏️" },
        ].map(({ mode, label, emoji }) => (
          <button
            key={mode}
            onClick={() => toggleMode(mode)}
            title={label}
            style={{
              padding: "4px 8px",
              background: drawMode === mode ? theme.colors.accentBlue : theme.colors.bg,
              color: theme.colors.text,
              border: `1px solid ${drawMode === mode ? theme.colors.accentBlue : theme.colors.grid}`,
              borderRadius: theme.radius.sm,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: drawMode === mode ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            {emoji}
          </button>
        ))}

        <div style={{ width: 1, background: theme.colors.grid }} />

        <button
          onClick={clearCanvas}
          title="Clear drawings"
          style={{
            padding: "4px 8px",
            background: theme.colors.bg,
            color: theme.colors.textDim,
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: theme.radius.sm,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
};
