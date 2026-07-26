// ui/chart.js
// A single-purpose line chart built with raw SVG. We deliberately avoided
// pulling in a charting library since the dashboard needs exactly one chart
// (net worth trend) and a full library would be a lot of dependency weight
// for one line.

/**
 * Renders a line chart into the given container element.
 * points: array of { date: 'YYYY-MM-DD', value: number }
 */
function renderLineChart(container, points, { width = 600, height = 180 } = {}) {
  container.innerHTML = '';

  if (points.length < 2) {
    const empty = document.createElement('p');
    empty.className = 'chart-empty';
    empty.textContent = 'Add a few more transactions to see your net worth trend.';
    container.appendChild(empty);
    return;
  }

  const padding = { top: 16, right: 16, bottom: 24, left: 16 };
  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const xStep = (width - padding.left - padding.right) / (points.length - 1);
  const yFor = (v) => {
    const usable = height - padding.top - padding.bottom;
    return padding.top + usable - ((v - min) / range) * usable;
  };

  const coords = points.map((p, i) => [padding.left + i * xStep, yFor(p.value)]);
  const pathD = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  const zeroY = yFor(0);
  const isPositiveTrend = points[points.length - 1].value >= points[0].value;
  const lineColor = isPositiveTrend ? 'var(--color-good)' : 'var(--color-watch)';

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="net-worth-chart">
      <line x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}"
            stroke="var(--color-hairline)" stroke-width="1" stroke-dasharray="2 3" />
      <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" />
      <circle cx="${coords[coords.length - 1][0]}" cy="${coords[coords.length - 1][1]}" r="3.5" fill="${lineColor}" />
    </svg>
  `;

  container.innerHTML = svg;
}

/**
 * Renders a simple donut chart showing percentage breakdown.
 * segments: array of { label, value, color } (color as a CSS color string).
 * Renders a legend below the donut with each segment's percentage.
 */
function renderDonutChart(container, segments, { size = 160 } = {}) {
  container.innerHTML = '';
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) {
    const empty = document.createElement('p');
    empty.className = 'chart-empty';
    empty.textContent = 'Not enough data yet this month.';
    container.appendChild(empty);
    return;
  }

  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let offsetSoFar = 0;

  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const fraction = s.value / total;
      const dash = fraction * circumference;
      const circle = `
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none"
                stroke="${s.color}" stroke-width="16"
                stroke-dasharray="${dash.toFixed(1)} ${(circumference - dash).toFixed(1)}"
                stroke-dashoffset="${(-offsetSoFar).toFixed(1)}"
                transform="rotate(-90 ${center} ${center})" />
      `;
      offsetSoFar += dash;
      return circle;
    })
    .join('');

  const legend = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const pct = Math.round((s.value / total) * 100);
      return `
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--color-ink-soft);">
          <span style="width:8px;height:8px;border-radius:50%;background:${s.color};display:inline-block;"></span>
          ${s.label} <strong style="color:var(--color-ink);">${pct}%</strong>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${arcs}</svg>
      <div style="display:flex;flex-direction:column;gap:6px;">${legend}</div>
    </div>
  `;
}

export { renderLineChart, renderDonutChart };
