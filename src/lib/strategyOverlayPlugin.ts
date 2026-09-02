// ChartPlugin rendering mat-strategy-engine's structure/signal data
// (snr_levels, order_blocks, fvg, supply_demand_zones, strategy_signals,
// structure_events) on the chart, using @mat/chart-core's existing
// ChartPlugin extension point (the same one IndicatorOverlayPlugin/
// MTFContextPlugin use in the terminal app) plus the generic
// FilledRegionPrimitive for time-anchored zone boxes — no chart-core
// changes beyond that already-generic primitive. Strategy Engine analysis
// stays entirely server-side; this plugin only reads the already-fetched
// feed payload and draws it.
import { LineStyle, createSeriesMarkers, type ISeriesApi, type IPriceLine, type ISeriesMarkersPluginApi, type SeriesMarker, type SeriesType, type Time } from "lightweight-charts";
import { FilledRegionPrimitive, type ChartPlugin, type ChartPluginContext, type FilledRegion } from "@mat/chart-core";
import type { TerminalChartPluginFactory } from "@mat/trading-terminal-surface";
import { useStore } from "../components/system/store";
import { feedLookupKey } from "./symbolUtils";
import { toEngineTimeframe, coerceToSeconds, toCandleTime, normalizeTimeframe } from "../components/chart/chartUtils";
import { useStrategyOverlayToggles, type StrategyOverlayToggles } from "./strategyOverlayToggles";

const SNR_TIMEFRAMES = ["M15", "H1", "H4", "D1"];
const colors = { green: "#34d399", red: "#fb7185", blue: "#60a5fa", amber: "#fbbf24" };

function fillAlpha(hex: string): string {
  return `${hex}33`; // ~20% opacity fill, matching the retired chart's `${color}2a`-style translucent fill
}

class StrategyOverlayPlugin implements ChartPlugin {
  readonly id = "strategy-overlay";
  private context: ChartPluginContext | null = null;
  private markersApi: ISeriesMarkersPluginApi<Time> | null = null;
  private regionsPrimitive: FilledRegionPrimitive | null = null;
  private priceLines: IPriceLine[] = [];
  private unsubscribeFeed: (() => void) | null = null;
  private unsubscribeToggles: (() => void) | null = null;
  private readonly symbolId: string;
  private readonly timeframe: string;

  constructor(symbolId: string, timeframe: string) {
    this.symbolId = symbolId;
    this.timeframe = timeframe;
  }

  // @mat/chart-core and this dashboard each install their own copy of
  // lightweight-charts (two separate npm projects, not a shared workspace),
  // so `ChartPluginContext.mainSeries`'s type and this dashboard's own
  // `ISeriesApi` type are structurally identical but nominally distinct —
  // the underlying object is the same real series instance either way.
  private get series(): ISeriesApi<SeriesType> | null {
    return (this.context?.mainSeries as unknown as ISeriesApi<SeriesType>) ?? null;
  }

  initialize(context: ChartPluginContext) {
    this.context = context;
    const series = this.series;
    if (!series) return;
    this.markersApi = createSeriesMarkers(series, []);
    this.regionsPrimitive = new FilledRegionPrimitive();
    series.attachPrimitive(this.regionsPrimitive);

    const apply = () => this.apply(useStore.getState().feed, useStrategyOverlayToggles.getState().toggles);
    this.unsubscribeFeed = useStore.subscribe((state) => state.feed, () => apply());
    this.unsubscribeToggles = useStrategyOverlayToggles.subscribe(() => apply());
    apply();
  }

  private clear() {
    const series = this.series;
    if (series) {
      for (const line of this.priceLines) {
        try { series.removePriceLine(line); } catch { /* series may already be torn down */ }
      }
    }
    this.priceLines = [];
    this.markersApi?.setMarkers([]);
    this.regionsPrimitive?.setRegions([]);
  }

  private apply(feed: Record<string, any>, toggles: StrategyOverlayToggles) {
    const series = this.series;
    if (!series) return;
    this.clear();

    const symbolData = feed[feedLookupKey(this.symbolId, feed)];
    if (!symbolData) return;

    const engineTf = toEngineTimeframe(this.timeframe);
    const tfSeconds = normalizeTimeframe(this.timeframe) * 60;

    // SNR levels — labelled price lines, same presentation as the retired chart.
    if (toggles.snr) {
      for (const tf of SNR_TIMEFRAMES) {
        const levels: any[] = symbolData.snr_levels?.[tf] ?? [];
        for (const lvl of levels) {
          const price = Number(lvl.level);
          if (!Number.isFinite(price)) continue;
          const isResistance = String(lvl.type).toLowerCase() === "resistance";
          const tested = String(lvl.status ?? "").toLowerCase() === "tested";
          this.priceLines.push(series.createPriceLine({
            price,
            color: isResistance ? colors.red : colors.green,
            lineWidth: 1,
            lineStyle: tested ? LineStyle.Solid : LineStyle.Dashed,
            axisLabelVisible: true,
            title: lvl.label || `${tested ? "tested" : "untested"} ${String(lvl.type).toLowerCase()} ${tf}`,
          }));
        }
      }
    }

    // Order blocks / FVG / supply-demand zones — real filled, time-anchored
    // regions via the generic FilledRegionPrimitive, open-ended to the live
    // edge, matching the retired chart's DOM-box behavior exactly.
    const regions: FilledRegion[] = [];
    const addRegion = (id: string, label: string, top: number, bottom: number, bullish: boolean, rawTime: unknown) => {
      if (!Number.isFinite(top) || !Number.isFinite(bottom)) return;
      const rawSeconds = rawTime ? coerceToSeconds(rawTime as any) : NaN;
      if (!Number.isFinite(rawSeconds)) return;
      const time1 = toCandleTime(rawSeconds, tfSeconds);
      const color = bullish ? colors.green : colors.red;
      regions.push({ id, time1, time2: "live", price1: top, price2: bottom, color: fillAlpha(color), borderColor: color, label });
    };

    if (toggles.ob) {
      const orderBlocks: any[] = symbolData.order_blocks?.[engineTf] ?? [];
      orderBlocks.slice(-4).forEach((ob, index) => {
        const suffix = ob.mitigated ? " mitigated" : "";
        addRegion(`ob-${index}`, `OB ${ob.type ?? ""}${suffix}`.trim(), Number(ob.high), Number(ob.low), ob.type === "Bullish", ob.timestamp);
      });
    }

    if (toggles.fvg) {
      const fvgs: any[] = symbolData.fvg?.[engineTf] ?? [];
      fvgs.slice(-4).forEach((fvg, index) => {
        addRegion(`fvg-${index}`, `FVG ${fvg.type ?? ""}`.trim(), Number(fvg.top), Number(fvg.bottom), fvg.type === "Bullish", fvg.timestamp);
      });
    }

    if (toggles.snd) {
      const zones: any[] = symbolData.supply_demand_zones?.[engineTf] ?? [];
      zones.slice(-4).forEach((zone, index) => {
        addRegion(`snd-${index}`, `${String(zone.type ?? "SND").toUpperCase()}`, Number(zone.top), Number(zone.bottom), zone.type === "demand", zone.timestamp);
      });
    }

    this.regionsPrimitive?.setRegions(regions);

    // Strategy signals — chart markers at the signal's actual suggested
    // price (signal.price), matching the retired chart exactly. Not gated
    // by any of the 6 layer toggles — the old chart never gated these
    // either (only its master enableStrategyMarkers switch, which this
    // plugin's registration itself already stands in for).
    const signals: any[] = symbolData.strategy_signals ?? [];
    const currentBar = this.context?.getData().slice(-1)[0];
    const signalMarkers: SeriesMarker<Time>[] = signals
      .filter((signal) => signal.timeframe === engineTf)
      .map((signal, index) => {
        const rawTime = signal.timestamp ? coerceToSeconds(signal.timestamp) : currentBar?.time;
        const time = toCandleTime(Number(rawTime), tfSeconds) as unknown as Time;
        const price = Number(signal.price);
        const isLong = signal.direction === "long";
        const confidence = Number(signal.confidence);
        const confidenceText = Number.isFinite(confidence) ? ` ${Math.round(confidence * 100)}%` : "";
        return {
          time,
          // Anchored to the signal's actual suggested price (signal.price),
          // matching the retired chart exactly — not bar-relative.
          position: isLong ? "atPriceBottom" as const : "atPriceTop" as const,
          price: Number.isFinite(price) ? price : currentBar?.close ?? 0,
          shape: isLong ? "arrowUp" as const : "arrowDown" as const,
          color: isLong ? colors.green : colors.red,
          text: `${signal.strategy ?? "Strategy"}${confidenceText}`,
          id: `signal-${index}`,
          size: 1.2,
        };
      })
      .filter((marker) => Number.isFinite(marker.time as unknown as number) && Number.isFinite(marker.price));

    // Structure events (BOS/CHoCH) — gated by their own separate toggles,
    // matching the retired chart's `(type==="BOS"&&bos)||(type==="CHOCH"&&choch)`.
    const event = symbolData.structure_events?.[engineTf];
    const showStructureEvent = event?.valid && ((event.type === "BOS" && toggles.bos) || (event.type === "CHOCH" && toggles.choch));
    const structureMarkers: SeriesMarker<Time>[] = showStructureEvent
      ? [{
          time: toCandleTime(coerceToSeconds(event.timestamp), tfSeconds) as unknown as Time,
          position: event.direction === "Bullish" ? "belowBar" as const : "aboveBar" as const,
          shape: event.direction === "Bullish" ? "arrowUp" as const : "arrowDown" as const,
          color: event.type === "CHOCH" ? colors.amber : colors.blue,
          text: `${event.type} ${engineTf}`,
          id: `structure-${engineTf}-${event.type}`,
        }]
      : [];

    this.markersApi?.setMarkers([...structureMarkers, ...signalMarkers]);
  }

  destroy() {
    this.unsubscribeFeed?.();
    this.unsubscribeFeed = null;
    this.unsubscribeToggles?.();
    this.unsubscribeToggles = null;
    const series = this.series;
    if (series && this.regionsPrimitive) {
      try { series.detachPrimitive(this.regionsPrimitive); } catch { /* series may already be torn down */ }
    }
    this.regionsPrimitive = null;
    this.clear();
    this.context = null;
  }
}

export function createStrategyOverlayPluginFactory(): TerminalChartPluginFactory<string> {
  return {
    id: "strategy-overlay",
    create: (context) => new StrategyOverlayPlugin(context.symbolId, context.timeframe),
  };
}
