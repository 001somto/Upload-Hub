// components/ui/TrendChart.jsx
// WHAT THIS FILE IS: a simple line chart of storage used over time.
// WHAT IT DOES: draws the points the backend sends as a line with a soft fill, with the
// highest and lowest values and the first and last dates labelled. It is drawn with SVG, so
// it needs no chart library. It never makes up points: with fewer than 2 it says there is
// not enough data yet. `data` is [{ date, usedBytes }].

import { formatBytes, formatDate } from "../../lib/format";

const WIDTH = 600;
const HEIGHT = 200;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

export default function TrendChart({ data }) {
  if (!Array.isArray(data) || data.length < 2) {
    return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Not enough data yet to draw a trend.</p>;
  }

  const values = data.map((point) => Number(point.usedBytes) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const points = values.map((value, index) => {
    const x = PAD.left + (index / (values.length - 1)) * innerW;
    const y = PAD.top + innerH - ((value - min) / range) * innerH;
    return [x, y];
  });
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${HEIGHT - PAD.bottom} L${points[0][0].toFixed(1)} ${HEIGHT - PAD.bottom} Z`;
  const last = points[points.length - 1];

  const summary = `Storage used from ${formatDate(data[0].date)} to ${formatDate(data[data.length - 1].date)}: from ${formatBytes(values[0])} to ${formatBytes(
    values[values.length - 1]
  )}. Lowest ${formatBytes(min)}, highest ${formatBytes(max)}.`;

  return (
    <figure>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={summary} preserveAspectRatio="none">
        {[0, 0.5, 1].map((fraction) => {
          const y = PAD.top + innerH * fraction;
          return <line key={fraction} x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#dce8de" strokeWidth="1" strokeDasharray="3 4" />;
        })}
        <path d={area} fill="#c8e6c9" opacity="0.55" />
        <path d={line} fill="none" stroke="#388e3c" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="4.5" fill="#388e3c" stroke="#fff" strokeWidth="2" />
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted">
        <span>{formatDate(data[0].date)}</span>
        <span>
          Low {formatBytes(min)}, high {formatBytes(max)}
        </span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}
