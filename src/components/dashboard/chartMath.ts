// Geometry of the report charts (24/11): donut arcs and the trend line. Pure,
// no imports, so node:test can load it directly.

/** Up to this many points the trend reads as columns, past it as a line */
export const COLUMN_LIMIT = 14;

export const trendAsLine = (pointCount: number, limit = COLUMN_LIMIT) =>
  pointCount > limit;

interface Part {
  key: string;
  label: string;
  value: number;
  display: string;
}

/**
 * Parts past `max` fold into one "Khác" part, so a donut never needs more
 * colours than the validated slots. Parts keep the caller's (fixed) order.
 */
export const foldParts = <T extends Part>(
  parts: T[],
  max: number,
  format: (value: number) => string
): (T | Part)[] => {
  if (parts.length <= max) return parts;
  const kept = parts.slice(0, max - 1);
  const rest = parts.slice(max - 1);
  const value = rest.reduce((sum, part) => sum + Math.max(0, part.value), 0);
  return [
    ...kept,
    { key: 'other', label: 'Khác', value, display: format(value) },
  ];
};

export interface Arc {
  key: string;
  /** Visible length along the ring */
  length: number;
  /** Where the arc starts, as a distance along the ring */
  start: number;
  share: number;
}

/**
 * Arcs of a donut whose ring is `circumference` long. Touching arcs are split
 * by a `gap` in the surface colour; a lone non-zero part is a full ring.
 */
export const donutArcs = (
  parts: { key: string; value: number }[],
  circumference: number,
  gap: number
): Arc[] => {
  const values = parts.map(part => Math.max(0, part.value || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];
  const shown = values.filter(value => value > 0).length;
  let start = 0;
  return parts.flatMap((part, index) => {
    const value = values[index];
    if (value <= 0) return [];
    const full = (value / total) * circumference;
    const arc = {
      key: part.key,
      length: shown > 1 ? Math.max(full - gap, 0.5) : full,
      start,
      share: value / total,
    };
    start += full;
    return [arc];
  });
};

/**
 * Items in a fixed order of keys (unknown keys after, in their own order), so
 * a part keeps its colour whatever its rank in the period
 */
export const orderedBy = <T>(
  items: T[],
  keyOf: (item: T) => string,
  order: readonly string[]
): T[] => {
  const rank = (item: T) => {
    const at = order.indexOf(keyOf(item));
    return at === -1 ? order.length : at;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
    .map(({ item }) => item);
};

/**
 * Axis label of point `index`: every `every`-th point and the last one; a
 * regular label too close to the last is dropped so the two never touch
 */
export const showTick = (index: number, length: number, every: number) => {
  const last = length - 1;
  if (index === last) return true;
  return index % every === 0 && last - index >= Math.ceil(every / 2);
};

/** Periods up to today: the future of the range is not data yet */
export const upToToday = <T extends { period: string }>(
  series: T[],
  today: string
): T[] =>
  series.filter(point => point.period <= today.slice(0, point.period.length));

/** Share as a percentage with at most one decimal, e.g. 33,3% */
export const shareText = (share: number) =>
  `${(Math.round(share * 1000) / 10).toLocaleString('vi-VN')}%`;

/**
 * The trend line and its area in a `width` × `height` box: each point sits at
 * the middle of its slot, values scale against `top`
 */
export const trendPaths = (
  values: number[],
  top: number,
  width: number,
  height: number
) => {
  if (!values.length || top <= 0) return { line: '', area: '' };
  const x = (index: number) => ((index + 0.5) / values.length) * width;
  const y = (value: number) =>
    height - (Math.max(0, Math.min(value, top)) / top) * height;
  const round = (n: number) => Math.round(n * 100) / 100;
  const points = values.map(
    (value, index) => `${round(x(index))},${round(y(value))}`
  );
  const line = `M${points.join(' L')}`;
  const area = `M${round(x(0))},${height} L${points.join(' L')} L${round(
    x(values.length - 1)
  )},${height} Z`;
  return { line, area };
};
