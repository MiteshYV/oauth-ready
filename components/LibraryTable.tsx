"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RouteBar, routeWeight, type Leg } from "./RouteBar";
import { DiffPill, SearchIcon, Tile } from "./Tile";
import { assess, LEVELS } from "@/lib/assess";
import { rangeHours } from "@/lib/duration";
import { fmtHours, fmtWait } from "@/lib/format";
import { useReadiness } from "@/lib/profile";
import { MILESTONE_LABEL, type Guide } from "@/lib/types";

const rank = (d: string) => (d === "Not available" ? 9 : LEVELS.indexOf(d as (typeof LEVELS)[number]));
type Sort = "easiest" | "hardest" | "name" | "wait";

export function LibraryTable({ guides, showTools = true, emptyText }: { guides: Guide[]; showTools?: boolean; emptyText?: string }) {
  const router = useRouter();
  const profile = useReadiness();
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState("all");
  const [sort, setSort] = useState<Sort>("easiest");

  const rows = useMemo(() => guides.map((g) => {
    const a = assess(g, g.defaultUseCase, profile);
    const typicalA = assess(g, g.defaultUseCase);
    const test: Leg = { label: MILESTONE_LABEL.test, hours: rangeHours(g.verdict.milestones.find((m) => m.id === "test")?.activeEffort), wait: [0, 0] };
    const pick = a.personalised ? a.forYou : a.typical;
    const legs: Leg[] = [test, { label: MILESTONE_LABEL.production, hours: pick.hours, wait: pick.wait, waitUnknown: pick.waitUnknown }];
    const typicalLegs: Leg[] = [test, { label: MILESTONE_LABEL.production, hours: typicalA.typical.hours, wait: typicalA.typical.wait, waitUnknown: typicalA.typical.waitUnknown }];
    const others = g.useCases.filter((u) => u.id !== a.useCase.id).map((u) => assess(g, u.id).difficulty);
    return { g, a, pick, legs, typicalLegs, others };
  }), [guides, profile]);
  const max = Math.max(1, ...rows.map((r) => routeWeight(r.typicalLegs)));

  const shown = rows
    .filter((r) => !q || `${r.g.name} ${r.g.composio?.toolkitSlug ?? ""} ${r.a.useCase.label}`.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => diff === "all" || r.a.difficulty === diff || r.others.includes(diff as never))
    .sort((x, y) => {
      if (sort === "name") return x.g.name.localeCompare(y.g.name);
      if (sort === "wait") return y.pick.wait[1] - x.pick.wait[1];
      const d = rank(x.a.difficulty) - rank(y.a.difficulty);
      return sort === "hardest" ? -d : d;
    });
  const personalised = rows.some((r) => r.a.personalised);

  return (
    <>
      {showTools && (
        <div className="toolbar">
          <div className="left">
            <select className="select" value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Filter by difficulty">
              <option value="all">All difficulties</option>
              {["Easy", "Moderate", "Hard", "Gated"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="easiest">Easiest first</option>
              <option value="hardest">Hardest first</option>
              <option value="wait">Longest wait first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          <div className="right">
            <div className="search" style={{ width: 260 }}>
              <SearchIcon />
              <input className="input" placeholder="Search guides" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search guides" />
            </div>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>App</th>
              <th className="hide-sm">Use case</th>
              <th>Difficulty</th>
              <th className="col-route">Path to production</th>
              <th>{personalised ? "Hands-on (for you)" : "Hands-on"}</th>
              <th className="hide-sm">Then wait</th>
              <th className="hide-md">Verified</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ g, a, pick, legs, others }) => (
              <tr key={g.slug} onClick={() => router.push(`/guides/${g.slug}`)}>
                <td>
                  <a className="cell-app" href={`/guides/${g.slug}`} onClick={(e) => e.preventDefault()} style={{ textDecoration: "none" }}>
                    <Tile name={g.name} />
                    <span>
                      <b>{g.name}</b>
                      <br />
                      <span className="slug">{(g.composio?.toolkitSlug ?? g.slug).toUpperCase()}</span>
                      {g.origin === "live" && <> <span className="pill pill-live">Live</span></>}
                    </span>
                  </a>
                </td>
                <td className="hide-sm">
                  {a.useCase.label}
                  {g.useCases.length > 1 && <div className="cell-sub">+{g.useCases.length - 1} more{others.length ? `: ${[...new Set(others)].join(", ")}` : ""}</div>}
                </td>
                <td><DiffPill d={a.difficulty} /></td>
                <td className="col-route"><RouteBar legs={legs} max={max} /></td>
                <td className="num">
                  {fmtHours(pick.hours)}
                  {a.personalised && <div className="cell-sub">typical {fmtHours(a.typical.hours)}</div>}
                </td>
                <td className="num hide-sm">{fmtWait(pick.wait, pick.waitUnknown)}</td>
                <td className="num hide-md cell-sub">{g.lastVerified}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7} className="empty">{emptyText ?? "No guides match. Try another filter, or create a new guide for this app."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
