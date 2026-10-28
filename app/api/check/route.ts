import { lookup } from "node:dns/promises";
import { isPublicHost } from "@/lib/netguard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Checks a company profile value the way an agent would before a provider does:
// does the domain resolve, does the page load, does it mention what reviewers look for.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const value = (searchParams.get("value") ?? "").trim().slice(0, 300);
  const expect = searchParams.getAll("expect").slice(0, 5);
  const at = new Date().toISOString();

  if (type === "dns") {
    const host = value.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
    try {
      const addrs = await lookup(host, { all: true });
      return Response.json({ ok: addrs.length > 0, at, detail: `${host} resolves (${addrs.length} address${addrs.length === 1 ? "" : "es"}). Ownership still has to be verified with the provider.` });
    } catch {
      return Response.json({ ok: false, at, detail: `${host} does not resolve.` });
    }
  }

  if (type === "url") {
    let u: URL;
    try { u = new URL(value); } catch { return Response.json({ ok: false, at, detail: "Not a valid URL." }); }
    if (u.protocol !== "https:") return Response.json({ ok: false, at, detail: "Providers expect an https URL." });
    if (!(await isPublicHost(u.hostname))) return Response.json({ ok: false, at, detail: "That host can't be checked." });
    try {
      const res = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": "OAuthReady-check/1.0" } });
      const text = res.ok ? (await res.text()).slice(0, 400000).toLowerCase() : "";
      const mentions = Object.fromEntries(expect.map((e) => [e, text.includes(e.toLowerCase())]));
      const missing = Object.entries(mentions).filter(([, v]) => !v).map(([k]) => k);
      const detail = res.ok
        ? `Loads (${res.status}).${expect.length ? missing.length ? ` Does not mention: ${missing.join(", ")}.` : ` Mentions ${expect.join(", ")}.` : ""}`
        : `Returned ${res.status}.`;
      return Response.json({ ok: res.ok, at, detail, status: res.status, mentions });
    } catch (e) {
      return Response.json({ ok: false, at, detail: `Could not load it: ${(e as Error).name === "TimeoutError" ? "timed out" : "network error"}.` });
    }
  }
  return Response.json({ error: "type must be url or dns" }, { status: 400 });
}
