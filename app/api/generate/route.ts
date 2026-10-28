import { generateGuide } from "@/lib/agent";
import { saveGuide } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // A cross-site form can only send simple content types, and browsers mark cross-site requests: either check stops one.
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return Response.json({ error: "Send JSON." }, { status: 415 });
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return Response.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  const q = (query ?? "").trim().slice(0, 120);
  if (q.length < 2) return Response.json({ error: "Enter an app name or website." }, { status: 400 });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      const ping = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 15000);
      try {
        for await (const event of generateGuide(q)) {
          if (event.type === "guide") {
            try {
              await saveGuide(event.guide);
              send({ type: "saved", slug: event.guide.slug });
            } catch (e) {
              send({ type: "status", text: `Could not save a shareable copy: ${(e as Error).message}` });
            }
          }
          send(event);
        }
      } catch (e) {
        send({ type: "error", message: (e as Error).message });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
