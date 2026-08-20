import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  LineStyle,
  CandlestickSeries,
} from "lightweight-charts";
import type {
  ISeriesApi,
  IPriceLine,
  ISeriesMarkersPluginApi,
  SeriesMarker,
  Time,
  UTCTimestamp,
  CandlestickData,
  BarData,
} from "lightweight-charts";
import { theme } from "../../theme";
import { coerceToSeconds, normalizeTimeframe, toCandleTime, toEngineTimeframe } from "./chartUtils";
import { useStore } from "../system/store";
import { feedLookupKey } from "../../lib/symbolUtils";
import type { Candle as IndicatorCandle } from "../indicators";
import { COLORS, DrawingTools, TOOL_BUTTONS, type DrawMode } from "./DrawingTools";
import { fetchHistory } from "../../api/engineClient";

interface Tick {
  symbol: string;
  price: number;
  time: number | string | { seconds?: number; epoch?: number; valueOf?: () => number };
}

interface LiveChartProps {
  baseSymbol: string;
  timeframe: string;
  ticks: Tick[];
  onStatsUpdate: (
    stats: {
      name: string;
      ohlc: { open: number; high: number; low: number; close: number };
      lastUpdate: string;
    } | null
  ) => void;
  width?: number;
  height?: number;
  showHeader?: boolean;
  enableDrawing?: boolean;
  enableOverlays?: boolean;
  enableStrategyMarkers?: boolean;
}

type Candle = CandlestickData<UTCTimestamp>;

interface StrategySignal {
  strategy?: string;
  symbol?: string;
  timeframe?: string;
  direction?: "long" | "short" | string;
  reason?: string;
  confidence?: number;
  trigger?: string;
  timestamp?: number | string | { seconds?: number; epoch?: number; valueOf?: () => number };
  price?: number | string;
}

interface StructureBox {
  id: string;
  label: string;
  left: number;
  width: number;
  top: number;
  height: number;
  color: string;
  borderColor: string;
}

interface StructureZone {
  id: string;
  label: string;
  topPrice: number;
  bottomPrice: number;
  color: string;
  timestamp?: StrategySignal["timestamp"];
}

const SNR_TIMEFRAMES = ["D1", "H4", "H1", "M15"];
const DEFAULT_OVERLAYS = {
  snr: true,
  snd: true,
  ob: true,
  fvg: true,
  bos: true,
  choch: true,
};

const LiveChart: React.FC<LiveChartProps> = ({
  baseSymbol,
  timeframe,
  ticks,
  onStatsUpdate,
  width,
  height,
  showHeader = true,
  enableDrawing = true,
  enableOverlays = true,
  enableStrategyMarkers = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const currentCandleRef = useRef<Candle | null>(null);
  const lastTickCountRef = useRef(0);
  const candlesRef = useRef<Candle[]>([]);
  const structurePriceLinesRef = useRef<IPriceLine[]>([]);
  const structureZonesRef = useRef<StructureZone[]>([]);
  const strategyMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const onStatsUpdateRef = useRef(onStatsUpdate);

  const [overlayOHLC, setOverlayOHLC] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [liveDotPos, setLiveDotPos] = useState<{ x: number; y: number } | null>(null);
  const [structureBoxes, setStructureBoxes] = useState<StructureBox[]>([]);
  const [drawingMode, setDrawingMode] = useState<DrawMode>(null);
  const [drawingColor, setDrawingColor] = useState(COLORS[0]);
  const [drawingWidth, setDrawingWidth] = useState(2);
  const [boxLabel, setBoxLabel] = useState("zone");
  const [drawingActions, setDrawingActions] = useState<{ undo: () => void; clear: () => void } | null>(null);
  const [overlays, setOverlays] = useState(DEFAULT_OVERLAYS);

  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  const updateLiveDotPosition = useCallback(() => {
    const candle = currentCandleRef.current;
    if (!chartRef.current || !seriesRef.current || !candle) return;
    const x = chartRef.current
      .timeScale()
      .timeToCoordinate(candle.time as UTCTimestamp);
    const y = seriesRef.current.priceToCoordinate(candle.close);
    if (x != null && y != null) setLiveDotPos({ x, y });
  }, []);

  const recalculateStructureBoxes = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const container = containerRef.current;
    if (!chart || !series || !container) return;

    const tfSeconds = normalizeTimeframe(timeframe) * 60;
    const containerWidth = container.clientWidth;
    const nextBoxes = structureZonesRef.current.flatMap((zone) => {
      const topY = series.priceToCoordinate(Math.max(zone.topPrice, zone.bottomPrice));
      const bottomY = series.priceToCoordinate(Math.min(zone.topPrice, zone.bottomPrice));
      if (topY == null || bottomY == null) return [];

      const rawSeconds = zone.timestamp ? coerceToSeconds(zone.timestamp) : NaN;
      const anchorTime = Number.isFinite(rawSeconds)
        ? toCandleTime(rawSeconds, tfSeconds) as UTCTimestamp
        : null;
      const anchorX = anchorTime ? chart.timeScale().timeToCoordinate(anchorTime) : null;
      if (anchorX == null) return [];

      const left = Math.max(0, anchorX);
      const rightPadding = 72;
      const width = Math.max(24, containerWidth - left - rightPadding);
      if (width <= 24) return [];

      return [{
        id: zone.id,
        label: zone.label,
        left,
        width,
        top: Math.min(topY, bottomY),
        height: Math.max(14, Math.abs(bottomY - topY)),
        color: `${zone.color}2a`,
        borderColor: zone.color,
      }];
    });

    setStructureBoxes(nextBoxes);
  }, [timeframe]);

  // Create chart + seed with history
  useEffect(() => {
    if (!baseSymbol || !containerRef.current || !chartHostRef.current) return;

    const container = containerRef.current;
    const chartHost = chartHostRef.current;
    const abort = new AbortController();

    const chart = createChart(chartHost, {
      width: width ?? container.clientWidth,
      height: height ?? (container.clientHeight || 500),
      layout: {
        background: { type: ColorType.Solid, color: theme.colors.bg },
        textColor: theme.colors.text,
      },
      grid: {
        vertLines: { color: theme.colors.grid },
        horzLines: { color: theme.colors.grid },
      },
      crosshair: {
        vertLine: {
          color: theme.colors.accentBlue,
          width: 1,
          style: 1,
          visible: true,
          labelBackgroundColor: theme.colors.panelAlt,
        },
        horzLine: {
          color: theme.colors.accentBlue,
          width: 1,
          style: 1,
          visible: true,
          labelBackgroundColor: theme.colors.panelAlt,
        },
      },
      timeScale: { timeVisible: true, borderColor: theme.colors.grid },
      rightPriceScale: { borderColor: theme.colors.grid },
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: theme.colors.green,
      downColor: theme.colors.red,
      borderVisible: false,
      wickUpColor: theme.colors.green,
      wickDownColor: theme.colors.red,
    });
    seriesRef.current = series;
    strategyMarkersRef.current = createSeriesMarkers(series, [], { zOrder: "top" });

    setIsLoadingHistory(true);
    fetchHistory(baseSymbol, toEngineTimeframe(timeframe), 200)
      .then((data) => {
        if (!seriesRef.current || abort.signal.aborted) return;
        const bars = data.candles ?? [];
        if (!Array.isArray(bars) || bars.length === 0) {
          console.warn("Invalid/empty history payload for", baseSymbol);
          return;
        }

        const mapped: Candle[] = bars
          .map((b) => ({
            time: coerceToSeconds(b.time) as UTCTimestamp,
            open: Number(b.open),
            high: Number(b.high),
            low: Number(b.low),
            close: Number(b.close),
          }))
          .filter((c) => Number.isFinite(c.time) && c.time > 0)
          .sort((a, b) => Number(a.time) - Number(b.time));

        if (!mapped.length) return;

        candlesRef.current = mapped;
        series.setData(mapped);
        currentCandleRef.current = { ...mapped[mapped.length - 1] };
        lastTickCountRef.current = 0;
        chart.timeScale().fitContent();

        const last = currentCandleRef.current;
        setOverlayOHLC({ open: last.open, high: last.high, low: last.low, close: last.close });
        setIsLive(true);
        updateLiveDotPosition();
        requestAnimationFrame(recalculateStructureBoxes);

        onStatsUpdateRef.current?.({
          name: baseSymbol,
          ohlc: { open: last.open, high: last.high, low: last.low, close: last.close },
          lastUpdate: "latest",
        });

        const indicatorCandles: IndicatorCandle[] = bars.map((b) => ({
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
          volume: Number(b.volume ?? 0),
        }));
        useStore.getState().updateIndicators(baseSymbol, indicatorCandles);
      })
      .catch((err) => {
        if (!abort.signal.aborted) console.error("History fetch error:", err);
      })
      .finally(() => {
        if (!abort.signal.aborted) setIsLoadingHistory(false);
      });

    chart.subscribeCrosshairMove((param) => {
      if (!param?.time || !seriesRef.current) {
        setIsLive(true);
        return;
      }
      const data = param.seriesData.get(seriesRef.current) as
        | BarData<UTCTimestamp>
        | undefined;
      if (data) {
        setIsLive(false);
        setOverlayOHLC({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        });
      }
    });

    // lightweight-charts does NOT auto-resize with its container — without
    // this, the canvas stays at whatever size it was created with (often
    // measured before the surrounding flex/grid layout has settled), and
    // visually overflows or underflows the container as the page layout
    // changes (window resize, panel reflow, etc).
    const ro = new ResizeObserver(() => {
      // Only auto-track the container when no explicit width/height was
      // passed in — explicit props mean the caller wants a fixed size.
      if (width === undefined && height === undefined) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
          chart.resize(w, h);
        }
      }
      updateLiveDotPosition();
      recalculateStructureBoxes();
    });
    ro.observe(container);

    const handleVisibleRangeChange = () => {
      updateLiveDotPosition();
      recalculateStructureBoxes();
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      abort.abort();
      ro.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      currentCandleRef.current = null;
      lastTickCountRef.current = 0;
      structurePriceLinesRef.current = []; // removed with the series above
      structureZonesRef.current = [];
      strategyMarkersRef.current = null;
    };
  }, [baseSymbol, timeframe, width, height, updateLiveDotPosition, recalculateStructureBoxes]);

  // Overlay structure from engine output. SNR stays as labelled price lines;
  // zone-style features become compact boxes so they do not flood the chart.
  const feed = useStore((s) => s.feed);
  const symbolData = feed[feedLookupKey(baseSymbol, feed)];

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    for (const line of structurePriceLinesRef.current) {
      try {
        series.removePriceLine(line);
      } catch {
        // series may already be gone (symbol/timeframe just changed)
      }
    }
    structurePriceLinesRef.current = [];
    structureZonesRef.current = [];
    setStructureBoxes([]);

    const engineTf = toEngineTimeframe(timeframe);
    if (!symbolData || !enableOverlays) return;

    const snrEntries = overlays.snr
      ? SNR_TIMEFRAMES.flatMap((tf) =>
          ((symbolData.snr_levels?.[tf] ?? []) as any[]).map((lvl) => ({ ...lvl, tf }))
        )
      : [];
    const orderBlocks: any[] = overlays.ob ? symbolData.order_blocks?.[engineTf] ?? [] : [];
    const fvgs: any[] = overlays.fvg ? symbolData.fvg?.[engineTf] ?? [] : [];
    const supplyDemandZones: any[] = overlays.snd ? symbolData.supply_demand_zones?.[engineTf] ?? [] : [];

    for (const lvl of snrEntries) {
      const price = Number(lvl.level);
      if (!Number.isFinite(price)) continue;
      const isResistance = String(lvl.type).toLowerCase() === "resistance";
      const status = String(lvl.status ?? "").toLowerCase() === "tested" ? "tested" : "untested";
      const label = lvl.label || `${status} ${String(lvl.type).toLowerCase()} ${lvl.tf}`;
      structurePriceLinesRef.current.push(
        series.createPriceLine({
          price,
          color: isResistance ? theme.colors.red : theme.colors.green,
          lineWidth: 1,
          lineStyle: status === "tested" ? LineStyle.Solid : LineStyle.Dashed,
          axisLabelVisible: true,
          title: label,
        })
      );
    }

    const nextZones: StructureZone[] = [];
    const addBox = (
      id: string,
      label: string,
      topPrice: number,
      bottomPrice: number,
      color: string,
      rawTime?: StrategySignal["timestamp"]
    ) => {
      nextZones.push({
        id,
        label,
        topPrice,
        bottomPrice,
        color,
        timestamp: rawTime,
      });
    };

    orderBlocks.slice(-4).forEach((ob, index) => {
      const high = Number(ob.high);
      const low = Number(ob.low);
      if (!Number.isFinite(high) || !Number.isFinite(low)) return;
      const isBullish = ob.type === "Bullish";
      const suffix = ob.mitigated ? " mitigated" : "";
      addBox(`ob-${index}`, `OB ${ob.type} ${engineTf}${suffix}`, high, low, isBullish ? theme.colors.green : theme.colors.red, ob.timestamp);
    });

    fvgs.slice(-4).forEach((fvg, index) => {
      const top = Number(fvg.top);
      const bottom = Number(fvg.bottom);
      if (!Number.isFinite(top) || !Number.isFinite(bottom)) return;
      const isBullish = fvg.type === "Bullish";
      addBox(`fvg-${index}`, `FVG ${fvg.type} ${engineTf}`, top, bottom, isBullish ? theme.colors.green : theme.colors.red, fvg.timestamp);
    });

    supplyDemandZones.slice(-4).forEach((zone, index) => {
      const top = Number(zone.top);
      const bottom = Number(zone.bottom);
      if (!Number.isFinite(top) || !Number.isFinite(bottom)) return;
      const isDemand = zone.type === "demand";
      const pattern = zone.pattern ? ` ${zone.pattern}` : "";
      const status = zone.status ? ` ${zone.status}` : "";
      addBox(
        `snd-${index}`,
        `${zone.type?.toUpperCase?.() ?? "SND"}${pattern} ${engineTf}${status}`,
        top,
        bottom,
        isDemand ? theme.colors.green : theme.colors.red,
        zone.timestamp
      );
    });

    structureZonesRef.current = nextZones;
    recalculateStructureBoxes();
  }, [symbolData, baseSymbol, timeframe, enableOverlays, overlays, recalculateStructureBoxes]);

  useEffect(() => {
    const markersApi = strategyMarkersRef.current;
    if (!markersApi) return;

    const engineTf = toEngineTimeframe(timeframe);
    const tfSeconds = normalizeTimeframe(timeframe) * 60;
    const signals: StrategySignal[] = symbolData?.strategy_signals ?? [];
    const currentTime = currentCandleRef.current?.time;

    const strategyMarkers: SeriesMarker<Time>[] = enableStrategyMarkers ? signals
      .filter((signal) => signal.timeframe === engineTf)
      .map((signal, index) => {
        const rawTime = signal.timestamp ? coerceToSeconds(signal.timestamp) : Number(currentTime);
        const time = toCandleTime(rawTime, tfSeconds) as UTCTimestamp;
        const price = Number(signal.price);
        const isLong = signal.direction === "long";
        const confidence = Number(signal.confidence);
        const confidenceText = Number.isFinite(confidence) ? ` ${Math.round(confidence * 100)}%` : "";
        const label = `${signal.strategy ?? "Strategy"}${confidenceText}`;

        return {
          id: `${signal.strategy ?? "strategy"}-${signal.timeframe}-${signal.direction}-${index}`,
          time,
          position: isLong ? "atPriceBottom" as const : "atPriceTop" as const,
          price: Number.isFinite(price) ? price : currentCandleRef.current?.close ?? 0,
          shape: isLong ? "arrowUp" as const : "arrowDown" as const,
          color: isLong ? theme.colors.green : theme.colors.red,
          text: label,
          size: 1.2,
        };
      })
      .filter((marker) => Number.isFinite(marker.time) && Number.isFinite(marker.price)) : [];

    const event = symbolData?.structure_events?.[engineTf];
    const showStructureEvent =
      enableOverlays &&
      event?.valid &&
      ((event.type === "BOS" && overlays.bos) || (event.type === "CHOCH" && overlays.choch));
    const structureMarkers: SeriesMarker<Time>[] = showStructureEvent
      ? [{
          id: `structure-${engineTf}-${event.type}`,
          time: toCandleTime(coerceToSeconds(event.timestamp), tfSeconds) as UTCTimestamp,
          position: event.direction === "Bullish" ? "belowBar" as const : "aboveBar" as const,
          shape: event.direction === "Bullish" ? "arrowUp" as const : "arrowDown" as const,
          color: event.type === "CHOCH" ? theme.colors.amber : theme.colors.accentBlue,
          text: `${event.type} ${engineTf}`,
          size: 1,
        }].filter((marker) => Number.isFinite(marker.time))
      : [];

    markersApi.setMarkers([...structureMarkers, ...strategyMarkers]);
  }, [symbolData, timeframe, enableStrategyMarkers, enableOverlays, overlays.bos, overlays.choch]);

  // Merge only NEW ticks into the current candle
  useEffect(() => {
    if (!seriesRef.current || !baseSymbol || ticks.length === 0) return;

    const startIdx = lastTickCountRef.current;
    if (startIdx >= ticks.length) return;

    const tfSeconds = normalizeTimeframe(timeframe) * 60;
    const newTicks = ticks.slice(startIdx);
    lastTickCountRef.current = ticks.length;

    for (const tick of newTicks) {
      const price = Number(tick.price);
      if (!Number.isFinite(price) || price <= 0) continue;

      const tickTime = coerceToSeconds(tick.time);
      if (!Number.isFinite(tickTime) || tickTime <= 0) continue;

      const safeTime = toCandleTime(tickTime, tfSeconds);
      let candle = currentCandleRef.current;

      try {
        if (!candle || safeTime > candle.time) {
          candle = { time: safeTime, open: price, high: price, low: price, close: price };
          seriesRef.current.update(candle);
        } else if (safeTime === candle.time) {
          candle = {
            ...candle,
            high: Math.max(candle.high, price),
            low: Math.min(candle.low, price),
            close: price,
          };
          seriesRef.current.update(candle);
        } else {
          continue;
        }
      } catch (err) {
        console.warn("series.update skipped:", err);
        continue;
      }

      currentCandleRef.current = candle;
      setOverlayOHLC({ open: candle.open, high: candle.high, low: candle.low, close: candle.close });
      setIsLive(true);
      updateLiveDotPosition();
      recalculateStructureBoxes();

      onStatsUpdateRef.current?.({
        name: baseSymbol,
        ohlc: { open: candle.open, high: candle.high, low: candle.low, close: candle.close },
        lastUpdate: "latest",
      });
    }
  }, [ticks, timeframe, baseSymbol, updateLiveDotPosition, recalculateStructureBoxes]);

  if (!baseSymbol) {
    return (
      <div style={{ padding: 16, color: theme.colors.textDim, fontSize: 13 }}>
        Waiting for symbol…
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "100%",
      }}
    >
      {showHeader && (
        <div
          style={{
            display: "flex",
            gap: theme.spacing.sm,
            padding: "6px 8px",
            borderBottom: `1px solid ${theme.colors.grid}`,
            background: theme.colors.panel,
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 42,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {enableDrawing && TOOL_BUTTONS.map(({ mode, label, icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDrawingMode((current) => (current === mode ? null : mode))}
                title={label}
                aria-label={label}
                style={chartToolButtonStyle(drawingMode === mode)}
              >
                {icon}
              </button>
            ))}

            {enableDrawing && (
              <>
                <div style={{ width: 1, height: 22, background: theme.colors.grid }} />
                {COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setDrawingColor(swatch)}
                    title={`Color ${swatch}`}
                    aria-label={`Color ${swatch}`}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${drawingColor === swatch ? theme.colors.text : theme.colors.grid}`,
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
                  value={drawingWidth}
                  onChange={(event) => setDrawingWidth(Number(event.target.value))}
                  title="Line width"
                  aria-label="Line width"
                  style={{ width: 54 }}
                />
                {drawingMode === "rect" && (
                  <input
                    type="text"
                    value={boxLabel}
                    onChange={(event) => setBoxLabel(event.target.value)}
                    placeholder="box label"
                    title="Box label"
                    aria-label="Box label"
                    style={chartInputStyle}
                  />
                )}
                <button type="button" onClick={drawingActions?.undo} title="Undo" aria-label="Undo" style={chartToolButtonStyle(false)}>
                  U
                </button>
                <button type="button" onClick={drawingActions?.clear} title="Clear drawings" aria-label="Clear drawings" style={chartToolButtonStyle(false)}>
                  X
                </button>
              </>
            )}
          </div>

          {enableOverlays && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {(["snr", "snd", "ob", "fvg", "bos", "choch"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOverlays((current) => ({ ...current, [key]: !current[key] }))}
                  title={`Toggle ${key.toUpperCase()}`}
                  aria-label={`Toggle ${key.toUpperCase()}`}
                  style={overlayToggleStyle(overlays[key])}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chart container */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflow: "hidden",
        }}
      >
        <div
          ref={chartHostRef}
          style={{
            position: "absolute",
            inset: 0,
          }}
        />

        {structureBoxes.map((box) => (
          <div
            key={box.id}
            style={{
              position: "absolute",
              left: box.left,
              width: box.width,
              top: box.top,
              height: box.height,
              minHeight: 16,
              border: `1px solid ${box.borderColor}`,
              background: box.color,
              color: theme.colors.text,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: "14px",
              padding: "1px 5px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            {box.label}
          </div>
        ))}

        {enableDrawing && (
          <DrawingTools
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
            storageKey={`${baseSymbol}:${toEngineTimeframe(timeframe)}`}
            hideToolbar
            controlledMode={drawingMode}
            controlledColor={drawingColor}
            controlledLineWidth={drawingWidth}
            controlledBoxLabel={boxLabel}
            onDrawingModeChange={setDrawingMode}
            onActionsReady={setDrawingActions}
          />
        )}

        {isLoadingHistory && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${theme.colors.bg}cc`,
              color: theme.colors.textDim,
              fontSize: 13,
              zIndex: 20,
            }}
          >
            Loading history…
          </div>
        )}

        {overlayOHLC && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: theme.colors.panelAlt,
              border: `1px solid ${theme.colors.grid}`,
              borderRadius: theme.radius.sm,
              padding: "4px 8px",
              fontSize: 12,
              color: theme.colors.text,
              display: "flex",
              gap: 6,
              alignItems: "center",
              zIndex: 10,
            }}
          >
            {isLive && (
              <span style={{ color: theme.colors.green, fontWeight: 600, marginRight: 6 }}>
                ● LIVE
              </span>
            )}
            <span>
              O: {overlayOHLC.open.toFixed(5)}, H: {overlayOHLC.high.toFixed(5)}, L:{" "}
              {overlayOHLC.low.toFixed(5)},
            </span>
            <span
              style={{
                color:
                  overlayOHLC.close > overlayOHLC.open
                    ? theme.colors.green
                    : overlayOHLC.close < overlayOHLC.open
                    ? theme.colors.red
                    : theme.colors.textDim,
                fontWeight: 600,
              }}
            >
              C: {overlayOHLC.close.toFixed(5)}
            </span>
          </div>
        )}

        {isLive && liveDotPos && (
          <div
            style={{
              position: "absolute",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: theme.colors.accentBlue,
              boxShadow: `0 0 8px ${theme.colors.accentBlue}`,
              transform: "translate(-50%, -50%)",
              left: `${liveDotPos.x}px`,
              top: `${liveDotPos.y}px`,
              zIndex: 9,
            }}
          />
        )}
      </div>
    </div>
  );
};

function chartToolButtonStyle(active: boolean): React.CSSProperties {
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
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
  };
}

function overlayToggleStyle(active: boolean): React.CSSProperties {
  return {
    height: 26,
    padding: "0 8px",
    background: active ? `${theme.colors.accentBlue}33` : theme.colors.bg,
    color: active ? theme.colors.accentBlue : theme.colors.textDim,
    border: `1px solid ${active ? theme.colors.accentBlue : theme.colors.grid}`,
    borderRadius: theme.radius.sm,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0,
  };
}

const chartInputStyle: React.CSSProperties = {
  width: 92,
  height: 26,
  padding: "0 8px",
  border: `1px solid ${theme.colors.grid}`,
  borderRadius: theme.radius.sm,
  background: theme.colors.bg,
  color: theme.colors.text,
  fontSize: 12,
  outline: "none",
};

export default LiveChart;
