import Link from "next/link";
import { Suspense } from "react";
import { LibraryTable } from "@/components/LibraryTable";
import { NewGuideDrawer } from "@/components/NewGuideDrawer";
import { RouteKey } from "@/components/RouteBar";
import { CURATED } from "@/lib/curated";
import { listGenerated, loadGuide } from "@/lib/store";
import { isNoOAuth, type AnyGuide, type Guide } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const generatedMeta = await listGenerated(8);
  const loaded = (await Promise.all(generatedMeta.map((m) => loadGuide(m.slug)))).filter(
    (g): g is AnyGuide => Boolean(g) && !CURATED.some((c) => c.slug === g!.slug),
  );
  const generated = loaded.filter((g): g is Guide => !isNoOAuth(g) && Boolean(g.useCases?.length));
  // An input that was not identified as an app is not listed as needing no OAuth app.
  const noOAuth = loaded.filter(isNoOAuth).filter((g) => g.noOAuth.method !== "not_found");

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>OAuth app guides</h1>
          <p>How long until your users can connect an app to your agent: the hands-on work, the provider&apos;s wait, what blocks approval, and which steps an agent can do. Difficulty is for each app&apos;s most common agent use; open a guide to pick yours.</p>
        </div>
        <div className="top-actions">
          <Link href="/company" className="btn-outline">Company profile</Link>
          <Link href="/?new=1" className="btn" scroll={false}>+ New guide</Link>
        </div>
      </div>

      <LibraryTable guides={CURATED} />
      <div className="table-foot">
        <RouteKey />
        <span>Hands-on times are estimates. <Link href="/company">Add what your company already has</Link> to see your own.</span>
      </div>

      {(generated.length > 0 || noOAuth.length > 0) && (
        <section style={{ marginTop: 36 }}>
          <div className="page-head" style={{ marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 16 }}>Recently generated</h1>
              <p>Written live by the agent for apps outside the library. Not yet reviewed by a person.</p>
            </div>
          </div>
          {generated.length > 0 && <LibraryTable guides={generated} showTools={false} />}
          {noOAuth.length > 0 && (
            <p className="fine" style={{ marginTop: 8 }}>
              No OAuth app needed: {noOAuth.map((g, i) => <span key={g.slug}>{i ? ", " : ""}<Link href={`/guides/${g.slug}`}>{g.name}</Link></span>)}
            </p>
          )}
        </section>
      )}

      <Suspense>
        <NewGuideDrawer guides={CURATED} />
      </Suspense>
    </main>
  );
}
