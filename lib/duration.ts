// Turns strings like "15-30 min", "2-6 weeks", "None" into an upper-bound number of hours.
const UNIT_HOURS: [RegExp, number][] = [
  [/min/, 1 / 60],
  [/hour|hr|\bh\b/, 1],
  [/business day|working day/, 24 * 1.4],
  [/day/, 24],
  [/week|wk/, 24 * 7],
  [/month/, 24 * 30],
  [/year/, 24 * 365],
];

export function upperHours(text: string | undefined): number {
  if (!text) return 0;
  const t = text.toLowerCase();
  if (/^(none|no wait|instant|immediate|0)/.test(t.trim())) return 0;
  const nums = [...t.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1]));
  if (!nums.length) return /unknown|varies|unpredictable/.test(t) ? NaN : 0;
  const unit = UNIT_HOURS.find(([re]) => re.test(t));
  return Math.max(...nums) * (unit ? unit[1] : 1);
}

// Width weight on a log scale, so minutes and months can share one line.
export function weight(hours: number): number {
  if (!Number.isFinite(hours)) return 3.2;
  if (hours <= 0) return 0;
  return Math.max(0.35, Math.log10(hours * 60 + 1));
}

// "15-30 min" -> [0.25, 0.5] hours. Uses the first unit mentioned.
export function rangeHours(text: string | undefined): [number, number] {
  if (!text) return [0, 0];
  const t = text.toLowerCase();
  const m = t.match(/(\d+(?:\.\d+)?)\s*(?:[-–to]+\s*(\d+(?:\.\d+)?))?\s*(min|hour|hr|h\b|day|week|month)/);
  if (!m) return [0, 0];
  const a = parseFloat(m[1]);
  const b = m[2] ? parseFloat(m[2]) : a;
  const unit = UNIT_HOURS.find(([re]) => re.test(m[3]));
  const f = unit ? unit[1] : 1;
  const work = /day|week|month/.test(m[3]) ? 8 / 24 : 1; // working time, not calendar time
  return [a * f * work, b * f * work];
}
