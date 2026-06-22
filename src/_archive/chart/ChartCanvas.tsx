import {
  createChart,
  ColorType,
  CandlestickSeries,
} from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
} from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';

interface ChartCanvasProps {
  baseSymbol?: string;   // optional, defaults to EURUSD
  timeframe: string;     // e.g. "1", "1m", "5m", "H1", "60"
  onStatsUpdate: (stats: { name: string; latest: number } | null) => void;
}

type Candle = CandlestickData<UTCTimestamp>;

function normalizeTimeframe(tf: string): number {
  const lower = tf.toLowerCase().trim();
  if (lower.endsWith("m")) return parseInt(lower.replace("m", ""), 10);
  if (lower.endsWith("h")) return parseInt(lower.replace("h", ""), 10) * 60;
  if (lower.endsWith("d")) return parseInt(lower.replace("d", ""), 10) * 1440;
  return parseInt(lower, 10);
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({
  baseSymbol = "EURUSD",
  timeframe,
  onStatsUpdate,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [resolvedSymbol, setResolvedSymbol] = useState<string | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/mt5/resolve?base=${baseSymbol}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "ok" && data.resolved) {
          setResolvedSymbol(data.resolved);
        } else {
          setResolvedSymbol(baseSymbol);
        }
      })
      .catch(() => setResolvedSymbol(baseSymbol));
  }, [baseSymbol]);

  useEffect(() => {
    if (!resolvedSymbol || !chartContainerRef.current || !timeframe) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 740,
      layout: {
        background: { type: ColorType.Solid, color: '#0f1115' },
        textColor: '#d1d1d1',
      },
      grid: {
        vertLines: { color: '#1a1d23' },
        horzLines: { color: '#1a1d23' },
      },
      timeScale: { borderColor: '#2b2b2b', timeVisible: true },
      rightPriceScale: { borderColor: '#2b2b2b' },
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    const tfMinutes = normalizeTimeframe(timeframe);

    // --- Create overlay div and append to canvas parent ---
    const canvas = chartContainerRef.current.querySelector('canvas');
    const overlay = document.createElement("div");
    overlay.className = "live-candle-overlay";
    canvas?.parentElement?.appendChild(overlay);

    // --- Fetch history ---
    fetch(`http://localhost:8000/api/mt5/history?symbol=${resolvedSymbol}&timeframe=${tfMinutes}&bars=500`)
      .then(res => res.json())
      .then((candles: Candle[]) => {
        if (!Array.isArray(candles)) throw new Error("Invalid history payload");
        const cleaned = candles
          .map(c => ({
            time: c.time as UTCTimestamp,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          }))
          .sort((a, b) => Number(a.time) - Number(b.time));
        series.setData(cleaned);
        chart.timeScale().fitContent();
        onStatsUpdate({ name: resolvedSymbol, latest: cleaned.at(-1)!.close });
      })
      .catch(err => console.error("History fetch error:", err));

    // --- Live ticks ---
    const ws = new WebSocket(`ws://localhost:8000/api/ws/ticks?symbol=${resolvedSymbol}`);
    let currentCandle: Candle | null = null;

    ws.onmessage = (event) => {
      const tick = JSON.parse(event.data);
      const price = Number(tick.last ?? tick.close ?? tick.bid ?? tick.ask ?? 0);
      if (!Number.isFinite(price) || price === 0) return;

      const tfSeconds = tfMinutes * 60;
      const candleTime = Math.floor(tick.time / tfSeconds) * tfSeconds as UTCTimestamp;

      if (!currentCandle || currentCandle.time !== candleTime) {
        currentCandle = { time: candleTime, open: price, high: price, low: price, close: price };
        series.update(currentCandle);
      } else {
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;
        series.update(currentCandle);
      }

      // --- Position overlay over active candle body ---
      const x = chart.timeScale().timeToCoordinate(candleTime);
      const yHigh = series.priceToCoordinate(currentCandle.high);
      const yLow = series.priceToCoordinate(currentCandle.low);

      if (x !== null && yHigh !== null && yLow !== null) {
        const barWidth = 12;
        overlay.style.display = "block";
        overlay.style.left = `${x - barWidth / 2}px`;
        overlay.style.top = `${Math.min(yHigh, yLow)}px`;
        overlay.style.width = `${barWidth}px`;
        overlay.style.height = `${Math.abs(yLow - yHigh)}px`;
      } else {
        overlay.style.display = "none";
      }

      onStatsUpdate({ name: resolvedSymbol, latest: price });
    };

    return () => {
      resizeObserver.disconnect();
      ws.close();
      chart.remove();
      overlay.remove();
    };
  }, [resolvedSymbol, timeframe, onStatsUpdate]);

  return (
    <div style={{ padding: '4px', backgroundColor: '#121212', color: '#eee' }}>
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default ChartCanvas;
