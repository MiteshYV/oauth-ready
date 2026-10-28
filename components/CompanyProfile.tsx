"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { assess } from "@/lib/assess";
import { fmtHours, fmtWait } from "@/lib/format";
import { loadSampleCompany, resetProfile, setItem, setStatus, useReadiness } from "@/lib/profile";
import type { Guide, ItemStatus, VocabItem } from "@/lib/types";
import { VOCAB } from "@/lib/vocabulary";

const STATUS_LABEL: Record<ItemStatus, string> = { not_started: "Not yet", submitted: "Submitted, waiting", done: "Done" };

export function CompanyProfile({ guides, usage }: { guides: Guide[]; usage: Record<string, string[]> }) {
  const profile = useReadiness();
  const used = VOCAB.filter((v) => usage[v.id]?.length || v.accelerator);
  const groups = useMemo(() => {
    const m = new Map<string, VocabItem[]>();
    for (const v of used) {
      const key = v.level === "company" ? "Your company" : `${v.provider} account`;
      m.set(key, [...(m.get(key) ?? []), v]);
    }
    return [...m.entries()];
  }, [used]);

  const totals = useMemo(() => {
    let typ: [number, number] = [0, 0], you: [number, number] = [0, 0];
    for (const g of guides) {
      const a = assess(g, g.defaultUseCase, profile);
      if (!a.available) continue;
      typ = [typ[0] + a.typical.hours[0], typ[1] + a.typical.hours[1]];
      you = [you[0] + a.forYou.hours[0], you[1] + a.forYou.hours[1]];
    }
    return { typ, you };
  }, [guides, profile]);
  const anything = Object.values(profile.company).some((s) => s.status !== "not_started");

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Company profile</h1>
          <p>Providers ask for many of the same things: a verified domain, a privacy policy, a registered business. Record them once and every guide pre-ticks them and shows your own effort.</p>
        </div>
        <div className="top-actions">
          <button className="btn-outline" onClick={resetProfile}>Reset</button>
          <button className="btn" onClick={loadSampleCompany}>Load a sample company</button>
        </div>
      </div>
      <div className="callout callout-info" style={{ marginTop: 0, marginBottom: 18, maxWidth: 860 }}>
        <span>ⓘ</span>
        <span>In this prototype the profile is saved in your browser only. In Composio it would sit at the organisation level, shared by every project and teammate, and reused elsewhere (Connect Link branding, your own callback domain).</span>
      </div>
      <div className="stats profile-stats">
        <div className="stat"><div className="label">All {guides.length} guides · typical hands-on</div><div className="big">{fmtHours(totals.typ)}</div></div>
        <div className="stat"><div className="label">For you</div><div className="big you">{anything ? fmtHours(totals.you) : "—"}</div></div>
      </div>
      <p className="fine" style={{ marginTop: 6 }}>Default use case for each app. Hours are our estimates.</p>

      {groups.map(([title, items]) => (
        <section key={title} className="section" style={{ marginTop: 26, maxWidth: 980 }}>
          <div className="group-head"><h3>{title}</h3><span>{title === "Your company" ? "Counts for every provider." : "Counts for every app from this provider."}</span></div>
          <div className="list">
            {items.map((v) => <ProfileRow key={v.id} v={v} usedBy={usage[v.id] ?? []} />)}
          </div>
        </section>
      ))}
    </main>
  );
}

function ProfileRow({ v, usedBy }: { v: VocabItem; usedBy: string[] }) {
  const profile = useReadiness();
  const st = profile.company[v.id] ?? { status: "not_started" as const };
  const [checking, setChecking] = useState(false);
  const runCheck = async () => {
    if (!st.value || !v.check) return;
    setChecking(true);
    try {
      const q = new URLSearchParams({ type: v.check, value: st.value });
      if (v.id === "privacy_policy") q.append("expect", "Limited Use");
      const res = await fetch(`/api/check?${q}`);
      const body = await res.json();
      setItem({ sharedId: v.id }, { check: { ok: Boolean(body.ok), at: body.at ?? new Date().toISOString(), detail: body.detail ?? "" } });
    } finally {
      setChecking(false);
    }
  };
  const expiresOn = st.status === "done" && v.expiresMonths && st.date ? new Date(new Date(st.date).getTime() + v.expiresMonths * 30.4 * 86400000) : null;
  const expired = expiresOn ? expiresOn < new Date() : false;
  return (
    <div className="prof-row">
      <select className="select status-select" value={st.status} onChange={(e) => setStatus({ sharedId: v.id }, e.target.value as ItemStatus)} aria-label={`Status: ${v.label}`}>
        {(Object.keys(STATUS_LABEL) as ItemStatus[]).filter((s) => s !== "submitted" || v.waitDays).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <div>
        <div className="row-title"><span style={st.status === "done" && !expired ? { color: "var(--easy)" } : undefined}>{v.label}</span>{v.blocking && <span className="tag tag-block">Some paths need this</span>}{v.accelerator && <span className="tag">Speeds things up</span>}</div>
        {v.note && <p className="row-detail">{v.note}</p>}
        <div className="row-meta">
          {v.hours && <span>Typical {fmtHours(v.hours)}</span>}
          {v.waitDays && <span>wait {fmtWait(v.waitDays)}</span>}
          {v.expiresMonths && <span>Renew every {v.expiresMonths} months</span>}
          {usedBy.length > 0 && <span className="tag tag-shared">Used by {usedBy.join(", ")}</span>}
        </div>
        {v.valueLabel && (
          <div className="value-row">
            <label>
              <span className="ev-note">{v.valueLabel}</span>
              <input className="input" value={st.value ?? ""} placeholder={v.valuePlaceholder} onChange={(e) => setItem({ sharedId: v.id }, { value: e.target.value, check: undefined })} />
            </label>
            {v.check && <button className="btn-outline" disabled={!st.value || checking} onClick={runCheck}>{checking ? "Checking…" : "Check it"}</button>}
          </div>
        )}
        {st.check && <p className={`check-result ${st.check.ok ? "ok" : "bad"}`}>{st.check.ok ? "Checked: " : "Check failed: "}{st.check.detail}</p>}
        {v.expiresMonths && st.status === "done" && (
          <label className="value-row">
            <span className="ev-note">Completed on</span>
            <input type="date" className="input" style={{ maxWidth: 180 }} value={st.date?.slice(0, 10) ?? ""} onChange={(e) => e.target.value && setItem({ sharedId: v.id }, { date: new Date(e.target.value).toISOString() })} />
          </label>
        )}
        {expired && <p className="row-detail" style={{ color: "var(--hard)" }}>Expired {expiresOn!.toLocaleDateString("en-GB")}: counts as not done until renewed.</p>}
        {expiresOn && !expired && <p className="ev-note">Valid until {expiresOn.toLocaleDateString("en-GB")}.</p>}
        {st.status === "submitted" && st.date && <p className="ev-note">Submitted {new Date(st.date).toLocaleDateString("en-GB")}.</p>}
      </div>
    </div>
  );
}
