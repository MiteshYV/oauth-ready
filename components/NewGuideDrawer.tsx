"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DiffPill, SearchIcon, Tile } from "./Tile";
import { assess } from "@/lib/assess";
import { findGuide } from "@/lib/match";
import type { Guide } from "@/lib/types";

// Mirrors the dashboard's "Create Auth Config" drawer: search, pick a toolkit, or let the agent research a new one.
export function NewGuideDrawer({ guides }: { guides: Guide[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const open = params.get("new") === "1";
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 30); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.replace("/", { scroll: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, router]);
  if (!open) return null;

  const close = () => router.replace("/", { scroll: false });
  const term = q.trim().toLowerCase();
  const matches = guides.filter((g) => !term || g.name.toLowerCase().includes(term) || (g.composio?.toolkitSlug ?? "").includes(term) || g.website.toLowerCase().includes(term));
  const exact = term ? findGuide(q, guides) : undefined;
  const go = () => {
    if (!q.trim()) return;
    router.push(exact ? `/guides/${exact.slug}` : `/generate?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <div className="scrim" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="New guide">
        <div className="drawer-head">
          <h2>New guide</h2>
          <button className="icon-btn" onClick={close} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          <form onSubmit={(e) => { e.preventDefault(); go(); }}>
            <div className="search">
              <SearchIcon />
              <input ref={input} className="input" placeholder="App name or website, e.g. Calendly" value={q} onChange={(e) => setQ(e.target.value)} aria-label="App name or website" />
            </div>
          </form>
          <ul className="pick-list">
            {matches.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`}>
                  <Tile name={g.name} />
                  <span className="grow">{g.name}</span>
                  <DiffPill d={assess(g).difficulty} />
                </Link>
              </li>
            ))}
            {term && !exact && (
              <li>
                <button onClick={go}>
                  <span className="tile">+</span>
                  <span className="grow">Research <b>{q.trim()}</b> with the agent<div className="cell-sub">Reads the provider&apos;s developer docs and writes a guide, usually in 1 to 3 minutes.</div></span>
                  <span className="pill pill-brand">Agent</span>
                </button>
              </li>
            )}
          </ul>
          <p className="drawer-note">Library guides open instantly. Anything else is researched live and gets its own link to share. Try <button className="link-btn" onClick={() => setQ("Calendly")}>Calendly</button>, <button className="link-btn" onClick={() => setQ("Figma")}>Figma</button> or <button className="link-btn" onClick={() => setQ("zoom.us")}>zoom.us</button>.</p>
        </div>
      </aside>
    </>
  );
}
