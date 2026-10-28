import { Suspense } from "react";
import { LiveGenerator } from "@/components/LiveGenerator";
import { sharedUsage } from "@/lib/assess";
import { CURATED } from "@/lib/curated";

export const dynamic = "force-dynamic";

export default function GeneratePage() {
  return (
    <Suspense>
      <LiveGenerator usage={Object.fromEntries(sharedUsage(CURATED))} />
    </Suspense>
  );
}
