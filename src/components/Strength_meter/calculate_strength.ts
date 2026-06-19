import type { Mode, Strength } from './csm_types';

export function calculateCurrencyStrengthFromFeed(
  feed: Record<string, any>,
  mode: Mode
): Strength[] {
  const tfSets: Record<Mode, string[]> = {
    scalping: ['M1', 'M5', 'M15', 'M30'],
    swing: ['H1', 'H4', 'D1'],
    blend: ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1']
  };

  // Map mode to the section in the feed
  const sectionMap: Record<Mode, string> = {
    scalping: 'scalping',
    swing: 'swing',
    blend: 'bias'
  };

  const timeframes = tfSets[mode];
  const section = sectionMap[mode];
  const totals: Record<string, { sum: number; count: number }> = {};

  for (const symbolKey in feed) {
    const base = symbolKey.slice(0, 3);
    const tfData = feed[symbolKey]?.[section] || {};

    let scoreSum = 0;
    let count = 0;

    for (const tf of timeframes) {
      const tfObj = tfData[tf];
      if (tfObj) {
        // For scalping/swing sections, bias & momentum are separate fields
        // For bias section, use score & strength
        const biasVal =
          mode === 'blend'
            ? Number(tfObj.score) || 0
            : Number(tfObj.bias) || 0;
        const momentumVal =
          mode === 'blend'
            ? Number(tfObj.strength) || 0
            : Number(tfObj.momentum) || 0;

        scoreSum += biasVal + momentumVal;
        count++;
      }
    }

    if (count > 0) {
      if (!totals[base]) totals[base] = { sum: 0, count: 0 };
      totals[base].sum += scoreSum;
      totals[base].count += count;
    }
  }

  return Object.entries(totals).map(([currency, { sum, count }]) => ({
    currency,
    value: Math.round((sum / count) * 10)
  }));
}
