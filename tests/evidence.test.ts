import assert from "node:assert/strict";
import { test } from "node:test";
import { downgradeBrokenEvidence, evidenceProblems } from "../lib/evidence.ts";
import type { Guide } from "../lib/types.ts";

const shared = new Set<string>();
const guide = (evidence: object) =>
  ({
    sources: [{ title: "Docs", url: "https://example.com/docs", type: "official" }],
    probes: [{ id: "p1", url: "https://example.com/.well-known/openid-configuration", status: 200, snippet: "Sign in to continue. The redirect_uri does not match a registered callback for this client.", at: "2026-10-29T09:00:00Z" }],
    nuances: [{ title: "Claim", detail: "Detail", evidence }],
    todos: [],
    useCases: [],
  }) as unknown as Guide;
const levelOf = (g: Guide) => g.nuances[0].evidence.level;

test("checked citing a probe that ran is accepted", () => {
  const g = guide({ level: "checked", probeIds: ["p1"], note: 'The response says "redirect_uri does not match a registered callback".' });
  assert.deepEqual(evidenceProblems(g, shared), []);
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "checked");
});

test("checked citing a probe that never ran is reported and downgraded", () => {
  const g = guide({ level: "checked", probeIds: ["p9"] });
  assert.equal(evidenceProblems(g, shared).length, 1);
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "unverified");
});

test("checked with no probe ids is downgraded", () => {
  const g = guide({ level: "checked" });
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "unverified");
});

test("sourced without a source is still downgraded, and tested is never allowed", () => {
  const g = guide({ level: "sourced" });
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "unverified");
  assert.equal(evidenceProblems(guide({ level: "tested" }), shared).length, 1);
});

test("checked with no quote in the note is reported and downgraded", () => {
  const g = guide({ level: "checked", probeIds: ["p1"], note: "The error page shows the endpoint is live." });
  assert.equal(evidenceProblems(g, shared).length, 1);
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "unverified");
  assert.match(g.nuances[0].evidence.note ?? "", /the quoted text was not in the response/);
});

test("checked with a quote that is not in the response is downgraded", () => {
  const g = guide({ level: "checked", probeIds: ["p1"], note: '"client_id is required for every request"' });
  assert.equal(evidenceProblems(g, shared).length, 1);
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "unverified");
});

test("a quote shorter than 20 characters does not count", () => {
  const g = guide({ level: "checked", probeIds: ["p1"], note: '"Sign in to continue"' });
  assert.equal(evidenceProblems(g, shared).length, 1);
});

test("quote matching ignores case and runs of whitespace", () => {
  const g = guide({ level: "checked", probeIds: ["p1"], note: 'Shows "THE  REDIRECT_URI does not\n match a registered".' });
  assert.deepEqual(evidenceProblems(g, shared), []);
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "checked");
});

test("a quote in curly quotes counts too", () => {
  const g = guide({ level: "checked", probeIds: ["p1"], note: "Shows “redirect_uri does not match a registered callback”." });
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "checked");
});

test("a probe that was refused or failed (status 0) is not evidence", () => {
  const g = guide({ level: "checked", probeIds: ["p1"], note: 'The response says "redirect_uri does not match a registered callback".' });
  g.probes![0].status = 0;
  assert.equal(evidenceProblems(g, shared).length, 1);
  downgradeBrokenEvidence(g, shared);
  assert.equal(levelOf(g), "unverified");
  assert.match(g.nuances[0].evidence.note ?? "", /no check it actually ran/);
});

test("downgradeBrokenEvidence never throws on a malformed guide", () => {
  const g = { useCases: [{ id: "u1" }, { id: "u2", todoIds: "t1" }], todos: "none", probes: {}, sources: 3, nuances: [{ evidence: { level: "checked", probeIds: "p1" } }] };
  assert.doesNotThrow(() => downgradeBrokenEvidence(g, shared));
  assert.equal(g.nuances[0].evidence.level, "unverified");
});
