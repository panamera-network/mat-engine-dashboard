import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
} from "lightweight-charts";
import type {
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
  BarData,
} from "lightweight-charts";
import { theme } from "../../theme";
import { coerceToSeconds, normalizeTimeframe, toCandleTime } from "./chartUtils";
import { useStore } from "../system/store";
import type { Candle as IndicatorCandle } from "../indicators";

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

  const [overlayOHLC, setOverlayOHLC] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [liveDotPos, setLiveDotPos] = useState<{ x: number; y: number } | null>(null);

  const updateLiveDotPosition = useCallback(() => {
    const candle = currentCandleRef.current;
    if (!chartRef.current || !seriesRef.current || !candle) return;
    const x = chartRef.current
      .timeScale()
      .timeToCoordinate(candle.time as UTCTimestamp);
    const y = seriesRef.current.priceToCoordinate(candle.close);
    if (x != null && y != null) setLiveDotPos({ x, y });
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

    const tfMinutes = normalizeTimeframe(timeframe);
    const url = `/api/mt5/history?symbol=${encodeURIComponent(baseSymbol)}&timeframe=${tfMinutes}&bars=500`;

    fetch(url, { signal: abort.signal })
      .then((res) => res.json())
      .then((bars: unknown) => {
        if (!seriesRef.current || abort.signal.aborted) return;
        if (!Array.isArray(bars)) {
          console.warn("Invalid history payload for", baseSymbol);
          return;
        }

        const mapped: Candle[] = bars
          .map((b: Record<string, unknown>) => ({
            time: coerceToSeconds(b.time ?? b.timestamp) as UTCTimestamp,
            open: Number(b.open),
            high: Number(b.high),
            low: Number(b.low),
            close: Number(b.close),
          }))
          .filter((c) => Number.isFinite(c.time) && c.time > 0)
          .sort((a, b) => Number(a.time) - Number(b.time));

        if (!mapped.length) return;

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

        const indicatorCandles: IndicatorCandle[] = bars.map((b: Record<string, unknown>) => ({
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
          volume: Number(b.volume ?? b.tick_volume ?? 0),
        }));
        useStore.getState().updateIndicators(baseSymbol, indicatorCandles);
      })
      .catch((err) => {
        if (!abort.signal.aborted) console.error("History fetch error:", err);
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
    };
  }, [baseSymbol, timeframe, width, height, onStatsUpdate, updateLiveDotPosition]);

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
      ref={containerRef}
      style={{
        position: "relative",
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "100%",
      }}
    >
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
  );
};

export default LiveChart;
