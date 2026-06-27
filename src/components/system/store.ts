// store.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { BiasPoint, Mode, Strength } from "../Strength_meter/csm_types";
import { calculateCurrencyStrengthFromFeed } from "../Strength_meter/calculate_strength";
import { classifyPulseIntensity, theme } from "../../theme";
import { calcAvgVolume, calcCCI, calcVolatility, type Candle } from "../indicators";
import type { AuditEvent } from "../InstrumentStrip/AuditTrail";
import type { Level } from "../InstrumentStrip/LiquidityHeatmapStrip";
import { pushNarrative } from "../Notification/pushNarrative";
import { feedLookupKey } from "../../lib/symbolUtils";

interface Tick {
  symbol: string;
  price: number;
  time: number;
}

interface Pulse {
  ts: number;
  intensity: number;
  color: string;
  glow: number;
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

// Derives short/mid/long trend slope from the real per-timeframe bias scores
// in feed[symbol].bias (backend: BiasEngine score, roughly -10..+10). Replaces
// reading feed[symbol].trendShort/Mid/Long, which never existed in the real
// /core/output schema.
function deriveTrendSlope(feed: Record<string, any>, symbol: string) {
  const biasMap = feed[symbol]?.bias ?? {};
  const avgScore = (tfs: string[]) => {
    const scores = tfs
      .map((tf) => Number(biasMap[tf]?.score))
      .filter((v) => Number.isFinite(v));
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };

  return {
    short: avgScore(["M15", "M30"]),
    mid: avgScore(["H1", "H4"]),
    long: avgScore(["D1", "W1", "MN1"]),
  };
}

// Flattens feed[symbol].supply_demand_zones (per-TF lists) into Level[] for
// the liquidity heatmap — price = zone midpoint, size = ATR-relative
// strength. Replaces reading feed[symbol].liquidityLevels, which never
// existed in the real /core/output schema.
function deriveLiquidityLevels(feed: Record<string, any>, symbol: string): Level[] {
  const zonesByTf = feed[symbol]?.supply_demand_zones ?? {};
  const levels: Level[] = [];

  for (const tf in zonesByTf) {
    for (const zone of zonesByTf[tf] ?? []) {
      const top = Number(zone.top);
      const bottom = Number(zone.bottom);
      const strength = Number(zone.strength);
      if (Number.isFinite(top) && Number.isFinite(bottom) && Number.isFinite(strength)) {
        levels.push({ price: (top + bottom) / 2, size: strength });
      }
    }
  }

  return levels;
}

export interface StoreState {
  feed: Record<string, any>;
  strengths: Strength[];
  mode: Mode;
  lastUpdated: Date | null;
  setFeed: (feed: Record<string, any>) => void;
  setMode: (mode: Mode) => void;

  wsBiasStatus: "connected" | "disconnected" | "reconnecting";
  wsTickStatus: "connected" | "disconnected" | "reconnecting";
  setWsBiasStatus: (status: "connected" | "disconnected" | "reconnecting") => void;
  setWsTickStatus: (status: "connected" | "disconnected" | "reconnecting") => void;

  selectedSymbol: string;
  setSelectedSymbol: (sym: string) => void;
  resolvedSymbol: string;
  setResolvedSymbol: (sym: string) => void;
  isResolvingSymbol: boolean;
  setIsResolvingSymbol: (v: boolean) => void;
  selectedTimeframe: Timeframe;
  setSelectedTimeframe: (tf: Timeframe) => void;

  ticks: Record<string, Tick[]>;
  addTick: (tick: Tick) => void;
  clearTicks: (symbol: string) => void;
  volatility: Record<string, number>;
  volume: Record<string, number>;
  avgVolume: Record<string, number>;
  cci: Record<string, number>;
  momentum: Record<string, number[]>;
  rawBiasData: Record<string, any>;

  profiles: Record<string, Timeframe[]>;
  activeProfile: string;
  setActiveProfile: (name: string) => void;
  saveProfile: (name: string, tfs: Timeframe[]) => void;
  deleteProfile: (name: string) => void;

  biasTimeline: Record<string, BiasPoint[]>;
  addBiasPoint: (symbol: string, point: BiasPoint) => void;

  pulses: Record<string, Pulse[]>;
  triggerPulse: (id: string, intensity?: number, color?: string) => void;

  auditTrail: AuditEvent[];
  volatilityHistory: Record<string, number[]>;
  riskDistance: number;
  rewardDistance: number;
  trendSlope: Record<string, { short: number; mid: number; long: number }>;
  liquidityLevels: Record<string, Level[]>;

  updateIndicators: (symbol: string, candles: Candle[]) => void;

  lastBiasAlignment: Record<string, "bullish" | "bearish" | "neutral">;

}

export const useStore = create<StoreState, [["zustand/subscribeWithSelector", never]]>(
  subscribeWithSelector<StoreState>((set, get) => ({
    feed: {},
    strengths: [],
    mode: "scalping",
    lastUpdated: null,

    wsBiasStatus: "disconnected",
    wsTickStatus: "disconnected",

    setWsBiasStatus: (status) => set({ wsBiasStatus: status }),
    setWsTickStatus: (status) => set({ wsTickStatus: status }),

    selectedSymbol: "XAUUSD",
    setSelectedSymbol: (sym) => {
      set({ selectedSymbol: sym });
      get().triggerPulse("bias", 0.6, theme.colors.accentBlue);
    },

    resolvedSymbol: "",
    setResolvedSymbol: (sym) => set({ resolvedSymbol: sym }),
    isResolvingSymbol: false,
    setIsResolvingSymbol: (v) => set({ isResolvingSymbol: v }),

    selectedTimeframe: (() => {
      try {
        return (localStorage.getItem("selectedTimeframe") as Timeframe) || "1m";
      } catch {
        return "1m";
      }
    })(),
    setSelectedTimeframe: (tf) => {
      localStorage.setItem("selectedTimeframe", tf);
      set({ selectedTimeframe: tf });
    },

    ticks: {},
    volatility: {},
    volume: {},
    avgVolume: {},
    cci: {},
    momentum: {},
    rawBiasData: {},

    auditTrail: [],
    volatilityHistory: {},
    riskDistance: 0,
    rewardDistance: 0,
    trendSlope: {},
    liquidityLevels: {},
    biasTimeline: {},
    pulses: {},
    lastBiasAlignment: {},


    triggerPulse: (id, intensity = 0.5, color = theme.colors.accentBlue) => {
      const { glow } = classifyPulseIntensity(intensity);
      set((state) => {
        const prev = state.pulses[id] ?? [];
        return {
          pulses: {
            ...state.pulses,
            [id]: [...prev, { ts: Date.now(), intensity, color, glow }].slice(-3),
          },
        };
      });
    },

    setFeed: (feed) => {
      const mode = get().mode;
      const strengths = calculateCurrencyStrengthFromFeed(feed, mode);
      const symbol = feedLookupKey(get().selectedSymbol, feed);

      set((state) => ({
        feed,
        strengths,
        lastUpdated: new Date(),
        rawBiasData: feed,
        // PARKED — no backend data source exists for these yet:
        //  - auditTrail/escalations: the engine's notification system was
        //    deleted as dead scratch code, never replaced.
        //  - volatilityHistory: /core/output has no time-series field.
        //  - riskDistance/rewardDistance: would need a "current price"
        //    reference in the feed, which doesn't exist yet either.
        // See CLAUDE.md for details. trendSlope/liquidityLevels below WERE
        // in this same category until fixed to derive from real fields.
        auditTrail: feed.auditTrail ?? state.auditTrail,
        volatilityHistory: {
          ...state.volatilityHistory,
          [symbol]: feed[symbol]?.volatilityHistory ?? state.volatilityHistory[symbol] ?? [],
        },
        riskDistance: feed[symbol]?.risk ?? state.riskDistance,
        rewardDistance: feed[symbol]?.reward ?? state.rewardDistance,
        trendSlope: {
          ...state.trendSlope,
          [symbol]: deriveTrendSlope(feed, symbol),
        },
        liquidityLevels: {
          ...state.liquidityLevels,
          [symbol]: deriveLiquidityLevels(feed, symbol),
        },
      }));

      const avgStrength = strengths.reduce((s, c) => s + Math.abs(c.value), 0) / (strengths.length || 1);
      const intensity = Math.min(1, avgStrength / 100);
      const avg = strengths.reduce((s, c) => s + c.value, 0) / (strengths.length || 1);
      const color = avg > 0 ? theme.colors.green : avg < 0 ? theme.colors.red : theme.colors.amber;

      get().triggerPulse("currency", intensity, color);
      get().triggerPulse("bias", Math.min(1, intensity + 0.2), theme.colors.accentBlue);
      get().triggerPulse("correlation", 0.5, theme.colors.amber);
    },

    setMode: (mode) => {
      const feed = get().feed;
      const strengths = calculateCurrencyStrengthFromFeed(feed, mode);
      set({ mode, strengths });
    },

    updateIndicators: (symbol, candles) => {
      const calculatedVol = calcVolatility(candles, 20);
      const calculatedCCI = calcCCI(candles, 20);
      const avgVol = calcAvgVolume(candles, 20);
      const latestVol = candles[candles.length - 1]?.volume ?? 0;

      set((state) => ({
        volatility: { ...state.volatility, [symbol]: calculatedVol },
        cci: { ...state.cci, [symbol]: calculatedCCI ?? 0 },
        volume: { ...state.volume, [symbol]: latestVol },
        avgVolume: { ...state.avgVolume, [symbol]: avgVol },
      }));
    },

    addTick: (tick) =>
      set((state) => {
        const prev = state.ticks[tick.symbol] ?? [];
        const next = [...prev, tick].slice(-1000);

        const prices = next.map((t) => t.price);
        const momentumSeries = state.momentum[tick.symbol] ?? [];
        const newMomentum = prices.length > 1 ? prices[prices.length - 1] - prices[0] : 0;
        const updatedSeries = [...momentumSeries, newMomentum].slice(-60);

        const intensity = Math.min(1, Math.abs(newMomentum) / 100);
        const color =
          newMomentum > 0 ? theme.colors.green :
          newMomentum < 0 ? theme.colors.red :
          theme.colors.amber;

        get().triggerPulse("volatility", intensity, color);
        get().triggerPulse("market", Math.min(1, intensity + 0.1), color);

        return {
          ticks: { ...state.ticks, [tick.symbol]: next },
          momentum: { ...state.momentum, [tick.symbol]: updatedSeries },
        };
      }),

    clearTicks: (symbol) =>
      set((state) => {
        const { [symbol]: _, ...rest } = state.ticks;
        return { ticks: rest };
      }),

    profiles: (() => {
      try {
        const saved = localStorage.getItem("profiles");
        return saved ? JSON.parse(saved) : { Default: ["5m", "1h"] };
      } catch {
        return { Default: ["5m", "1h"] };
      }
    })(),

    activeProfile: (() => {
      try {
        return localStorage.getItem("activeProfile") || "Default";
      } catch {
        return "Default";
      }
    })(),

    setActiveProfile: (name) => {
      const { profiles } = get();
      if (profiles[name]) {
        set({ activeProfile: name });
        localStorage.setItem("activeProfile", name);
      }
    },

    saveProfile: (name, tfs) => {
      const profiles = { ...get().profiles, [name]: tfs };
      set({ profiles, activeProfile: name });
      localStorage.setItem("profiles", JSON.stringify(profiles));
      localStorage.setItem("activeProfile", name);
      get().triggerPulse("multiTimeframe", 0.5, theme.colors.accentBlue);
    },
  deleteProfile: (name) => {
    const { profiles } = get();
    const updated = { ...profiles };
    delete updated[name];

    const fallback = Object.keys(updated)[0] || "Default";

    set({ profiles: updated, activeProfile: fallback });

    localStorage.setItem("profiles", JSON.stringify(updated));
    localStorage.setItem("activeProfile", fallback);
  },

  addBiasPoint: (symbol, point) =>
    set((state) => {
      const prev = state.biasTimeline[symbol] ?? [];
      const next = [...prev, point].slice(-100);

      const intensity = point.confidence / 100;
      const color =
        point.bias > 0
          ? theme.colors.green
          : point.bias < 0
          ? theme.colors.red
          : theme.colors.amber;

      get().triggerPulse("timeline", intensity, color);

      // 🧠 Verdict Flip Detection
      const prevAlignment = state.lastBiasAlignment[symbol];
      const newAlignment =
        point.bias > 0.2 ? "bullish" :
        point.bias < -0.2 ? "bearish" :
        "neutral";

      if (prevAlignment && prevAlignment !== newAlignment) {
        const momentumState =
          point.confidence > 66 ? "rising" :
          point.confidence < 33 ? "fading" :
          "unclear";

        // Optional: derive volatilityLevel from state.volatility[symbol] or use placeholder
        const volatilityLevel = "moderate";

        pushNarrative(
          "verdictFlip",
          symbol,
          newAlignment,
          momentumState,
          volatilityLevel,
          point.confidence,
          {
            trigger: "signalChange",
            previousBias: prevAlignment,
            source: "addBiasPoint",
          }
        );
      }

      return {
        biasTimeline: {
          ...state.biasTimeline,
          [symbol]: next,
        },
        lastBiasAlignment: {
          ...state.lastBiasAlignment,
          [symbol]: newAlignment,
        },
      };
    }),
}))
);