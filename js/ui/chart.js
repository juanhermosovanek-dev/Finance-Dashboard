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

export { renderLineChart };
