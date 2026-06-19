export function transformCorrelationGraph(data: Record<string, any>, focusSymbol = "XAUUSD_i") {
  const tfOrder = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"];

  function extractBiasVector(symbolData: { bias: { [x: string]: { score: any; }; }; }) {
    const vec = tfOrder.map((tf) => {
      const score = symbolData?.bias?.[tf]?.score;
      return typeof score === "number" && isFinite(score) ? score : 0;
    });
    return normalize(vec);
  }

  function normalize(vec: any[]) {
    const max = Math.max(...vec.map((v) => Math.abs(v)));
    return max ? vec.map((v) => v / max) : vec;
  }

  function pearson(a: any[], b: any[]) {
    const n = a.length;
    const avgA = a.reduce((sum, x) => sum + x, 0) / n;
    const avgB = b.reduce((sum, x) => sum + x, 0) / n;
    const cov = a.reduce((sum, x, i) => sum + (x - avgA) * (b[i] - avgB), 0);
    const stdA = Math.sqrt(a.reduce((sum, x) => sum + (x - avgA) ** 2, 0));
    const stdB = Math.sqrt(b.reduce((sum, x) => sum + (x - avgB) ** 2, 0));
    return stdA && stdB ? cov / (stdA * stdB) : 0;
  }

  function classify(id: string | string[]) {
    if (id.includes("USD") || id.includes("CAD") || id.includes("JPY")) return "FX";
    if (id.includes("BTC") || id.includes("ETH") || id.includes("SOL")) return "Crypto";
    if (id.includes("XAU") || id.includes("XAG") || id.includes("WTI")) return "Commodity";
    if (id.includes("SP") || id.includes("DAX") || id.includes("NASDAQ")) return "Index";
    if (id.includes("10Y") || id.includes("BUND") || id.includes("JGB")) return "Bond";
    return "Other";
  }

  const symbols = Object.keys(data);
  const links = [];
  const nodesSet = new Set([focusSymbol]);

  for (let i = 0; i < symbols.length; i++) {
    const a = symbols[i];
    if (a === focusSymbol) continue;

    const vecA = extractBiasVector(data[a]);
    const vecFocus = extractBiasVector(data[focusSymbol]);
    const corr = pearson(vecA, vecFocus);

    if (Math.abs(corr) > 0.5) {
      links.push({ source: focusSymbol, target: a, value: corr });
      nodesSet.add(a);
    }
  }

  const nodes = Array.from(nodesSet).map((id) => ({
    id,
    label: id,
    group: classify(id),
  }));

  return { nodes, links };
}
