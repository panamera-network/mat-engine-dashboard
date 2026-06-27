// Uses relative paths through the vite proxy (/api, /core → localhost:8000 —
// see vite.config.ts), consistent with the rest of this repo's fetch calls.

/**
 * POSTs to /core/output with a symbol filter — mat-strategy-engine only
 * processes the given symbols, which is dramatically faster than the full
 * 36-symbol feed for a small selection (see CLAUDE.md in the engine repo).
 * Passing an empty array falls back to the engine's default of all symbols.
 */
export async function fetchOutput(symbols: string[]): Promise<Record<string, any>> {
  const res = await fetch("/core/output", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** The curated symbol list the engine actually processes (mt5/constants.py SYMBOLS). */
export async function fetchAvailableSymbols(): Promise<string[]> {
  const res = await fetch("/core/symbols");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.symbols ?? [];
}
