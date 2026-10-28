import { assess } from "@/lib/assess";
import { CURATED } from "@/lib/curated";

// The library as JSON, so the same content can be embedded in a dashboard, docs or a coding agent.
export function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return Response.json({
    guides: CURATED.map((g) => ({
      slug: g.slug,
      name: g.name,
      lastVerified: g.lastVerified,
      url: `${origin}/guides/${g.slug}`,
      json: `${origin}/api/guides/${g.slug}`,
      defaultUseCase: g.defaultUseCase,
      useCases: g.useCases.map((u) => {
        const a = assess(g, u.id);
        return { id: u.id, label: u.label, difficulty: a.difficulty, typicalHours: a.typical.hours, typicalWaitDays: a.typical.wait, waitUnknown: a.typical.waitUnknown };
      }),
    })),
  });
}
