import { useEffect, useRef, useState } from "react";
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

function normalizeTimeframe(tf: string): number {
  const lower = tf.toLowerCase().trim();
  if (lower.endsWith("m")) return parseInt(lower.replace("m", ""), 10);
  if (lower.endsWith("h")) return parseInt(lower.replace("h", ""), 10) * 60;
  if (lower.endsWith("d")) return parseInt(lower.replace("d", ""), 10) * 1440;
  const parsed = parseInt(lower, 10);
  return isNaN(parsed) ? 1 : parsed;
}

function coerceToSeconds(raw: any): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
  if (typeof raw === "string") return Math.floor(new Date(raw).getTime() / 1000);
  if (typeof raw === "object") {
    if ("seconds" in raw) return Math.floor(Number(raw.seconds));
    if ("epoch" in raw) return Math.floor(Number(raw.epoch));
    if (typeof raw.valueOf === "function") return Math.floor(Number(raw.valueOf()));
  }
  return 0;
}

let currentCandle: Candle | null = null;

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

  const [overlayOHLC, setOverlayOHLC] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [liveDotPos, setLiveDotPos] = useState<{ x: number; y: number } | null>(null);

  // Create chart + seed with history
  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = createChart(containerRef.current, {
      width: width ?? containerRef.current.clientWidth,
      height: height ?? (containerRef.current.clientHeight || 500),
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
      timeScale: {
        timeVisible: true,
        borderColor: theme.colors.grid,
      },
      rightPriceScale: {
        borderColor: theme.colors.grid,
      },
    });

    seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor: theme.colors.green,
      downColor: theme.colors.red,
      borderVisible: false,
      wickUpColor: theme.colors.green,
      wickDownColor: theme.colors.red,
    });

    const tfMinutes = normalizeTimeframe(timeframe);
    const url = `http://localhost:8000/api/mt5/history?symbol=${encodeURIComponent(
      baseSymbol
    )}&timeframe=${tfMinutes}&bars=500`;

    fetch(url)
      .then((res) => res.json())
      .then((bars: any[]) => {
        const mapped = (bars ?? []).map((b) => {
          const t = coerceToSeconds(b.time ?? b.timestamp) as number;
          const safeTime = Number(t) as UTCTimestamp;
          return {
            time: safeTime,
            open: Number(b.open),
            high: Number(b.high),
            low: Number(b.low),
            close: Number(b.close),
          };
        });

        if (mapped.length) {
          seriesRef.current?.setData(mapped);
          currentCandle = mapped[mapped.length - 1];
          chartRef.current?.timeScale().fitContent();

          setOverlayOHLC({ ...currentCandle });
          setIsLive(true);
          updateLiveDotPosition();

          onStatsUpdate?.({
            name: baseSymbol,
            ohlc: { ...currentCandle },
            lastUpdate: "latest",
          });
        }
      })
      .catch((err) => console.error("⚠️ History fetch error", err));

    chartRef.current.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !seriesRef.current) {
        setIsLive(true);
        return;
      }
      const data = param.seriesData.get(seriesRef.current) as BarData<UTCTimestamp> | undefined;
      if (data) {
        setIsLive(false);
        setOverlayOHLC({ open: data.open, high: data.high, low: data.low, close: data.close });
      }
    });

    const ro = new ResizeObserver(() => {
      updateLiveDotPosition();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      currentCandle = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseSymbol, timeframe]);

  // Merge ticks into current candle
  useEffect(() => {
    if (!seriesRef.current || !ticks.length) return;

    const tfMinutes = normalizeTimeframe(timeframe);
    const tfSeconds = tfMinutes * 60;

    ticks.forEach((tick) => {
      const price = Number(tick.price);
      if (!Number.isFinite(price) || price <= 0) return;

      const tickTime = coerceToSeconds(tick.time);
      if (!Number.isFinite(tickTime) || tickTime <= 0) return;

      const candleTime = Math.floor(tickTime / tfSeconds) * tfSeconds;
      const safeTime = Number(candleTime) as UTCTimestamp;

      if (!currentCandle || safeTime > currentCandle.time) {
        if (currentCandle) {
          setOverlayOHLC({ ...currentCandle });
          setIsLive(true);
          onStatsUpdate?.({
            name: baseSymbol,
            ohlc: { ...currentCandle },
            lastUpdate: "latest",
          });
        }
        currentCandle = { time: safeTime, open: price, high: price, low: price, close: price };
        seriesRef.current?.update(currentCandle);
      } else if (safeTime === currentCandle.time) {
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;
        seriesRef.current?.update(currentCandle);
      }

      setOverlayOHLC({ ...currentCandle });
      setIsLive(true);
      updateLiveDotPosition();

      onStatsUpdate?.({
        name: baseSymbol,
        ohlc: { ...currentCandle },
        lastUpdate: "latest",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticks]);

  const updateLiveDotPosition = () => {
    if (!chartRef.current || !seriesRef.current || !currentCandle) return;
    const x = chartRef.current.timeScale().timeToCoordinate(currentCandle.time as UTCTimestamp);
    const y = seriesRef.current.priceToCoordinate(currentCandle.close);
    if (x != null && y != null) {
      setLiveDotPos({ x, y });
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "100%",
      }}
    >
      {/* OHLC Overlay */}
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
            <span
              style={{
                color: theme.colors.green,
                fontWeight: 600,
                marginRight: 6,
              }}
            >
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

      {/* Live Candle Dot */}
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
