// utils/reconnectWS.ts
export function createReconnectWS(
  url: string,
  onMessage: (event: MessageEvent) => void,
  onStatus: (connected: boolean) => void,
  maxRetries = 10
) {
  let ws: WebSocket | null = null;
  let retries = 0;
  let timeout: NodeJS.Timeout;

  const connect = () => {
    ws = new WebSocket(url);

    ws.onopen = () => {
      retries = 0;
      onStatus(true);
      console.log("✅ WS connected:", url);
    };

    ws.onclose = () => {
      onStatus(false);
      console.log("❌ WS closed:", url);
      if (retries < maxRetries) {
        const delay = Math.min(1000 * 2 ** retries, 30000); // exponential backoff capped at 30s
        retries++;
        timeout = setTimeout(connect, delay);
      }
    };

    ws.onerror = (err) => {
      console.error("⚠️ WS error:", err);
      ws?.close();
    };

    ws.onmessage = onMessage;
  };

  connect();

  return () => {
    clearTimeout(timeout);
    ws?.close();
  };
}
