import type { LockedCurrencyStrengthData, MutableCurrencyStrengthData } from './csm_types';

function assertLength<L extends string, N extends number>(
  labels: readonly L[],
  data: readonly number[]
): asserts labels is readonly L[] & { length: N } {
  if (labels.length !== data.length) {
    throw new Error(`Length mismatch: ${labels.length} labels vs ${data.length} data points`);
  }
}

export function buildCurrencyStrengthData<
  L extends string,
  const N extends number
>(strengths: readonly { currency: L; value: number }[]): LockedCurrencyStrengthData<L, N> {
  const filtered = strengths.filter(s => s.currency !== "BTC" && s.currency !== "ETH"&& s.currency !== "XPT" && s.currency !== "XPD");
  
  const labels = filtered.map(s => s.currency) as readonly L[];
  const values = filtered.map(s => s.value) as readonly number[];
  const colors = values.map(v => (v >= 0 ? '#69f0ae' : '#ff5252')) as readonly string[];

  assertLength<L, N>(labels, values);

  return {
    labels: labels as LockedCurrencyStrengthData<L, N>['labels'],
    datasets: [
      {
        data: values as LockedCurrencyStrengthData<L, N>['datasets'][0]['data'],
        backgroundColor: colors as LockedCurrencyStrengthData<L, N>['datasets'][0]['backgroundColor'],
        borderRadius: 4,
        borderSkipped: false
      }
    ]
  };
}

export function toMutableChartData(
  locked: LockedCurrencyStrengthData<string, number>
): MutableCurrencyStrengthData {
  return {
    labels: [...locked.labels],
    datasets: [
      {
        ...locked.datasets[0],
        data: [...locked.datasets[0].data],
        backgroundColor: [...locked.datasets[0].backgroundColor]
      }
    ]
  };
}
