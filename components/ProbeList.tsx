import type { Probe } from "@/lib/types";

// Requests the agent sent while writing a guide, so a reader can see what "Checked live" rests on.
export function ProbeList({ probes }: { probes?: Probe[] }) {
  if (!probes?.length) return null;
  return (
    <section className="section">
      <h2>Checked live</h2>
      <p className="lede">Requests the agent sent to the provider while writing this guide. No account or credentials were used.</p>
      <div className="list blocker-list">
        {probes.map((p) => (
          <div className="row" key={p.id}>
            <div>
              <div className="row-title"><code>{p.id}</code> GET {p.url}</div>
              <p className="row-detail">{p.status ? `HTTP ${p.status}` : "No response"}{p.finalUrl ? `, after redirecting to ${p.finalUrl}` : ""}.</p>
              {p.snippet && (
                <details className="row-detail">
                  <summary>Response text</summary>
                  <p>{p.snippet}</p>
                </details>
              )}
              <p className="ev-note">{new Date(p.at).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
