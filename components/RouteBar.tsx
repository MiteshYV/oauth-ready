import { fmtHours, fmtWait } from "@/lib/format";
import type { Range } from "@/lib/types";

// Solid = your hands-on time, dashed = waiting on the provider. Log scale, so
// "20 minutes" and "6 weeks" fit on one line and the difference is still obvious.
export interface Leg { label: string; hours: Range; wait: Range; waitUnknown?: boolean }

const w = (hours: number) => (hours <= 0 ? 0 : Math.max(0.35, Math.log10(hours * 60 + 1)));
export const legWeight = (l: Leg) => Math.max(w(l.hours[1]), 0.35) + (l.waitUnknown ? 3.2 : w(l.wait[1] * 24));
export const routeWeight = (legs: Leg[]) => legs.reduce((s, l) => s + legWeight(l), 0);

export function RouteBar({ legs, big = false, labels = false, max }: { legs: Leg[]; big?: boolean; labels?: boolean; max?: number }) {
  const own = routeWeight(legs) || 1;
  const total = max && max >= own ? max : own;
  const pct = (x: number) => `${(x / own) * 100}%`;
  const summary = legs.map((l) => `${l.label}: ${fmtHours(l.hours)} hands-on, wait ${fmtWait(l.wait, l.waitUnknown)}`).join(". ");
  return (
    <div role="img" aria-label={summary}>
      <div className={`route ${big ? "route-big" : ""}`} style={{ width: `${(own / total) * 100}%` }}>
        <span className="route-stop" />
        {legs.map((l, i) => {
          const work = Math.max(w(l.hours[1]), 0.35);
          const wait = l.waitUnknown ? 3.2 : w(l.wait[1] * 24);
          return (
            <span key={i} style={{ display: "contents" }}>
              <span className={`route-seg route-work ${l.hours[1] <= 0 ? "route-done" : ""}`} style={{ width: pct(work) }} />
              {wait > 0 && <span className={`route-seg ${l.waitUnknown ? "route-unknown" : "route-wait"}`} style={{ width: pct(wait) }} />}
              <span className={`route-stop ${i === legs.length - 1 ? "end" : ""}`} />
            </span>
          );
        })}
      </div>
      {labels && (
        <div className="route-labels">
          {legs.map((l, i) => (
            <div key={i} style={{ width: pct(legWeight(l)), minWidth: "34%" }}>
              <b>{l.label}</b>
              <div style={{ color: "var(--muted)" }}>
                {fmtHours(l.hours)} hands-on
                <br />
                {fmtWait(l.wait, l.waitUnknown) === "None" ? "No waiting" : `Wait: ${fmtWait(l.wait, l.waitUnknown)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RouteKey() {
  return (
    <div className="route-key">
      <span><span className="key-swatch" style={{ borderTop: "6px solid var(--ink)", borderRadius: 3 }} />Your hands-on time</span>
      <span><span className="key-swatch" style={{ borderTop: "3px dashed var(--provider)" }} />Waiting on the provider</span>
      <span><span className="key-swatch" style={{ borderTop: "3px dotted var(--line-strong)" }} />Wait unknown</span>
      <span>Log scale: minutes and weeks on one line</span>
    </div>
  );
}
