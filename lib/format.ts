import type { Range } from "./types";

const r1 = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 2) / 2);

// Hands-on effort, from a range of hours. Working days are 8 hours.
export function fmtHours([a, b]: Range): string {
  if (b <= 0) return "Nothing left";
  if (b < 1) return `${Math.max(5, Math.round((a * 60) / 5) * 5)}–${Math.round((b * 60) / 5) * 5} min`;
  if (b <= 16) return a === b ? `${r1(a)} h` : `${r1(a)}–${r1(b)} h`;
  const da = r1(a / 8), db = r1(b / 8);
  return `${da === db ? da : `${Math.max(0.5, da)}–${db}`} working days`;
}

// Calendar waiting, from a range of days. null = unknown.
export function fmtWait(range: Range | null, unknown = false): string {
  if (unknown && !range) return "Unknown";
  if (!range || range[1] <= 0) return unknown ? "Unknown" : "None";
  const [a, b] = range;
  let out: string;
  if (b < 1) out = "Under a day";
  else if (b <= 13) out = a === b ? `${Math.round(a)} days` : `${Math.round(a)}–${Math.round(b)} days`;
  else {
    const wa = Math.max(Math.round(a / 7), a > 0 ? 1 : 0), wb = Math.round(b / 7);
    out = wa === wb ? `${wb} weeks` : `${wa}–${wb} weeks`;
  }
  return unknown ? `${out}, plus an unknown wait` : out;
}

export const daysBetween = (fromIso: string, to = new Date()) => (to.getTime() - new Date(fromIso).getTime()) / 86400000;
