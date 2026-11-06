export function chartNumber(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function seriesPath(points, field, x, y, steppedZero = false) {
  let previous = null;
  return points.map((point) => {
    const value = chartNumber(point[field]);
    if (value == null) { previous = null; return ''; }
    const px = x(point).toFixed(1); const py = y(value).toFixed(1);
    // A missing sample or a long telemetry gap must not look like an outage.
    const connected = previous && point.time - previous.time <= 10 * 60_000;
    const command = !connected ? `M ${px} ${py}`
      : steppedZero && (value === 0 || previous.value === 0) ? `H ${px} V ${py}`
      : `L ${px} ${py}`;
    previous = { time: point.time, value };
    return command;
  }).filter(Boolean).join(' ');
}
