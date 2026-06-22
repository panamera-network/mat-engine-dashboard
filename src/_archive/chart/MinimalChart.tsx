import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
} from "lightweight-charts";
import type {
  UTCTimestamp,
  CandlestickData,
} from "lightweight-charts";


interface MinimalChartProps {
  filename: string;
  timeframe: string;
  onStatsUpdate: (stats: { name: string; latest: number } | null) => void;
}

const MinimalChart: React.FC<MinimalChartProps> = ({ filename, timeframe, onStatsUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: 600,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#0f1115" },
        textColor: "#d1d1d1",
      },
      grid: {
        vertLines: { color: "#1a1d23" },
        horzLines: { color: "#1a1d23" },
      },
      timeScale: { timeVisible: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Dummy candles (ignores filename/timeframe for now)
    const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
    const candles: CandlestickData[] = [];
    for (let i = 0; i < 20; i++) {
      const base = 100 + i;
      candles.push({
        time: (now - (20 - i) * 60) as UTCTimestamp,
        open: base,
        high: base + 5,
        low: base - 5,
        close: base + (i % 2 === 0 ? 3 : -3),
      });
    }
    series.setData(candles);

    // Report last close
    const last = candles[candles.length - 1];
    onStatsUpdate({ name: filename, latest: last.close });

    // Overlay div
    const canvas = containerRef.current.querySelector("canvas");
const overlay = document.createElement("div");
overlay.className = "live-candle-overlay";
canvas?.parentElement?.appendChild(overlay);

    // Position overlay on last candle
    const x = chart.timeScale().timeToCoordinate(last.time);
    const yHigh = series.priceToCoordinate(last.high);
    const yLow = series.priceToCoordinate(last.low);

    if (x !== null && yHigh !== null && yLow !== null) {
      overlay.style.left = "100px";
      overlay.style.top = "50px";
      overlay.style.width = "100px";
      overlay.style.height = "200px";
      overlay.style.background = "rgba(255,0,0,0.7)";
      overlay.style.border = "3px solid yellow";
      overlay.style.zIndex = "99999";
    }

    return () => {
      chart.remove();
      overlay.remove();
    };
  }, [filename, timeframe, onStatsUpdate]);

  return <div ref={containerRef} style={{ position: "relative" }} />;
};

export default MinimalChart;
