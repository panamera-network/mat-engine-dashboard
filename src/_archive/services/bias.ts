import axios from "axios";

export interface BiasData {
  // Define structure if known: timeframes, alignment, etc.
}

export const fetchHybridBias = async (): Promise<Record<string, BiasData>> => {
  const res = await axios.get('http://localhost:8000/core/output');
  return res.data;
};
