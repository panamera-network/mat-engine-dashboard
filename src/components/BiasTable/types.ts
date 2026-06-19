// types.ts

export interface BiasTF {
  label: string;
  score: number;
  strength_pct: number;
}

export interface BiasMap {
  [tf: string]: BiasTF;
}

export interface AlignmentSignal {
  decision?: string;
  confidence_pct?: number; // <-- add this
  summary?: string;
  breakdown?: Record<string, string | number>;
}

export interface Diagnostic {
  stage: string;
  action: string;
  reasons: string[];
  summary: string;
  alignment?: string; // e.g. "M1:uptrend M5:neutral ..."
}

export interface ModeData {
  alignment_signal: AlignmentSignal;
  diagnostic: Diagnostic;
}

export interface StyleSnapshotTF {
  momentum?: number;
  momentum_pct?: number;
  duration?: string;
}

export interface StyleSnapshot {
  [tf: string]: StyleSnapshotTF;
}

export interface SymbolData {
  symbol: string;
  bias: BiasMap;
  scalping: ModeData;
  swing: ModeData;
  style_snapshot: StyleSnapshot;
}

export interface PanelCellProps {
  modeData: any;
  styleSnapshotTF: StyleSnapshotTF | undefined;
  widths: {
    signal: string;
    sar: string;
    momentum: string;
    duration: string;
  };
}