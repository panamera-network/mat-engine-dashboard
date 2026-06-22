// LiveSignalFeed.tsx
import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { feedLookupKey } from "../../lib/symbolUtils";

export function LiveSignalFeed() {
  const setFeed = useStore((s) => s.setFeed);
  const addBiasPoint = useStore((s) => s.addBiasPoint);
  const wsRef = useRef<WebSocket | null>(null);
  const setWsBiasStatus = useStore.getState().setWsBiasStatus;

  // Bias WebSocket — connect once, do not reconnect on symbol change
  useEffect(() => {
    const wsBase = import.meta.env.VITE_WS_URL;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      setWsBiasStatus("reconnecting");

      const ws = new WebSocket(`${wsBase}/core/output/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[LiveSignalFeed] Connected to WS");
        setWsBiasStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const feed = JSON.parse(event.data);
          setFeed(feed);

          const { selectedSymbol, mode } = useStore.getState();
          const symbol = feedLookupKey(selectedSymbol, feed);

          const sectionMap: Record<"scalping" | "swing" | "blend", string> = {
            scalping: "scalping",
            swing: "swing",
            blend: "bias",
          };
          const section = sectionMap[mode];
          const tfData = feed[symbol]?.[section] || {};

          const tfs =
            mode === "scalping"
              ? ["M1", "M5", "M15", "M30"]
              : mode === "swing"
              ? ["H1", "H4", "D1"]
              : ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

          let biasVal = 0;
          let confVal = 0;
          let count = 0;

          for (const tf of tfs) {
            const tfObj = tfData[tf];
            if (tfObj) {
              biasVal += Number(tfObj.bias) || 0;
              confVal += Number(tfObj.momentum) || 0;
              count++;
            }
          }

          if (count > 0) {
            const avgBias = biasVal / count;
            const avgConf = confVal / count;
            const escalations = feed[symbol]?.escalations || [];

            addBiasPoint(symbol, {
              ts: Date.now(),
              bias: Math.max(-1, Math.min(1, avgBias / 100)),
              confidence: Math.min(100, Math.max(0, avgConf)),
              mode: mode === "scalping" ? "scalp" : "swing",
              escalations,
            });
          }
        } catch (err) {
          console.error("[LiveSignalFeed] Failed to parse feed:", err);
        }
      };

      ws.onclose = () => {
        console.warn("[LiveSignalFeed] Connection closed, retrying in 5s...");
        setWsBiasStatus("disconnected");
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error("[LiveSignalFeed] WebSocket error:", err);
        setWsBiasStatus("disconnected");
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [setFeed, addBiasPoint]);

  return null;
}
