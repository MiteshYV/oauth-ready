import type { Guide } from "./types";

type Known = { has(id: string): boolean };

// Beyond the schema: catch evidence that points at nothing. Works for both guide shapes.
export function evidenceProblems(guide: object, shared: Known): string[] {
  const g = guide as Partial<Guide>;
  const problems: string[] = [];
  const n = g.sources?.length ?? 0;
  const probeIds = evidenceProbes(g);
  const walk = (o: unknown, path: string) => {
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${path}/${i}`));
    if (o && typeof o === "object") {
      const rec = o as Record<string, unknown>;
      if (Array.isArray(rec.sourceIds)) for (const id of rec.sourceIds as number[]) if (id < 0 || id >= n) problems.push(`${path}: sourceId ${id} does not exist`);
      if (rec.level === "sourced" && !(Array.isArray(rec.sourceIds) && rec.sourceIds.length)) problems.push(`${path}: "sourced" needs at least one sourceId`);
      if (rec.level === "checked" && !validProbes(rec.probeIds, probeIds)) problems.push(`${path}: "checked" must cite probeIds from http_probe calls you made`);
      else if (rec.level === "checked" && !quoted(rec.note, rec.probeIds as string[], probeIds)) problems.push(`${path}: "checked" needs a verbatim quote of at least 20 characters from a cited response, in double quotes, in note`);
      if (rec.level === "tested") problems.push(`${path}: "tested" is not allowed for generated guides`);
      for (const [k, v] of Object.entries(rec)) if (k !== "probes") walk(v, `${path}/${k}`);
    }
  };
  walk(g, "");
  const ids = new Set((g.todos ?? []).map((t) => t.id));
  for (const t of g.todos ?? []) {
    if (t.sharedId && !shared.has(t.sharedId)) problems.push(`todo ${t.id}: unknown sharedId "${t.sharedId}" (use one from the list or leave it out)`);
    if (!t.sharedId && !t.tier) problems.push(`todo ${t.id}: needs a tier`);
    if (!t.sharedId && !t.hours && !t.blocking) problems.push(`todo ${t.id}: needs hours`);
  }
  for (const u of g.useCases ?? []) for (const id of u.todoIds) if (!ids.has(id)) problems.push(`useCase ${u.id}: todoId "${id}" does not exist`);
  if (g.useCases?.length && !g.useCases.some((u) => u.id === g.defaultUseCase)) problems.push(`defaultUseCase must be one of the useCases ids`);
  if (JSON.stringify(g).includes("v3.1/toolkits")) problems.push(`there is no v3.1 Composio callback: tell the developer to copy the redirect URI the Composio dashboard shows (on 29 Oct 2026, /api/v1/auth-apps/add; some docs show /api/v3/toolkits/auth/callback)`);
  return problems;
}

// A probe that was refused or failed (status 0) returned nothing from the provider, so it is not evidence.
const evidenceProbes = (g: Partial<Guide>) => new Map((Array.isArray(g.probes) ? g.probes : []).filter((p) => p && p.status > 0).map((p) => [p.id, String(p.snippet ?? "")]));

const validProbes = (ids: unknown, known: Known) => Array.isArray(ids) && ids.length > 0 && ids.every((id) => known.has(id as string));

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const MIN_QUOTE = 20;

// A "checked" note must quote the response, so a reader can find the claim in what the probe returned.
function quoted(note: unknown, ids: string[], snippets: Map<string, string>): boolean {
  if (typeof note !== "string") return false;
  const quotes = [...note.matchAll(/"([^"]+)"|“([^”]+)”/g)].map((m) => norm(m[1] ?? m[2])).filter((q) => q.length >= MIN_QUOTE);
  const texts = ids.map((id) => norm(snippets.get(id) ?? ""));
  return quotes.some((q) => texts.some((t) => t.includes(q)));
}

// Whatever still fails after the repair round is downgraded rather than shown as fact.
export function downgradeBrokenEvidence(guide: object, shared: Known) {
  const g = guide as Partial<Guide>;
  // Defensive throughout: this runs on model output, and must never throw.
  const todos = (Array.isArray(g.todos) ? g.todos : []).filter((t) => t && typeof t === "object");
  const useCases = (Array.isArray(g.useCases) ? g.useCases : []).filter((u) => u && typeof u === "object");
  for (const t of todos) if (t.sharedId && !shared.has(t.sharedId)) { delete t.sharedId; t.tier = t.tier ?? "paperwork"; t.hours = t.hours ?? [1, 4]; }
  const ids = new Set(todos.map((t) => t.id));
  for (const u of useCases) u.todoIds = (Array.isArray(u.todoIds) ? u.todoIds : []).filter((id) => ids.has(id));
  if (useCases.length && !useCases.some((u) => u.id === g.defaultUseCase)) g.defaultUseCase = useCases[0].id;
  const n = Array.isArray(g.sources) ? g.sources.length : 0;
  const probeIds = evidenceProbes(g);
  const walk = (o: unknown) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === "object") {
      const rec = o as Record<string, unknown>;
      if (typeof rec.level === "string") {
        const ids = Array.isArray(rec.sourceIds) ? (rec.sourceIds as number[]).filter((i) => i >= 0 && i < n) : [];
        rec.sourceIds = ids;
        const why =
          rec.level === "tested" ? "generated guides cannot claim Tested"
          : rec.level === "sourced" && !ids.length ? "the agent cited no valid source"
          : rec.level === "checked" && !validProbes(rec.probeIds, probeIds) ? "the agent cited no check it actually ran"
          : rec.level === "checked" && !quoted(rec.note, rec.probeIds as string[], probeIds) ? "the quoted text was not in the response"
          : "";
        if (why) {
          rec.level = "unverified";
          rec.note = `${rec.note ? rec.note + " " : ""}(Downgraded: ${why}.)`;
        }
      }
      for (const [k, v] of Object.entries(rec)) if (k !== "probes") walk(v);
    }
  };
  walk(g);
}
