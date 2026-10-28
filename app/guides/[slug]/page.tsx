import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GuideView } from "@/components/GuideView";
import { NoOAuthView } from "@/components/NoOAuthView";
import { assess, sharedUsage } from "@/lib/assess";
import { CURATED } from "@/lib/curated";
import { loadGuide } from "@/lib/store";
import { isNoOAuth, type AnyGuide } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getGuide(slug: string): Promise<AnyGuide | null> {
  return CURATED.find((g) => g.slug === slug) ?? (await loadGuide(slug));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  if (!g) return { title: "Guide not found" };
  if (isNoOAuth(g)) return { title: `${g.name}: no OAuth app needed | OAuth Ready`, description: g.summary };
  if (!g.useCases?.length) return { title: "Guide not found" };
  return { title: `${g.name} OAuth app: ${assess(g).difficulty} | OAuth Ready`, description: g.summary };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = await getGuide((await params).slug);
  if (!g) notFound();
  if (isNoOAuth(g)) return <NoOAuthView guide={g} />;
  if (!g.useCases?.length) notFound();
  const usage = Object.fromEntries(sharedUsage(CURATED));
  return (
    <Suspense>
      <GuideView guide={g} usage={usage} />
    </Suspense>
  );
}
