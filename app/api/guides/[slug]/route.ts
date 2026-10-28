import { assess } from "@/lib/assess";
import { CURATED } from "@/lib/curated";
import { loadGuide } from "@/lib/store";
import { isNoOAuth } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = CURATED.find((x) => x.slug === slug) ?? (await loadGuide(slug));
  if (!g) return Response.json({ error: "No guide with that slug" }, { status: 404 });
  const computed = isNoOAuth(g) ? [] : (g.useCases ?? []).map((u) => {
    const a = assess(g, u.id);
    return { useCase: u.id, difficulty: a.difficulty, drivers: a.drivers, typicalHours: a.typical.hours, typicalWaitDays: a.typical.wait, waitUnknown: a.typical.waitUnknown };
  });
  return Response.json({ ...g, computed });
}
