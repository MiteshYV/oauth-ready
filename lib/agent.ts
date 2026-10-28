import Anthropic from "@anthropic-ai/sdk";
import Ajv from "ajv/dist/2020";
import { GUIDE_SCHEMA, NO_OAUTH_SCHEMA, NO_OAUTH_TOOL_SCHEMA, TOOL_INPUT_SCHEMA } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";
import { CURATED } from "./curated";
import { downgradeBrokenEvidence, evidenceProblems } from "./evidence";
import { afterFallback } from "./fallback";
import { slugify } from "./match";
import { httpProbe } from "./probe";
import type { AnyGuide, NoOAuthGuide, Probe } from "./types";
import { VOCAB_BY_ID } from "./vocabulary";

export type AgentEvent =
  | { type: "status"; text: string }
  | { type: "search"; query: string }
  | { type: "fetch"; url: string }
  | { type: "results"; count: number; domains: string[] }
  | { type: "note"; text: string }
  | { type: "probe"; url: string; status: number }
  | { type: "check"; ok: boolean; problems?: string[] }
  | { type: "guide"; guide: AnyGuide }
  | { type: "error"; message: string };

const ajv = new Ajv({ allErrors: true, strict: false });
const validateGuide = ajv.compile(GUIDE_SCHEMA);
const validateNoOAuth = ajv.compile(NO_OAUTH_SCHEMA);
const MAX_PROBES = 4;
const STORED_SNIPPET = 4096;

async function composioFact(query: string): Promise<string> {
  const unknown = "Whether Composio offers managed auth for this toolkit is unknown.";
  const key = process.env.COMPOSIO_API_KEY;
  const slug = slugify(query).replace(/-/g, "");
  if (!key || !slug) return unknown;
  try {
    const res = await fetch(`https://backend.composio.dev/api/v3/toolkits/${slug}`, { headers: { "x-api-key": key }, signal: AbortSignal.timeout(5000) });
    if (res.status === 404) return `No Composio toolkit was found with slug "${slug}"; set composio.managedAuth to "unknown" and say the developer may need a custom toolkit.`;
    if (!res.ok) {
      console.warn(`[agent] Composio toolkit check failed: HTTP ${res.status}`);
      return "Whether Composio offers managed auth for this toolkit is unknown (the Composio API check failed). Do not say the toolkit is missing.";
    }
    const t = (await res.json()) as { composio_managed_auth_schemes?: string[]; name?: string };
    const managed = (t.composio_managed_auth_schemes ?? []).length > 0;
    return `Composio API (checked just now): toolkit slug "${slug}" exists${t.name ? ` (${t.name})` : ""}; composio_managed_auth_schemes = ${JSON.stringify(t.composio_managed_auth_schemes ?? [])}. So managed auth is ${managed ? "available" : "NOT available, so the developer must bring their own OAuth app"}. Treat this as a sourced fact from https://docs.composio.dev/toolkits/managed-auth.`;
  } catch {
    return "Whether Composio offers managed auth for this toolkit is unknown (the Composio API could not be reached).";
  }
}

export async function* generateGuide(query: string): AsyncGenerator<AgentEvent> {
  if (!process.env.ANTHROPIC_API_KEY) {
    yield { type: "error", message: "Live generation needs ANTHROPIC_API_KEY. Add it to .env.local (see the README), then restart the app." };
    return;
  }
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  const today = new Date().toISOString().slice(0, 10);

  yield { type: "status", text: "Checking Composio's toolkit catalogue" };
  const fact = await composioFact(query);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Produce the OAuth readiness guide for: "${query}".\n\n${fact}\n\nResearch it, then call submit_guide (or submit_no_oauth).`,
    },
  ];
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: 8 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6, max_content_tokens: 12000 },
    {
      name: "http_probe",
      description: "GET one public https URL on the provider's own domain and return the status and up to 4 KB of text. No credentials. At most 4 calls.",
      input_schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
    {
      name: "submit_guide",
      description: "Submit the finished guide. Call exactly once, after research.",
      input_schema: TOOL_INPUT_SCHEMA as Anthropic.Beta.BetaTool.InputSchema,
    },
    {
      name: "submit_no_oauth",
      description: "Submit instead of submit_guide when third-party developers cannot use OAuth with this app (users connect with an API key or basic auth), or when no such app exists.",
      input_schema: NO_OAUTH_TOOL_SCHEMA as Anthropic.Beta.BetaTool.InputSchema,
    },
  ];

  yield { type: "status", text: "Researching the provider's developer docs" };
  let fixAttempts = 0;
  const probes: Probe[] = [];

  for (let turn = 0; turn < 10; turn++) {
    const queue: AgentEvent[] = [];
    const stream = client.beta.messages.stream({
      model,
      max_tokens: 64000,
      thinking: { type: "adaptive", display: "summarized" },
      // A safety-classifier decline on security-flavoured research is retried on another model instead of ending the demo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Each turn resends the whole conversation; caching it cuts the cost of later turns.
      cache_control: { type: "ephemeral" },
      system: SYSTEM_PROMPT(today),
      tools,
      messages,
    });
    stream.on("streamEvent", (event, snapshot) => {
      if (event.type !== "content_block_stop") return;
      const block = snapshot.content[event.index];
      if (!block) return;
      if (block.type === "server_tool_use") {
        const input = (block.input ?? {}) as { query?: string; url?: string };
        if (block.name === "web_search" && input.query) queue.push({ type: "search", query: input.query });
        if (block.name === "web_fetch" && input.url) queue.push({ type: "fetch", url: input.url });
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        const domains = [...new Set(block.content.map((r) => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return ""; } }).filter(Boolean))];
        queue.push({ type: "results", count: block.content.length, domains: domains.slice(0, 5) });
      } else if (block.type === "text" && block.text.trim()) {
        queue.push({ type: "note", text: block.text.trim().slice(0, 400) });
      } else if (block.type === "thinking" && block.thinking.trim()) {
        queue.push({ type: "note", text: block.thinking.trim().slice(0, 400) });
      }
    });

    // Drain queued progress events while the stream runs.
    const done = stream.finalMessage();
    let finished = false;
    done.finally(() => { finished = true; }).catch(() => {});
    while (!finished) {
      await new Promise((r) => setTimeout(r, 250));
      while (queue.length) yield queue.shift()!;
    }
    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await done;
    } catch (e) {
      yield { type: "error", message: friendlyError(e, model) };
      return;
    }
    while (queue.length) yield queue.shift()!;
    // Token use per turn in the server log, so the cost of a run can be checked. No query text or personal data.
    console.log("[agent] usage", JSON.stringify(message.usage));

    // After a mid-output fallback, the declining model's thinking and tool calls are not echoed, and only calls after the switch run.
    const { echo, live } = afterFallback(message.content);
    messages.push({ role: "assistant", content: echo as unknown as Anthropic.Beta.BetaContentBlockParam[] });
    const cut = message.stop_reason === "max_tokens";

    if (message.stop_reason === "pause_turn") continue;
    if (message.stop_reason === "refusal") {
      yield { type: "error", message: "The model declined to research this request. Try the app's website address instead." };
      return;
    }

    const calls = live.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!calls.length) {
      messages.push({ role: "user", content: "Stop researching and call submit_guide (or submit_no_oauth) now with the complete guide." });
      continue;
    }
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    // A guide sent in the same message as probes cannot cite them: the model has not seen their results yet.
    const seen = probes.length;
    for (const call of calls.filter((c) => c.name === "http_probe")) {
      // A cut-off message may carry a truncated URL, so nothing in it is fetched.
      if (cut) {
        results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: "Your response was cut off; call again." });
        continue;
      }
      const { url } = (call.input ?? {}) as { url?: unknown };
      if (typeof url !== "string" || !url || probes.length >= MAX_PROBES) {
        results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: typeof url === "string" && url ? `Probe budget used (${MAX_PROBES}).` : "Give a url." });
        continue;
      }
      const p = await httpProbe(`p${probes.length + 1}`, url);
      probes.push(p);
      yield { type: "probe", url: p.url, status: p.status };
      results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(p) });
    }

    const submit = calls.find((c) => c.name === "submit_guide" || c.name === "submit_no_oauth");
    if (submit) {
      yield { type: "status", text: "Checking the guide against the schema and evidence rules" };
      const noOAuth = submit.name === "submit_no_oauth";
      // A clone, because submit.input is also in the message history.
      const guide = unstringify(structuredClone(submit.input)) as AnyGuide;
      // The key decides which view renders the guide, so only submit_no_oauth may set it.
      if (!noOAuth) delete (guide as Partial<NoOAuthGuide>).noOAuth;
      guide.origin = "live";
      guide.lastVerified = today;
      guide.slug = slugify(guide.slug || guide.name || query) || slugify(query) || `app-${Date.now().toString(36)}`;
      // A live guide never takes over a curated guide's link.
      if (CURATED.some((c) => c.slug === guide.slug)) guide.slug += "-live";
      // Overwritten before validation, so the model can only cite probes the server actually ran.
      // Full snippets here: a "checked" note must quote text the response really contained.
      guide.probes = probes.slice(0, seen).map((p) => ({ ...p }));
      const validate = noOAuth ? validateNoOAuth : validateGuide;
      const valid = validate(guide);
      const problems = valid ? evidenceProblems(guide, VOCAB_BY_ID) : (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`);
      if (cut) problems.unshift("Your response hit the output limit and was cut off. Keep details shorter.");

      if (problems.length && fixAttempts < 1) {
        fixAttempts++;
        yield { type: "check", ok: false, problems: problems.slice(0, 8) };
        results.push({ type: "tool_result", tool_use_id: submit.id, is_error: true, content: `The guide failed validation. Fix these and call ${submit.name} again with the full guide:\n${problems.slice(0, 30).join("\n")}` });
      } else {
        if (cut) {
          yield { type: "error", message: "The agent's guide was cut off at the output limit again. Try again." };
          return;
        }
        // No repair round is left, so a failure here ends the run: a status line, not a "check", which reads as "sending it back".
        const schemaProblems = () => (validate.errors ?? []).slice(0, 3).map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ");
        fillMissingLists(guide, noOAuth);
        if (!validate(guide)) {
          yield { type: "status", text: `The guide still failed the schema check: ${schemaProblems()}` };
          yield { type: "error", message: "The agent's guide was incomplete. Try again." };
          return;
        }
        // Any remaining evidence problems are downgraded rather than shown as sourced. Only on a schema-valid guide.
        if (evidenceProblems(guide, VOCAB_BY_ID).length) {
          downgradeBrokenEvidence(guide, VOCAB_BY_ID);
          if (!validate(guide)) {
            yield { type: "status", text: `The guide failed the schema check after its evidence was downgraded: ${schemaProblems()}` };
            yield { type: "error", message: "The agent's guide was incomplete. Try again." };
            return;
          }
        }
        yield { type: "check", ok: true };
        guide.generatedAt = new Date().toISOString();
        guide.generatedQuery = query;
        // Stored in full (a probe keeps at most 4 KB), so a reader can find every quote in the saved snippet.
        guide.probes = guide.probes?.map((p) => ({ ...p, snippet: p.snippet.slice(0, STORED_SNIPPET) }));
        yield { type: "guide", guide };
        return;
      }
    }
    // Every tool call needs an answer, or the next request is rejected.
    for (const c of calls) if (!results.some((r) => r.tool_use_id === c.id)) results.push({ type: "tool_result", tool_use_id: c.id, is_error: true, content: "Not run." });
    messages.push({ role: "user", content: results });
  }
  yield { type: "error", message: "The agent did not finish within its step budget. Try again, or try the app's website URL." };
}

// The model sometimes sends a whole section as a JSON string; unpack it rather than spend a repair round on it.
function unstringify(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const g = input as Record<string, unknown>;
  for (const [k, v] of Object.entries(g)) {
    if (typeof v !== "string" || !/^\s*[[{]/.test(v)) continue;
    try { g[k] = JSON.parse(v); } catch { /* leave it for the validator to report */ }
  }
  return g;
}

// Last resort after the repair round: an empty section is better than losing the whole guide in front of the reader.
function fillMissingLists(guide: AnyGuide, noOAuth: boolean) {
  const g = guide as unknown as Record<string, unknown>;
  for (const k of noOAuth ? ["nuances", "openQuestions", "sources"] : ["prerequisites", "steps", "nuances", "whenStuck", "openQuestions", "sources", "todos"]) g[k] ??= [];
  const v = g.verdict as Record<string, unknown> | undefined;
  if (!noOAuth && v) { v.topBlockers ??= []; v.milestones ??= []; }
}

// Plain messages for the failures a reviewer running this locally is most likely to hit.
function friendlyError(e: unknown, model: string): string {
  if (e instanceof Anthropic.AuthenticationError) return "Your ANTHROPIC_API_KEY was rejected. Check the key in .env.local, then restart the app.";
  if (e instanceof Anthropic.NotFoundError) return `The model "${model}" is not available to this API key. Set ANTHROPIC_MODEL in .env.local to a model your key can use that supports adaptive thinking and web search, then restart the app.`;
  if (e instanceof Anthropic.PermissionDeniedError && !/web[ _](search|fetch)/i.test(e.message)) return "This API key is not allowed to use that model or feature. Check the key's workspace in the Claude Console.";
  if (e instanceof Anthropic.RateLimitError) return "Your Anthropic account hit a rate limit. Wait a minute and try again.";
  if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message)) return "Your Anthropic account has no credit. Add some in the Claude Console under Billing, then try again.";
  // No typed error exists for this one, so the message is the only signal. Kept narrow so tool-version errors are not misreported.
  if ((e instanceof Anthropic.BadRequestError || e instanceof Anthropic.PermissionDeniedError) && /web[ _](search|fetch)[^.]*(not enabled|disabled|not allowed|permission|organi[sz]ation)/i.test(e.message)) return "Web search or web fetch is switched off for your Anthropic organisation. An admin can switch it on in the Claude Console (see the README, \"If live generation fails\").";
  return `The model call failed: ${(e as Error).message}`;
}
