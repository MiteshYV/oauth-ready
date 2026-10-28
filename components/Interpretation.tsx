import type { Interpretation as I } from "@/lib/types";

// Says which product an ambiguous name was taken to mean. Plain links: /generate starts a run on page load.
export function Interpretation({ i }: { i?: I }) {
  if (!i) return null;
  return (
    <p className="fine">
      Covers {i.covers}.
      {i.alternatives?.length ? <> Also: {i.alternatives.map((a, n) => <span key={`${n}-${a}`}>{n ? ", " : ""}<a href={`/generate?q=${encodeURIComponent(a)}`}>{a}</a></span>)}.</> : null}
    </p>
  );
}
