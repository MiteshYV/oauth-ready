"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Evidence } from "./Evidence";
import { Interpretation } from "./Interpretation";
import { ProbeList } from "./ProbeList";
import { RouteBar, RouteKey, type Leg } from "./RouteBar";
import { DiffPill, Tile } from "./Tile";
import { assess, GATE_LABEL, type ResolvedTodo } from "@/lib/assess";
import { rangeHours } from "@/lib/duration";
import { fmtHours, fmtWait } from "@/lib/format";
import { agentBrief, guideToMarkdown } from "@/lib/markdown";
import { setStatus, useReadiness } from "@/lib/profile";
import { EVIDENCE_HELP, EVIDENCE_LABEL, MILESTONE_LABEL, OWNER_LABEL, type EvidenceLevel, type Guide, type Owner } from "@/lib/types";

type Tab = "overview" | "checklist" | "setup" | "details" | "evidence";

function countEvidence(g: Guide) {
  const counts: Record<EvidenceLevel, number> = { tested: 0, checked: 0, sourced: 0, reported: 0, unverified: 0 };
  const walk = (o: unknown) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      if (typeof r.level === "string" && r.level in counts) counts[r.level as EvidenceLevel]++;
      Object.values(r).forEach(walk);
    }
  };
  walk(g);
  return counts;
}

const APPROVAL = { none: "Not needed", sometimes: "Some customers", usually: "Most customers" };
const shortScope = (s: string) => s.replace(/^https:\/\/www\.googleapis\.com\/auth\//, "");

export function GuideView({ guide: g, usage }: { guide: Guide; usage: Record<string, string[]> }) {
  const params = useSearchParams();
  const router = useRouter();
  const profile = useReadiness();
  const [useCaseId, setUseCaseId] = useState(params.get("use") ?? g.defaultUseCase);
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) ?? "overview");
  const a = useMemo(() => assess(g, useCaseId, profile), [g, useCaseId, profile]);
  const [copied, setCopied] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const query = (use: string, t: Tab) => {
    const q = new URLSearchParams();
    if (use !== g.defaultUseCase) q.set("use", use);
    if (t !== "overview") q.set("tab", t);
    return q.toString() ? `?${q}` : "";
  };
  const url = `${origin}/guides/${g.slug}${useCaseId !== g.defaultUseCase ? `?use=${useCaseId}` : ""}`;
  const pickUseCase = (id: string) => { setUseCaseId(id); router.replace(`/guides/${g.slug}${query(id, tab)}`, { scroll: false }); };
  const pickTab = (t: Tab) => { setTab(t); router.replace(`/guides/${g.slug}${query(useCaseId, t)}`, { scroll: false }); };

  const evidence = useMemo(() => countEvidence(g), [g]);
  const testMs = g.verdict.milestones.find((m) => m.id === "test");
  const testLeg: Leg = { label: MILESTONE_LABEL.test, hours: rangeHours(testMs?.activeEffort), wait: [0, 0] };
  const prodLeg = (which: "typical" | "forYou"): Leg => ({ label: MILESTONE_LABEL.production, hours: a[which].hours, wait: a[which].wait, waitUnknown: a[which].waitUnknown });
  const owners = useMemo(() => {
    const c: Record<Owner, number> = { agent: 0, agent_assist: 0, you: 0, provider: 0 };
    g.steps.filter((s) => s.milestone === "test").forEach((s) => c[s.owner]++);
    a.todos.forEach((t) => c[t.owner]++);
    return c;
  }, [g, a]);
  const remaining = a.todos.filter((t) => !t.optional && t.state.status !== "done").length;
  const sharedDone = a.todos.filter((t) => t.sharedId && t.state.status === "done").length;
  const sharedTotal = a.todos.filter((t) => t.sharedId).length;
  const testSteps = g.steps.map((s, i) => ({ s, i })).filter(({ s }) => s.milestone === "test");
  const stepDone = (i: number) => profile.guides[g.slug]?.[`step-${i}`]?.status === "done";

  const copy = async (label: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 2200); } catch { setCopied("Copy failed: select and copy manually"); }
  };
  const download = () => {
    const blob = new Blob([guideToMarkdown(g, a, url)], { type: "text/markdown" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${g.slug}-${useCaseId}-oauth-guide.md`;
    link.click();
  };

  const groups: { title: string; note: string; items: ResolvedTodo[] }[] = [
    { title: "Your company", note: "Shared with every guide: tick once, counts everywhere.", items: a.todos.filter((t) => t.level === "company") },
    { title: `Your ${a.todos.find((t) => t.level === "provider")?.provider ?? "provider"} account`, note: "Shared with other apps from this provider.", items: a.todos.filter((t) => t.level === "provider") },
    { title: "This integration", note: "Specific to this app and use case.", items: a.todos.filter((t) => t.level === "integration") },
  ].filter((x) => x.items.length);

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "checklist", label: "Go-live checklist", count: a.available ? remaining : undefined },
    { id: "setup", label: "Test setup", count: testSteps.length },
    { id: "details", label: "Nuances & troubleshooting" },
    { id: "evidence", label: "Sources", count: g.sources.length },
  ];

  return (
    <main className="page">
      <Link href="/" className="back">← All guides</Link>
      <div className="detail-head">
        <Tile name={g.name} large />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{g.name}</h1>
          <div className="meta-line">
            <span className="slug">{(g.composio?.toolkitSlug ?? g.slug).toUpperCase()}</span>
            <span className="label">Verified {g.lastVerified}</span>
            {g.origin === "live" && <span className="pill pill-live">Generated by an agent, not yet reviewed</span>}
          </div>
          <Interpretation i={g.interpretation} />
          <p className="desc">{g.summary}</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => pickTab(t.id)}>
            {t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="detail">
        <div>
          {tab === "overview" && (
            <>
              {g.composio?.managedAuth === "yes" && (
                <div className="callout callout-ok">
                  <span>✓</span>
                  <span><b>You can ship today on Composio&apos;s managed OAuth app.</b> You need your own for your brand on the consent screen, your own scopes or your own rate limits. This guide covers that path.</span>
                </div>
              )}
              <section className="section">
                <div className="label uc-q">What will your agent do?</div>
                <div className="uc-options" role="radiogroup" aria-label="Use case">
                  {g.useCases.map((u) => (
                    <button key={u.id} role="radio" aria-checked={u.id === a.useCase.id} className={`uc-option ${u.id === a.useCase.id ? "on" : ""}`} onClick={() => pickUseCase(u.id)}>
                      {u.label}
                      <DiffPill d={assess(g, u.id).difficulty} />
                    </button>
                  ))}
                </div>
                <div className="verdict-row">
                  <DiffPill d={a.difficulty} />
                  <div>
                    <p className="uc-summary">{a.useCase.summary}</p>
                    {a.available && <p className="uc-drivers">Rated {a.difficulty} because of: {a.drivers.join("; ")}. <Link href="/method#difficulty">How difficulty is set</Link></p>}
                    <div className="uc-scopes">{a.useCase.scopes.map((s) => <code key={s} title={s}>{shortScope(s)}</code>)}</div>
                  </div>
                </div>
                {a.available && a.useCase.customerApproval.likelihood !== "none" && (
                  <div className="callout callout-warn">
                    <span>⚑</span>
                    <span><b>{APPROVAL[a.useCase.customerApproval.likelihood]} will need their admin to approve your app.</b> {a.useCase.customerApproval.detail ?? a.useCase.customerApproval.who} <span className="ev-note">A separate wait inside each customer, not in the timeline below.</span></span>
                  </div>
                )}
                {!a.available && <div className="callout callout-block"><span>⊘</span><span><b>Not available to developers.</b> {a.useCase.notAvailableReason}</span></div>}
              </section>

              {a.available && (
                <section className="section">
                  <div className="stats">
                    <div className="stat">
                      <div className="label">{MILESTONE_LABEL.test}</div>
                      <div className="big">{testMs?.activeEffort ?? "—"}</div>
                      <div className="sub">No provider wait</div>
                    </div>
                    <div className="stat">
                      <div className="label">Any user · typical</div>
                      <div className={`big ${a.personalised ? "struck" : ""}`}>{fmtHours(a.typical.hours)}</div>
                      <div className="sub">then wait {fmtWait(a.typical.wait, a.typical.waitUnknown)}</div>
                    </div>
                    <div className="stat">
                      <div className="label">Any user · for you</div>
                      {a.personalised ? (
                        <>
                          <div className="big you">{fmtHours(a.forYou.hours)}</div>
                          <div className="sub">then wait {fmtWait(a.forYou.wait, a.forYou.waitUnknown)}</div>
                        </>
                      ) : (
                        <div className="sub" style={{ marginTop: 8 }}>Tick what you have in the <button className="link-btn" onClick={() => pickTab("checklist")}>go-live checklist</button>, or <Link href="/company">load a sample company</Link>.</div>
                      )}
                    </div>
                  </div>
                  <div className="card route-card">
                    <RouteBar legs={[testLeg, prodLeg(a.personalised ? "forYou" : "typical")]} big labels />
                    <RouteKey />
                  </div>
                  <p className="fine" style={{ marginTop: 8 }}>Hands-on hours are our estimates. Prerequisite waits run in parallel; reviews start once they are done.</p>
                  {a.blockers.length > 0 && (
                    <div className="callout callout-block">
                      <span>⊘</span>
                      <span><b>Needed before you can go live:</b> {a.blockers.map((b) => b.label).join(", ")}. Without {a.blockers.length === 1 ? "it" : "them"} this path is closed.{g.composio?.meanwhile && <> Meanwhile: {g.composio.meanwhile}</>}</span>
                    </div>
                  )}
                </section>
              )}

              <section className="section">
                <h2>What could hold you up</h2>
                <p className="lede">These decide whether this takes an afternoon or a month.</p>
                <div className="list blocker-list">
                  {g.verdict.topBlockers.map((b, i) => (
                    <div className="row" key={i}>
                      <div>
                        <div className="row-title">{b.title}</div>
                        <p className="row-detail">{b.detail}</p>
                        <div className="row-meta"><Evidence e={b.evidence} sources={g.sources} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {(g.composio?.meanwhile || g.composio?.redirectUriNote) && (
                <section className="section">
                  <h2>Using Composio</h2>
                  <div className="card card-pad">
                    {g.composio.meanwhile && <p style={{ marginBottom: 8 }}><span className="label">While you wait</span><br />{g.composio.meanwhile}</p>}
                    {g.composio.redirectUriNote && <p><span className="label">Redirect URI</span><br />{g.composio.redirectUriNote}</p>}
                    <div className="row-meta"><Evidence e={g.composio.evidence} sources={g.sources} /></div>
                  </div>
                </section>
              )}
            </>
          )}

          {tab === "checklist" && (
            <section className="section">
              <h2>Before you go live: {a.useCase.label.toLowerCase()}</h2>
              {a.available ? (
                <p className="lede">
                  Tick what you already have or have finished; effort updates as you go. Mark things you have sent off as submitted and the wait counts down.
                  {sharedTotal > 0 && <> {sharedDone} of {sharedTotal} shared items already done in <Link href="/company">your company profile</Link>.</>}
                  {a.personalised && <> Remaining: <b>{fmtHours(a.forYou.hours)}</b>, then wait {fmtWait(a.forYou.wait, a.forYou.waitUnknown)}.</>}
                </p>
              ) : (
                <p className="lede">{a.useCase.notAvailableReason}</p>
              )}
              {g.useCases.length > 1 && (
                <div className="toolbar"><div className="left">
                  <select className="select" value={a.useCase.id} onChange={(e) => pickUseCase(e.target.value)} aria-label="Use case">
                    {g.useCases.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                </div></div>
              )}
              {groups.map((grp) => (
                <div key={grp.title}>
                  <div className="group-head"><h3>{grp.title}</h3><span>{grp.note}</span></div>
                  <div className="list">{grp.items.map((t) => <TodoRow key={t.id} t={t} g={g} usage={usage} />)}</div>
                </div>
              ))}
            </section>
          )}

          {tab === "setup" && (
            <section className="section">
              <h2>{MILESTONE_LABEL.test}</h2>
              <p className="lede">{testMs?.activeEffort} hands-on, no provider wait. {testMs?.limits}</p>
              <div className="group-head"><h3>Before you start</h3></div>
              <div className="list">
                {g.prerequisites.map((p, i) => (
                  <div className="row" key={i}>
                    <span className="bullet" aria-hidden="true" />
                    <div>
                      <div className="row-title">{p.item}</div>
                      {p.detail && <p className="row-detail">{p.detail}</p>}
                      <div className="row-meta"><span className={`owner owner-${p.owner}`}>{OWNER_LABEL[p.owner]}</span><Evidence e={p.evidence} sources={g.sources} /></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="group-head"><h3>Steps</h3><span>Blue steps are ones an agent can do or draft for you.</span></div>
              <div className="list">
                {testSteps.map(({ s, i }) => (
                  <div className={`row ${stepDone(i) ? "done" : ""}`} key={i}>
                    <input type="checkbox" className="check" checked={stepDone(i)} onChange={() => setStatus({ slug: g.slug, todoId: `step-${i}` }, stepDone(i) ? "not_started" : "done")} aria-label={`Done: ${s.title}`} />
                    <div>
                      <div className="row-title"><span>{s.title}</span></div>
                      <p className="row-detail">{s.detail}</p>
                      {s.agentHelp && (s.owner === "agent" || s.owner === "agent_assist") && <p className="agent-help"><b>Agent: </b>{s.agentHelp}</p>}
                      <div className="row-meta">
                        <span className={`owner owner-${s.owner}`}>{OWNER_LABEL[s.owner]}</span>
                        {s.estTime && <span>{s.estTime}</span>}
                        {s.url && <a href={s.url} target="_blank" rel="noreferrer">Open console page ↗</a>}
                        <Evidence e={s.evidence} sources={g.sources} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === "details" && (
            <>
              <section className="section">
                <h2>Details that change the plan</h2>
                <div className="list blocker-list">
                  {g.nuances.map((n, i) => (
                    <div className="row" key={i}><div><div className="row-title">{n.title}</div><p className="row-detail">{n.detail}</p><div className="row-meta"><Evidence e={n.evidence} sources={g.sources} /></div></div></div>
                  ))}
                </div>
              </section>
              <section className="section">
                <h2>If you get stuck</h2>
                <div className="list blocker-list">
                  {g.whenStuck.map((w, i) => (
                    <div className="row" key={i}><div><div className="row-title">{w.symptom}</div><p className="row-detail">{w.fix}</p><div className="row-meta"><Evidence e={w.evidence} sources={g.sources} /></div></div></div>
                  ))}
                </div>
              </section>
              {g.steps.some((s) => s.milestone === "listing") && (
                <section className="section">
                  <h2>Optional: {MILESTONE_LABEL.listing}</h2>
                  <div className="list">
                    {g.steps.filter((s) => s.milestone === "listing").map((s, i) => (
                      <div className="row" key={i}>
                        <span className="bullet" aria-hidden="true" />
                        <div><div className="row-title">{s.title}</div><p className="row-detail">{s.detail}</p><div className="row-meta"><span className={`owner owner-${s.owner}`}>{OWNER_LABEL[s.owner]}</span>{s.estTime && <span>{s.estTime}</span>}<Evidence e={s.evidence} sources={g.sources} /></div></div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {tab === "evidence" && (
            <>
              {g.testLog && g.testLog.length > 0 && (
                <section className="section">
                  <h2>What we tested by hand</h2>
                  <div className="list blocker-list">
                    {g.testLog.map((t, i) => (<div className="row" key={i}><div><div className="row-title">{t.action}</div><p className="row-detail">{t.result}</p>{t.date && <p className="ev-note">{t.date}</p>}</div></div>))}
                  </div>
                </section>
              )}
              <ProbeList probes={g.probes} />
              {g.openQuestions.length > 0 && (
                <section className="section">
                  <h2>Not yet verified</h2>
                  <p className="lede">We could not confirm these. Here is how you can.</p>
                  <div className="list blocker-list">{g.openQuestions.map((q, i) => <div className="row" key={i}><p className="row-detail" style={{ marginTop: 0 }}>{q}</p></div>)}</div>
                </section>
              )}
              <section className="section">
                <h2>Sources</h2>
                <div className="card card-pad">
                  <ol className="sources">
                    {g.sources.map((s, i) => (<li key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a><span className="src-type">{s.type}{s.accessed ? ` · ${s.accessed}` : ""}</span></li>))}
                  </ol>
                </div>
              </section>
            </>
          )}
        </div>

        <aside className="meta">
          <div className="meta-item"><div className="label">Difficulty</div><div className="val"><DiffPill d={a.difficulty} /></div></div>
          <div className="meta-item"><div className="label">Use case</div><div className="val">{a.useCase.label}</div></div>
          <div className="meta-item"><div className="label">Provider gate</div><div className="val">{a.useCase.gateName ?? GATE_LABEL[a.useCase.gate]}</div></div>
          <div className="meta-item"><div className="label">Customer admin approval</div><div className="val">{APPROVAL[a.useCase.customerApproval.likelihood]}</div></div>
          {g.composio?.managedAuth && (
            <div className="meta-item"><div className="label">Composio managed OAuth</div><div className="val"><span className={`pill ${g.composio.managedAuth === "yes" ? "pill-Easy" : ""}`}><span className="dot" />{g.composio.managedAuth === "yes" ? "Available" : g.composio.managedAuth === "no" ? "Bring your own" : "Unknown"}</span></div></div>
          )}
          {a.available && sharedTotal > 0 && (
            <div className="meta-item"><div className="label">Company profile</div><div className="val">{sharedDone} of {sharedTotal} shared items done · <Link href="/company">Open</Link></div></div>
          )}
          <div className="meta-item">
            <div className="label">Who does what</div>
            <div className="val" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              {(Object.keys(owners) as Owner[]).filter((o) => owners[o]).map((o) => <span key={o}><span className={`owner owner-${o}`}>{OWNER_LABEL[o]}</span> · {owners[o]}</span>)}
            </div>
          </div>
          <div className="meta-item">
            <div className="label">How sure we are</div>
            <div className="val" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              {(Object.keys(evidence) as EvidenceLevel[]).map((l) => <span key={l} title={EVIDENCE_HELP[l]}><span className={`ev ev-${l}`}>{EVIDENCE_LABEL[l]}</span> {evidence[l]}</span>)}
              <Link href="/method" className="fine">How we check guides</Link>
            </div>
          </div>
          <div className="meta-actions">
            <button className="btn btn-block" onClick={() => copy("Agent brief copied", agentBrief(g, a, profile, url))}>Copy brief for your coding agent</button>
            <button className="btn-outline btn-block" onClick={() => copy("Link copied", url)}>Copy link</button>
            <button className="btn-outline btn-block" onClick={() => copy("Copied as Markdown", guideToMarkdown(g, a, url))}>Copy as Markdown</button>
            <button className="btn-outline btn-block" onClick={download}>Download .md</button>
            <a className="btn-outline btn-block" href={`/api/guides/${g.slug}`} download={`${g.slug}-oauth-guide.json`}>Download JSON</a>
            {copied && <span className="copied" role="status">{copied}</span>}
          </div>
        </aside>
      </div>
    </main>
  );
}

function TodoRow({ t, g, usage }: { t: ResolvedTodo; g: Guide; usage: Record<string, string[]> }) {
  const scope = t.sharedId ? { sharedId: t.sharedId } : { slug: g.slug, todoId: t.id };
  const done = t.state.status === "done";
  const submitted = t.state.status === "submitted";
  const others = t.sharedId ? (usage[t.sharedId] ?? []).filter((n) => n !== g.name) : [];
  return (
    <div className={`row ${done ? "done" : ""}`}>
      <input type="checkbox" className="check" checked={done} onChange={() => setStatus(scope, done ? "not_started" : "done")} aria-label={`Done: ${t.label}`} />
      <div>
        <div className="row-title">
          <span>{t.label}</span>
          {t.optional && <span className="tag">Optional</span>}
          {t.blocking && !done && <span className="tag tag-block">Required to proceed</span>}
          {submitted && <span className="tag tag-wait">Submitted, waiting</span>}
        </div>
        {t.detail && <p className="row-detail">{t.detail}</p>}
        {t.state.value && <p className="row-detail"><span className="ev-note">From your profile:</span> <code>{t.state.value}</code></p>}
        {t.state.expired && <p className="row-detail" style={{ color: "var(--hard)" }}>Expired: this needs renewing, so it counts again.</p>}
        {t.accelerated && !done && <p className="row-detail" style={{ color: "var(--easy)" }}>Faster because you have: {t.accelerated}.</p>}
        {t.agentHelp && (t.owner === "agent" || t.owner === "agent_assist") && !done && <p className="agent-help"><b>Agent: </b>{t.agentHelp}</p>}
        <div className="row-meta">
          <span className={`owner owner-${t.owner}`}>{OWNER_LABEL[t.owner]}</span>
          {t.hoursR && <span>{fmtHours(t.hoursR)}</span>}
          {t.waitR && t.waitR[1] > 0 && <span>wait {fmtWait(t.waitR)}{t.waitBasis ? ` (${t.waitBasis})` : ""}</span>}
          {t.kind === "review" && !t.waitR && <span>wait unknown</span>}
          {t.sharedId && <span className="tag tag-shared" title={others.length ? `Also counts for ${others.join(", ")}` : "Shared across guides"}>Shared{others.length ? ` · also ${others.slice(0, 3).join(", ")}${others.length > 3 ? "…" : ""}` : ""}</span>}
          {t.url && <a href={t.url} target="_blank" rel="noreferrer">Open page ↗</a>}
          <Evidence e={t.evidence} sources={g.sources} />
          {!done && t.waitR && t.waitR[1] > 0 && (
            <button className="link-btn" onClick={() => setStatus(scope, submitted ? "not_started" : "submitted")}>{submitted ? "Undo submitted" : "Mark as submitted"}</button>
          )}
        </div>
        {submitted && <p className="ev-note" style={{ marginTop: 4 }}>Submitted {t.state.date ? new Date(t.state.date).toLocaleDateString("en-GB") : ""}. Remaining wait: {fmtWait(t.remainingWait)}.</p>}
      </div>
    </div>
  );
}
