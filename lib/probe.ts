// The .ts extension lets node --test load this file.
import { isPublicHost } from "./netguard.ts";
import type { Probe } from "./types";

// A script or style block cut off by the 30k-character limit is dropped to the end, not read as text.
export const htmlToText = (html: string) => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<(script|style)\b[\s\S]*$/i, " ").replace(/<[^<>]*>/g, " ").replace(/\s+/g, " ").trim();

// A credential-free check the live agent runs against a provider: GET only, https only, public hosts only, at most 3 redirects.
export async function httpProbe(id: string, raw: string): Promise<Probe> {
  const at = new Date().toISOString();
  const fail = (snippet: string): Probe => ({ id, url: raw, status: 0, snippet, at });
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail("Not a valid URL.");
  }
  for (let hop = 0; hop <= 3; hop++) {
    if (url.protocol !== "https:") return fail(`Refused: only https URLs are checked (got ${url.protocol}).`);
    if (!(await isPublicHost(url.hostname))) return fail("Refused: that host is not a public address.");
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000), headers: { "user-agent": "OAuthReady-probe/1.0" } });
    } catch (e) {
      return fail((e as Error).name === "TimeoutError" ? "Timed out after 5 seconds." : "Network error.");
    }
    const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (next) {
      await res.body?.cancel().catch(() => {});
      try {
        url = new URL(next, url);
      } catch {
        return fail("Bad redirect target.");
      }
      continue;
    }
    // ponytail: reads the body in full (bounded by the 5 s timeout), then keeps 4 KB of text; only the first 30k characters are parsed, which bounds the regex work.
    const body = (await res.text().catch(() => "")).slice(0, 30_000);
    return { id, url: raw, status: res.status, finalUrl: hop > 0 ? url.href : undefined, contentType: res.headers.get("content-type") ?? undefined, snippet: htmlToText(body).slice(0, 4096), at };
  }
  return fail("Stopped after 3 redirects.");
}
