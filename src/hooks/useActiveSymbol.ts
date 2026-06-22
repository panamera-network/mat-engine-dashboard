import { useStore } from "../components/system/store";
import { activeDataKey, feedLookupKey } from "../lib/symbolUtils";

/** Unified symbol resolution for charts, meters, and feed lookups */
export function useActiveSymbol() {
  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const resolvedSymbol = useStore((s) => s.resolvedSymbol);
  const isResolvingSymbol = useStore((s) => s.isResolvingSymbol);
  const feed = useStore((s) => s.feed);

  const feedKey = feedLookupKey(selectedSymbol, feed);
  const dataKey = activeDataKey(selectedSymbol, resolvedSymbol, feed);

  return {
    selectedSymbol,
    resolvedSymbol,
    feedKey,
    dataKey,
    chartSymbol: resolvedSymbol || feedKey || selectedSymbol,
    isResolvingSymbol,
    isReady: Boolean(resolvedSymbol || feedKey),
  };
}
