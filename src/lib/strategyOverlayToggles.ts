// Local Dashboard UI state only — which of the 6 engine overlay layers are
// currently shown on the chart. No Strategy Engine contract involved; this
// mirrors the old chart's SNR/SND/OB/FVG/BOS/CHOCH toggle buttons
// (LiveChart.tsx's `overlays` state), just moved to its own tiny store so
// strategyOverlayPlugin.ts (which lives outside React) can subscribe to it
// the same way it already subscribes to useStore's `feed`.
import { create } from "zustand";

export interface StrategyOverlayToggles {
  snr: boolean;
  snd: boolean;
  ob: boolean;
  fvg: boolean;
  bos: boolean;
  choch: boolean;
}

export const DEFAULT_STRATEGY_OVERLAY_TOGGLES: StrategyOverlayToggles = {
  snr: true,
  snd: true,
  ob: true,
  fvg: true,
  bos: true,
  choch: true,
};

interface StrategyOverlayToggleStore {
  toggles: StrategyOverlayToggles;
  toggle: (key: keyof StrategyOverlayToggles) => void;
}

export const useStrategyOverlayToggles = create<StrategyOverlayToggleStore>((set) => ({
  toggles: DEFAULT_STRATEGY_OVERLAY_TOGGLES,
  toggle: (key) =>
    set((state) => ({ toggles: { ...state.toggles, [key]: !state.toggles[key] } })),
}));
