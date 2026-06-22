/** Strip broker suffixes (_i, .r, -pro, etc.) for display / matching */
export function stripBrokerSuffix(symbol: string): string {
  return symbol.toUpperCase().replace(/[_\.\-].*$/, "");
}

/** Find the feed key that matches a user-selected symbol */
export function feedLookupKey(
  symbol: string,
  feed: Record<string, unknown>
): string {
  if (!symbol) return symbol;
  if (feed[symbol]) return symbol;

  const base = stripBrokerSuffix(symbol);
  const match = Object.keys(feed).find(
    (k) => stripBrokerSuffix(k) === base
  );
  return match ?? symbol;
}

/** Resolve a base symbol to the broker-specific symbol via MT5 API */
export async function resolveBrokerSymbol(symbol: string): Promise<string> {
  if (!symbol) return "";
  try {
    const res = await fetch(
      `/api/mt5/resolve?base=${encodeURIComponent(symbol)}`
    );
    const data = await res.json();
    if (data.status === "ok" && data.resolved) return data.resolved;
  } catch {
    // fall through
  }
  return symbol;
}

/** Best key for chart/tick/indicator store lookups */
export function activeDataKey(
  selectedSymbol: string,
  resolvedSymbol: string,
  feed: Record<string, unknown> = {}
): string {
  if (resolvedSymbol) return resolvedSymbol;
  return feedLookupKey(selectedSymbol, feed);
}
