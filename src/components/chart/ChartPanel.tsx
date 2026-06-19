import { useEffect, useState } from "react";
import LiveChart from "./LiveChart";
import ErrorBoundary from "./ErrorBoundary";
import { createReconnectWS } from "./reconnectWS";
import { useStore } from "../system/store";
import { theme } from "../../theme";
import Toolbar from "./Toolbar";

const ChartPanel = () => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const addTick = useStore((s) => s.addTick);

  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const selectedTimeframe = useStore((s) => s.selectedTimeframe);

  const [resolvedSymbol, setResolvedSymbol] = useState<string>("");
  const [fade, setFade] = useState<"in" | "out">("in");

  const setWsTickStatus = useStore.getState().setWsTickStatus;
  const wsTickStatus = useStore((s) => s.wsTickStatus);


  const ticks = useStore((s) =>
    resolvedSymbol ? s.ticks[resolvedSymbol] : undefined
  );

  // Fetch symbols
  useEffect(() => {
    fetch("http://localhost:8000/api/mt5/symbols")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.symbols) && data.symbols.length) {
          setSymbols(data.symbols);
        }
      })
      .catch((err) => console.error("⚠️ Symbol list fetch error", err));
  }, []);

  // Resolve base symbol
  useEffect(() => {
    if (!selectedSymbol) return;
    setFade("out");
    const timer = setTimeout(() => {
      fetch(`http://localhost:8000/api/mt5/resolve?base=${selectedSymbol}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "ok" && data.resolved) {
            setResolvedSymbol(data.resolved);
          } else {
            setResolvedSymbol(selectedSymbol);
          }
        })
        .catch(() => setResolvedSymbol(selectedSymbol))
        .finally(() => setFade("in"));
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedSymbol]);

  // WebSocket subscription
  useEffect(() => {
    if (!resolvedSymbol) return;

    setWsTickStatus("reconnecting");

    const cleanup = createReconnectWS(
      `ws://localhost:8000/api/ws/ticks?symbol=${resolvedSymbol}`,
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
          if (Number.isFinite(tick.time)) addTick(tick);
        } catch (e) {
          console.warn("Bad WS payload", e);
        }
      },
      () => {}
    );
    return cleanup;
  }, [resolvedSymbol]);

  return (
    <div
      style={{
        background: theme.colors.panel,
        border: `1px solid ${theme.colors.grid}`,
        borderRadius: theme.radius.sm,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* ✅ Store-driven Toolbar */}
      
      <Toolbar symbols={symbols} wsStatus={wsTickStatus} />


      {/* Chart body */}
      <div
        style={{
          flex: 1,
          transition: "opacity 0.3s ease",
          opacity: fade === "in" ? 1 : 0,
        }}
      >
        <ErrorBoundary>
          <LiveChart
            baseSymbol={resolvedSymbol}
            timeframe={selectedTimeframe}
            ticks={ticks ?? []}
            onStatsUpdate={() => {}}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ChartPanel;
