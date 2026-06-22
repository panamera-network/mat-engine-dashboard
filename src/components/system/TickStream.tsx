import { useEffect } from "react";
import { useStore } from "./store";
import { resolveBrokerSymbol } from "../../lib/symbolUtils";
import { createReconnectWS } from "../chart/reconnectWS";

/** Single tick WebSocket + symbol resolve pipeline (mount once in Dashboard) */
export function TickStream() {
  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const addTick = useStore((s) => s.addTick);
  const setResolvedSymbol = useStore.getState().setResolvedSymbol;
  const setIsResolvingSymbol = useStore.getState().setIsResolvingSymbol;
  const setWsTickStatus = useStore.getState().setWsTickStatus;

  // Resolve broker symbol when selection changes
  useEffect(() => {
    if (!selectedSymbol) {
      setResolvedSymbol("");
      return;
    }

    let cancelled = false;
    setIsResolvingSymbol(true);

    resolveBrokerSymbol(selectedSymbol).then((resolved) => {
      if (!cancelled) {
        setResolvedSymbol(resolved);
        setIsResolvingSymbol(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol]);

  const resolvedSymbol = useStore((s) => s.resolvedSymbol);

  // Single tick WebSocket for the resolved symbol
  useEffect(() => {
    if (!resolvedSymbol) return;

    setWsTickStatus("reconnecting");

    const wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws/ticks?symbol=${encodeURIComponent(resolvedSymbol)}`;

    const cleanup = createReconnectWS(
      wsUrl,
      (event) => {
        try {
          const raw = JSON.parse(event.data);
          let price = Number(raw.price);
          if (!Number.isFinite(price) || price <= 0) price = Number(raw.last);
          if (!Number.isFinite(price) || price <= 0) price = Number(raw.bid);
          if (!Number.isFinite(price) || price <= 0) price = Number(raw.ask);

          const tick = {
            symbol: raw.symbol ?? resolvedSymbol,
            price,
            time: Number(raw.time ?? raw.timestamp ?? 0),
          };
          if (Number.isFinite(tick.time) && Number.isFinite(tick.price)) {
            addTick(tick);
          }
        } catch (e) {
          console.warn("Bad WS tick payload", e);
        }
      },
      (connected) => {
        setWsTickStatus(connected ? "connected" : "reconnecting");
      }
    );

    return cleanup;
  }, [resolvedSymbol, addTick]);

  return null;
}
