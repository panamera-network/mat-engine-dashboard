import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
} from "lightweight-charts";
import type {
  ISeriesApi,
  IPriceLine,
  UTCTimestamp,
  CandlestickData,
  BarData,
} from "lightweight-charts";
import { theme } from "../../theme";
import { coerceToSeconds, normalizeTimeframe, toCandleTime, toEngineTimeframe } from "./chartUtils";
import { useStore } from "../system/store";
import type { Candle as IndicatorCandle } from "../indicators";
import { INDICATOR_REGISTRY, type IndicatorKey } from "../../lib/indicators";
import { DrawingTools } from "./DrawingTools";
import { IndicatorSelector } from "./IndicatorSelector";
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
}

type Candle = CandlestickData<UTCTimestamp>;

const LiveChart: React.FC<LiveChartProps> = ({
  baseSymbol,
  timeframe,
  ticks,
  onStatsUpdate,
  width,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const currentCandleRef = useRef<Candle | null>(null);
  const lastTickCountRef = useRef(0);
  const candlesRef = useRef<Candle[]>([]);
  const structurePriceLinesRef = useRef<IPriceLine[]>([]);

  const [overlayOHLC, setOverlayOHLC] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [liveDotPos, setLiveDotPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<Set<IndicatorKey>>(new Set());
  const indicatorSeriesRef = useRef<Map<IndicatorKey, ISeriesApi<any>>>(new Map());

  const updateLiveDotPosition = useCallback(() => {
    const candle = currentCandleRef.current;
    if (!chartRef.current || !seriesRef.current || !candle) return;
    const x = chartRef.current
      .timeScale()
      .timeToCoordinate(candle.time as UTCTimestamp);
    const y = seriesRef.current.priceToCoordinate(candle.close);
    if (x != null && y != null) setLiveDotPos({ x, y });
  }, []);

  const handleToggleIndicator = useCallback((indicator: IndicatorKey) => {
    setSelectedIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(indicator)) {
        next.delete(indicator);
        // Remove series from chart
        const series = indicatorSeriesRef.current.get(indicator);
        if (series && chartRef.current) {
          chartRef.current.removeSeries(series as any);
          indicatorSeriesRef.current.delete(indicator);
        }
      } else {
        next.add(indicator);
      }
      return next;
    });
  }, []);

  // Create chart + seed with history
  useEffect(() => {
    if (!baseSymbol || !containerRef.current) return;

    const container = containerRef.current;
    const abort = new AbortController();

    const chart = createChart(container, {
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

        onStatsUpdate?.({
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

    const ro = new ResizeObserver(() => updateLiveDotPosition());
    ro.observe(container);

    return () => {
      abort.abort();
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      currentCandleRef.current = null;
      lastTickCountRef.current = 0;
      structurePriceLinesRef.current = []; // removed with the series above
    };
  }, [baseSymbol, timeframe, width, height, onStatsUpdate, updateLiveDotPosition]);

  // Render/remove indicators
  useEffect(() => {
    if (!chartRef.current || !candlesRef.current.length) return;

    for (const indicator of selectedIndicators) {
      if (indicatorSeriesRef.current.has(indicator)) continue; // Already rendered

      try {
        const config = INDICATOR_REGISTRY[indicator]();
        let indicatorData: any;

        if (config.params.length === 0) {
          indicatorData = (config.fn as any)(candlesRef.current);
        } else if (config.params.length === 1) {
          indicatorData = (config.fn as any)(candlesRef.current, config.params[0]);
        } else if (config.params.length === 2) {
          indicatorData = (config.fn as any)(candlesRef.current, config.params[0], config.params[1]);
        } else {
          indicatorData = (config.fn as any)(candlesRef.current, config.params[0], config.params[1], config.params[2]);
        }

        // Only handle simple single-series indicators for now
        if (!("data" in indicatorData)) {
          console.warn(`[LiveChart] Indicator ${indicator} not yet supported`);
          continue;
        }

        const series = (chartRef.current.addSeries as any)("Line" as any, {
          color: indicatorData.color || theme.colors.text,
          lineWidth: (indicatorData.lineWidth || 2) as any,
          priceScaleId: "right",
        });

        // Convert IndicatorPoint to chart data format
        const data = indicatorData.data.map((p: any) => ({
          time: (p.time / 1000) as UTCTimestamp,
          value: p.value,
        }));

        series.setData(data);
        indicatorSeriesRef.current.set(indicator, series);
      } catch (err) {
        console.error(`[LiveChart] Failed to render indicator ${indicator}:`, err);
      }
    }
  }, [selectedIndicators]);

  // Overlay SNR levels, order blocks, and FVGs for the displayed timeframe —
  // from feed[baseSymbol].snr_levels/order_blocks/fvg (see CLAUDE.md in the
  // engine repo for the schema). Drawn as price lines: SNR = one line per
  // level, order blocks/FVGs = a top+bottom line pair bounding the zone
  // (lightweight-charts has no built-in filled-rectangle primitive).
  const feed = useStore((s) => s.feed);
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

    const engineTf = toEngineTimeframe(timeframe);
    const symbolData = feed[baseSymbol];
    if (!symbolData) return;

    const snrLevels: any[] = symbolData.snr_levels?.[engineTf] ?? [];
    const orderBlocks: any[] = symbolData.order_blocks?.[engineTf] ?? [];
    const fvgs: any[] = symbolData.fvg?.[engineTf] ?? [];

    for (const lvl of snrLevels) {
      const price = Number(lvl.level);
      if (!Number.isFinite(price)) continue;
      structurePriceLinesRef.current.push(
        series.createPriceLine({
          price,
          color: lvl.type === "Resistance" ? theme.colors.red : theme.colors.green,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SNR ${lvl.type}`,
        })
      );
    }

    for (const ob of orderBlocks) {
      const high = Number(ob.high);
      const low = Number(ob.low);
      if (!Number.isFinite(high) || !Number.isFinite(low)) continue;
      const color = ob.type === "Bullish" ? theme.colors.green : theme.colors.red;
      const suffix = ob.mitigated ? " (mitigated)" : "";
      structurePriceLinesRef.current.push(
        series.createPriceLine({ price: high, color, lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: `OB ${ob.type} top${suffix}` }),
        series.createPriceLine({ price: low, color, lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: `OB ${ob.type} bottom${suffix}` })
      );
    }

    for (const fvg of fvgs) {
      const top = Number(fvg.top);
      const bottom = Number(fvg.bottom);
      if (!Number.isFinite(top) || !Number.isFinite(bottom)) continue;
      const color = fvg.type === "Bullish" ? theme.colors.green : theme.colors.red;
      structurePriceLinesRef.current.push(
        series.createPriceLine({ price: top, color, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: `FVG ${fvg.type} top` }),
        series.createPriceLine({ price: bottom, color, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: `FVG ${fvg.type} bottom` })
      );
    }
  }, [feed, baseSymbol, timeframe]);

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

      onStatsUpdate?.({
        name: baseSymbol,
        ohlc: { open: candle.open, high: candle.high, low: candle.low, close: candle.close },
        lastUpdate: "latest",
      });
    }
  }, [ticks, timeframe, baseSymbol, onStatsUpdate, updateLiveDotPosition]);

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
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: theme.spacing.sm,
          padding: theme.spacing.sm,
          borderBottom: `1px solid ${theme.colors.grid}`,
          background: theme.colors.panel,
          alignItems: "center",
        }}
      >
        <IndicatorSelector
          selectedIndicators={selectedIndicators}
          onToggleIndicator={handleToggleIndicator}
        />
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Drawing tools overlay */}
        <DrawingTools containerRef={containerRef as React.RefObject<HTMLDivElement>} />

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

export default LiveChart;
