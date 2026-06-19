// useSystemStatus.ts
import { useQuery } from "@tanstack/react-query";

export interface LLMStatus {
  model: string | null;
  loaded: boolean;
  response_time: number | null;
}

export interface MT5Status {
  initialized: boolean;
  account: Record<string, any> | null;
  terminal: Record<string, any> | null;
  symbols_count: number;
  symbols_available: boolean;
}

export interface SystemStatus {
  cpu: number;
  ram: number;
  gpu: number | null;
  llm: LLMStatus;
  backend: string;
  strategy: string;
  mt5: MT5Status | null;
}

const fetchSystemStatus = async (): Promise<SystemStatus> => {
  const res = await fetch("/api/system-status");
  if (!res.ok) throw new Error("Failed to fetch system status");
  const data = await res.json();

  const services = data.services ?? {};

  return {
    cpu: data.cpu ?? 0,
    ram: data.ram ?? 0,
    gpu: data.gpu?.load ?? null,
    llm: data.llm ?? { model: null, loaded: false, response_time: null },
    backend: services.backend ?? "unknown",
    strategy: services.strategy ?? "unknown",
    mt5: data.mt5 ?? null,
  };
};

export function useSystemStatus() {
  return useQuery<SystemStatus>({
    queryKey: ["systemStatus"],
    queryFn: fetchSystemStatus,
    refetchInterval: 5000, // ✅ auto-refresh every 5s
    staleTime: 3000,       // cache for 3s
    retry: 2,              // retry on failure
  });
}
