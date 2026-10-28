// Validates guides against the schema, the shared vocabulary and the evidence rules.
// Usage: node scripts/validate-guides.mjs [file ...]   (defaults to every file in data/guides)
import { readdirSync, readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";

const schema = JSON.parse(readFileSync("data/guide.schema.json", "utf8"));
const vocab = new Map(JSON.parse(readFileSync("data/vocabulary.json", "utf8")).items.map((i) => [i.id, i]));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync("data/guides").filter((x) => x.endsWith(".json")).map((f) => `data/guides/${f}`);
let failed = 0;

// Same rules as lib/evidence.ts: a "checked" claim cites a probe that got a response and quotes at least 20 characters of it.
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const quoted = (note, snippets) =>
  [...String(note ?? "").matchAll(/"([^"]+)"|“([^”]+)”/g)].map((m) => norm(m[1] ?? m[2])).filter((q) => q.length >= 20).some((q) => snippets.some((t) => norm(t).includes(q)));

for (const f of files) {
  const g = JSON.parse(readFileSync(f, "utf8"));
  const problems = [];
  if (!validate(g)) problems.push(...validate.errors.map((e) => `${e.instancePath} ${e.message}`));
  const n = g.sources?.length ?? 0;
  const counts = {};
  const answered = new Map((g.probes ?? []).filter((p) => p.status > 0).map((p) => [p.id, p.snippet]));
  const walk = (o, path) => {
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${path}/${i}`));
    if (o && typeof o === "object") {
      if (typeof o.level === "string" && ["tested", "checked", "sourced", "reported", "unverified"].includes(o.level)) counts[o.level] = (counts[o.level] || 0) + 1;
      if (Array.isArray(o.sourceIds)) for (const id of o.sourceIds) if (id < 0 || id >= n) problems.push(`${path}: sourceId ${id} out of range`);
      if (o.level === "sourced" && !o.sourceIds?.length) problems.push(`${path}: 'sourced' with no sourceIds`);
      if (o.level === "checked" && !(o.probeIds?.length && o.probeIds.every((id) => answered.has(id)))) problems.push(`${path}: 'checked' must cite probeIds from probes that got a response (status > 0)`);
      else if (o.level === "checked" && !quoted(o.note, o.probeIds.map((id) => answered.get(id)))) problems.push(`${path}: 'checked' needs a quote of at least 20 characters from a cited probe's snippet in note`);
      for (const [k, v] of Object.entries(o)) walk(v, `${path}/${k}`);
    }
  };
  walk(g, "");

  const todoIds = new Set();
  for (const t of g.todos ?? []) {
    if (todoIds.has(t.id)) problems.push(`todo ${t.id}: duplicate id`);
    todoIds.add(t.id);
    if (t.sharedId && !vocab.has(t.sharedId)) problems.push(`todo ${t.id}: unknown sharedId '${t.sharedId}'`);
    if (!t.sharedId && !t.tier) problems.push(`todo ${t.id}: needs a tier (no sharedId)`);
    if (!t.sharedId && !t.hours && !t.blocking) problems.push(`todo ${t.id}: needs hours (no sharedId)`);
  }
  const ucIds = new Set();
  for (const u of g.useCases ?? []) {
    ucIds.add(u.id);
    for (const id of u.todoIds) if (!todoIds.has(id)) problems.push(`useCase ${u.id}: todoId '${id}' does not exist`);
    if (u.gate === "not_available" && !u.notAvailableReason) problems.push(`useCase ${u.id}: not_available needs notAvailableReason`);
  }
  if (g.defaultUseCase && !ucIds.has(g.defaultUseCase)) problems.push(`defaultUseCase '${g.defaultUseCase}' is not a use case`);
  const prodSteps = (g.steps ?? []).filter((s) => s.milestone === "production").length;
  if (prodSteps) problems.push(`${prodSteps} steps still have milestone 'production'; move them to todos`);
  if (JSON.stringify(g).includes("v3.1/toolkits")) problems.push("mentions the wrong v3.1 redirect URI");

  console.log(`${problems.length ? "FAIL" : "ok  "} ${f}  useCases=${g.useCases?.length ?? 0} todos=${g.todos?.length ?? 0} evidence=${JSON.stringify(counts)}`);
  problems.slice(0, 20).forEach((p) => console.log("     " + p));
  if (problems.length) failed++;
}
process.exit(failed ? 1 : 0);
