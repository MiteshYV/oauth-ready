"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GuideView } from "./GuideView";
import { NoOAuthView } from "./NoOAuthView";
import { isNoOAuth, type AnyGuide } from "@/lib/types";

type TraceItem = { kind: string; text: string; sub?: string };

function describe(e: Record<string, unknown>): TraceItem | null {
  switch (e.type) {
    case "status": return { kind: "status", text: String(e.text) };
    case "search": return { kind: "search", text: "Searching", sub: `“${e.query}”` };
    case "fetch": {
      let host = String(e.url);
      try { const u = new URL(String(e.url)); host = u.hostname.replace(/^www\./, "") + u.pathname; } catch { /* keep raw */ }
      return { kind: "fetch", text: "Reading", sub: host.length > 80 ? host.slice(0, 80) + "…" : host };
    }
    case "probe": return { kind: "fetch", text: "Checking live", sub: `${e.url} → ${Number(e.status) || "no response"}` };
    case "results": return { kind: "results", text: `${e.count} results`, sub: (e.domains as string[]).join(", ") };
    case "note": return { kind: "note", text: String(e.text) };
    case "check": return e.ok
      ? { kind: "ok", text: "Guide passed the schema and evidence checks" }
      : { kind: "status", text: "Guide failed checks; sending it back to the agent to fix", sub: (e.problems as string[]).slice(0, 3).join("; ") };
    case "error": return { kind: "error", text: String(e.message) };
    default: return null;
  }
}

export function LiveGenerator({ usage }: { usage: Record<string, string[]> }) {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [guide, setGuide] = useState<AnyGuide | null>(null);
  const [error, setError] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [running, setRunning] = useState(false);
  const started = useRef(false);
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!q || started.current) return;
    started.current = true;
    t0.current = Date.now();
    setRunning(true);
    (async () => {
      try {
        const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const chunks = buf.split("\n\n");
          buf = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const e = JSON.parse(line.slice(6));
            if (e.type === "guide") {
              setGuide(e.guide);
            } else if (e.type === "saved") {
              // Only a saved guide has a link that works; until then the address stays /generate.
              window.history.replaceState(null, "", `/guides/${e.slug}`);
            } else if (e.type === "status" && String(e.text).startsWith("Could not save")) {
              setSaveNote(String(e.text));
            } else if (e.type === "error") {
              setError(e.message);
            }
            const item = describe(e);
            if (item) setTrace((t) => [...t, item]);
          }
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setRunning(false);
      }
    })();
  }, [q]);

  // The guide comes first: once its link replaces the URL, the ?q= parameter is gone.
  if (guide) {
    return (
      <>
        {isNoOAuth(guide) ? <NoOAuthView guide={guide} /> : <GuideView guide={guide} usage={usage} />}
        {saveNote && <p className="fine page" role="status" style={{ paddingTop: 0 }}>{saveNote}</p>}
      </>
    );
  }

  if (!q) {
    return (
      <main className="page">
        <div className="page-head"><div><h1>New guide</h1><p>Pick an app from <Link href="/?new=1">New guide</Link> to start.</p></div></div>
      </main>
    );
  }

  return (
    <main className="page">
      <Link href="/" className="back">← All guides</Link>
      <div className="page-head">
        <div>
          <h1>Researching {q}</h1>
          <p>
        {running
          ? `An agent is reading ${q}'s developer docs and writing a guide. Usually one to three minutes. ${elapsed}s so far.`
          : error ? "The agent stopped." : "Finishing up."}
          </p>
        </div>
        {running && <span className="pill pill-brand"><span className="dot" />Agent running · {elapsed}s</span>}
      </div>
      <div className="card" style={{ maxWidth: 860 }}>
      <ol className="trace" aria-live="polite">
        {trace.map((t, i) => (
          <li key={i} className={`t-${t.kind} ${running && i === trace.length - 1 ? "current" : ""}`}>
            <span className="ic" />
            <span>{t.kind === "note" ? <span className="note">{t.text}</span> : <>{t.text}{t.sub && <> <span className="what">{t.sub}</span></>}</>}</span>
          </li>
        ))}
        {running && trace.length === 0 && <li className="current"><span className="ic" /><span>Starting the agent</span></li>}
      </ol>
      </div>
      {error && (
        <div className="callout callout-block" style={{ maxWidth: 860 }}>
          {error} <Link href="/">Back to the library</Link> or <a href={`/generate?q=${encodeURIComponent(q)}`}>try again</a>.
        </div>
      )}
    </main>
  );
}
