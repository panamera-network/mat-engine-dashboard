// LiveSignalFeed.tsx
import { useEffect, useRef } from "react";
import { useStore } from "./store";


export function LiveSignalFeed() {
  const setFeed = useStore((s) => s.setFeed);
  const addBiasPoint = useStore((s) => s.addBiasPoint);
  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const mode = useStore((s) => s.mode);
  const wsRef = useRef<WebSocket | null>(null);
  const setWsBiasStatus = useStore.getState().setWsBiasStatus;


  useEffect(() => {
    const wsBase = import.meta.env.VITE_WS_URL;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      setWsBiasStatus("reconnecting");

      const ws = new WebSocket(`${wsBase}/core/output/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[LiveSignalFeed] Connected to WS");
        setWsBiasStatus("connected"); // 🟢
      };

      ws.onmessage = (event) => {
        try {
          const feed = JSON.parse(event.data);
          setFeed(feed);

          // --- Derive BiasPoint for selected symbol ---
          const sectionMap: Record<"scalping" | "swing" | "blend", string> = {
            scalping: "scalping",
            swing: "swing",
            blend: "bias",
          };
          const section = sectionMap[mode];
          const tfData = feed[selectedSymbol]?.[section] || {};

          // Timeframes per mode
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

            const escalations = feed[selectedSymbol]?.escalations || [];

            addBiasPoint(selectedSymbol, {
              ts: Date.now(),
              bias: Math.max(-1, Math.min(1, avgBias / 100)), // normalize -1..+1
              confidence: Math.min(100, Math.max(0, avgConf)), // clamp 0–100
              mode: mode === "scalping" ? "scalp" : "swing",   // ✅ map global mode
              escalations,
            });
          }
        } catch (err) {
          console.error("[LiveSignalFeed] Failed to parse feed:", err);
        }
      };

      ws.onclose = () => {
        console.warn("[LiveSignalFeed] Connection closed, retrying in 5s...");
        setWsBiasStatus("disconnected"); // 🔴
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error("[LiveSignalFeed] WebSocket error:", err);
        setWsBiasStatus("disconnected"); // 🔴
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [setFeed, addBiasPoint, selectedSymbol, mode]);

  return null;
}
