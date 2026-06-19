import { Chart } from 'chart.js';
import type { Plugin, Tick } from 'chart.js';

const baselineLabelPlugin: Plugin<'bar'> = {
  id: 'baselineLabels',

  beforeInit(chart: Chart<'bar'>) {
    // Lock the Y-axis scale to [-100, 100]
    if (chart.options.scales?.y) {
      chart.options.scales.y.min = -100;
      chart.options.scales.y.max = 100;
    }
  },

  beforeDatasetsDraw(chart: Chart<'bar'>) {
    const { scales } = chart;
    const yScale = scales.y;
    const meta = chart.getDatasetMeta(0);

    meta.data.forEach((bar: any, index: number) => {
      const rawValue = chart.data.datasets[0].data[index] as number;
      const clampedValue = Math.max(-100, Math.min(100, rawValue));

      // Override the bar's pixel position to match the clamped value
      const startPixel = yScale.getPixelForValue(0);
      const endPixel = yScale.getPixelForValue(clampedValue);

      bar.y = endPixel;
      bar.base = startPixel;
    });
  },

  afterDatasetsDraw(chart: Chart<'bar'>) {
    const { ctx, scales, data } = chart;
    const xScale = scales.x;
    const yScale = scales.y;
    const dataset = data.datasets[0].data as number[];

    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const offset = 24;
    const maxAbsValue = Math.max(...dataset.map(v => Math.abs(v)), 1);

    xScale.ticks.forEach((tick: Tick, index: number) => {
      const symbol =
        typeof tick.label === 'string'
          ? tick.label
          : Array.isArray(tick.label)
          ? tick.label.join(' ')
          : '';

      const x = xScale.getPixelForTick(index);
      const value = dataset[index] ?? 0;

      // Color + glow based on real value
      let color = '#ffffffff';
      if (value > 0) color = '#a2e9c7ff';
      else if (value < 0) color = '#e78d8dff';

      ctx.fillStyle = color;
      const glowStrength = (Math.abs(value) / maxAbsValue) * 12;
      ctx.shadowColor = color;
      ctx.shadowBlur = glowStrength;

      // Clamp only for drawing position
      const clampedValue = Math.max(-100, Math.min(100, value));
      const barTipY = yScale.getPixelForValue(clampedValue);

      // Position label above or below bar tip
      const baseY = value >= 0 ? barTipY - offset : barTipY + offset;

      // Prepare display value (with + if clamped)
      const displayValue =
        Math.abs(value) > 100 ? `${clampedValue}+` : `${value}`;

      // Draw symbol on top
      ctx.fillText(symbol, x, baseY);

      // Draw value below symbol (adjust spacing)
      ctx.fillText(displayValue, x, baseY + (value >= 0 ? 14 : -14));
    });

    ctx.restore();
  }
};

export default baselineLabelPlugin;
