// TradingFeed<string> adapter: bridges this dashboard's EXISTING data layer
// (useStore's `ticks`/`feed` state, itself populated by TickStream.tsx and
// LiveSignalFeed.tsx/EnginePoller.tsx against mat-strategy-engine) into
// @mat/chart-core's generic feed contract. No new WebSocket connection is
// opened here — ticks are read from the store TickStream.tsx already
// maintains, so the terminal surface's chart rides the same single tick
// stream every other part of this dashboard already uses.
import type { CandleData, TradingFeed } from "@mat/chart-core";
import { useStore } from "../components/system/store";
import { fetchHistory } from "../api/engineClient";
import { toEngineTimeframe, normalizeTimeframe, toCandleTime, coerceToSeconds } from "../components/chart/chartUtils";

export function createStrategyEngineFeed(): TradingFeed<string> {
  return {
    async getHistoricalCandles({ symbol, timeframe, limit }) {
      const res = await fetchHistory(symbol, toEngineTimeframe(timeframe), limit ?? 300);
      return res.candles.map((c): CandleData => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
    },

    subscribe(request, handlers) {
      const tfSeconds = normalizeTimeframe(request.timeframe) * 60;
      // Tracked by tick TIME (not array length/index) so the store's
      // `.slice(-1000)` cap on `ticks[symbol]` (store.ts addTick) can never
      // cause ticks to be silently skipped or re-processed.
      let lastAppliedTickTime = 0;
      let currentCandle: CandleData | null = null;

      const applyTicks = (ticks: { price: number; time: number }[] | undefined) => {
        if (!ticks || ticks.length === 0) return;
        for (const tick of ticks) {
          const price = Number(tick.price);
          if (!Number.isFinite(price) || price <= 0) continue;
          const tickTime = coerceToSeconds(tick.time);
          if (!Number.isFinite(tickTime) || tickTime <= lastAppliedTickTime) continue;
          lastAppliedTickTime = tickTime;

          const barTime = toCandleTime(tickTime, tfSeconds) as number;
          if (!currentCandle || barTime > currentCandle.time) {
            currentCandle = { time: barTime, open: price, high: price, low: price, close: price, volume: 0 };
          } else if (barTime === currentCandle.time) {
            currentCandle = {
              ...currentCandle,
              high: Math.max(currentCandle.high, price),
              low: Math.min(currentCandle.low, price),
              close: price,
            };
          } else {
            continue;
          }
          handlers.onLiveCandle(currentCandle);
        }
      };

      // Prime with whatever ticks already exist for this symbol (e.g. the
      // chart mounted after TickStream had already collected some).
      applyTicks(useStore.getState().ticks[request.symbol]);

      const unsubscribe = useStore.subscribe(
        (state) => state.ticks[request.symbol],
        (ticks) => applyTicks(ticks)
      );

      return unsubscribe;
    },

    getCurrentPrices() {
      const ticks = useStore.getState().ticks[useStore.getState().resolvedSymbol || useStore.getState().selectedSymbol];
      const last = ticks?.[ticks.length - 1]?.price ?? 0;
      return { bid: last, ask: last, mid: last, spread: 0 };
    },
  };
}
