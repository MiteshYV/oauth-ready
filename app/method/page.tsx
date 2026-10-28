import Link from "next/link";
import { CURATED } from "@/lib/curated";
import { CHECK_SUMMARY, OTHER_CHECKS, VERIFICATION } from "@/lib/verification";

// Checked guides that are not in the library, so the table can still name them.
const OTHER_NAMES: Record<string, string> = { hubspot: "HubSpot (live)" };

export const metadata = { title: "How we check guides | OAuth Ready" };

export default function Method() {
  return (
    <main className="page">
      <article className="prose">
        <h1>How we check guides</h1>
        <p>
          Setting up a provider OAuth app is usually quick. Getting it approved for every user is where developers lose weeks, and it is the part existing guides skip.
          So every guide here leads with a verdict on that path, and every claim says where it came from.
        </p>

        <h2>What each label means</h2>
        <table>
          <tbody>
            <tr><th>Tested</th><td>A person signed in to a real account and we saw the result in a hands-on test. Only claims we fully observed get this label. Dated in the guide&apos;s test log, with screenshots.</td></tr>
            <tr><th>Checked live</th><td>Live guides only. While writing the guide, the agent sent a GET request to the provider&apos;s public https endpoint, with no credentials. The server recorded the response, and the claim quotes it word for word. The requests are listed under Sources.</td></tr>
            <tr><th>Official docs</th><td>Stated on a provider documentation page that the agent or a person actually read. Linked inline.</td></tr>
            <tr><th>Community reports</th><td>Forums, GitHub issues, blogs, other vendors. Useful for things providers do not publish, such as real review times.</td></tr>
            <tr><th>Unverified</th><td>An estimate or inference, usually a time estimate. Plan with it, but confirm it.</td></tr>
          </tbody>
        </table>

        <h2 id="difficulty">How difficulty is set</h2>
        <p>
          Difficulty is the highest hurdle between &quot;works with your own account&quot; and &quot;any user can connect&quot;, for one use case. It is not a judgement call: the
          research records three facts and the app applies a rule. The rating is the highest level any factor reaches.
        </p>
        <table>
          <thead><tr><th>Level</th><th>Provider&apos;s gate</th><th>Hardest prerequisite</th><th>Longest provider wait</th></tr></thead>
          <tbody>
            <tr><th>Easy</th><td>None, or a self-serve switch</td><td>Just an account</td><td>None</td></tr>
            <tr><th>Moderate</th><td>Light verification (brand, publisher, sensitive-scope review)</td><td>Domain, privacy policy, business identity</td><td>Up to 2 weeks</td></tr>
            <tr><th>Hard</th><td>Formal app or marketplace review, or a security assessment</td><td>Paid audit, demo video, minimum install base</td><td>Over 2 weeks</td></tr>
            <tr><th>Gated</th><td>Provider can refuse at its discretion (partner programmes)</td><td>Partner status or business relationship</td><td>No published timeline</td></tr>
          </tbody>
        </table>
        <p>
          Two things are shown separately rather than folded into the rating: approval inside each customer&apos;s organisation (GitHub org owners, Microsoft tenant admins,
          Slack workspace admins), and limits that apply after approval. When a limit makes a use case unworkable, the guide rates the path that lifts it: reading Slack
          channel history at one request a minute is not a real product, so that use case is rated on the Marketplace path.
        </p>

        <h2>How effort is worked out</h2>
        <p>
          Difficulty is fixed; effort is personal. Each use case lists its to-dos with an hours range and, where the provider makes you wait, a waiting range. Effort is
          the sum of the hours still to do. Waiting assumes prerequisites run in parallel and reviews start once they are done. Ticking a to-do removes it; marking one
          as submitted keeps its wait and counts it down from the day you sent it.
        </p>
        <p>
          Many to-dos are the same across providers (a verified domain, a privacy policy, a registered business) or across one provider&apos;s apps (Google brand verification
          covers Gmail and Calendar). These are shared items in <a href="/company">your company profile</a>: done once, ticked everywhere. Items that expire, such as Google&apos;s
          annual CASA assessment, untick themselves when they lapse. In this prototype the profile is saved in your browser; in Composio it would sit at the organisation level.
        </p>

        <h2>How a guide is made</h2>
        <p><b>Library guides.</b> A research agent per provider reads the official docs and Composio&apos;s existing guide, then writes the guide to a fixed schema. A separate fact-checking agent, which never saw the research, then re-checks the key claims against the cited sources. For Composio, GitHub and Google we also ran the setup for real: a person signed in, and an agent drove the browser and took screenshots. Corrections are recorded below.</p>
        <p><b>Live guides.</b> When you ask for an app outside the library, an agent (Claude with web search and web fetch) researches it in real time with a budget of 8 searches and 6 page reads. If a Composio API key is configured, it first checks Composio&apos;s catalogue for whether a managed OAuth app exists. It can also make up to 4 live checks: GET requests to the provider&apos;s public https endpoints, with no credentials, such as an OAuth discovery document or an API that should refuse a request without a token. The server makes each request itself, refuses private addresses, and records the status and response text. A claim marked Checked live must cite one of those recorded requests and quote its response word for word; the server confirms the quote is really there.</p>
        <p>
          The guide must pass the same schema plus evidence rules: anything marked Official docs must cite a source the agent saw, and the agent can never mark anything Tested. A guide that fails is sent back once to be fixed. Claims that still have no valid source, or whose quote is not in the response, are downgraded to Unverified rather than shown as fact. Live guides are labelled as not yet reviewed.
        </p>

        <h2>What we checked</h2>
        <p>
          <b>First fact-check, {CHECK_SUMMARY.date}.</b> {CHECK_SUMMARY.method} {CHECK_SUMMARY.claims} claims: {CHECK_SUMMARY.confirmed} confirmed as written,{" "}
          {CHECK_SUMMARY.corrected} partly right and corrected, {CHECK_SUMMARY.contradicted} contradicted. The most common fault was not a wrong fact but a wrong label:
          an estimate or inference tagged as Official docs. Those are now labelled honestly, and a few confirmed claims also got citation or wording fixes.
        </p>
        <p>
          <b>Later checks.</b> The same kind of independent agent checked the Shopify guide, and the live HubSpot guide that ships as an example. The HubSpot guide
          needed the most fixes: it missed HubSpot&apos;s 25-install cap on unlisted apps, and three of its Checked live claims quoted text the stored response did not
          contain. That is why the server now verifies every quote. Live guides are first drafts; the labels and this check show where they need review.
        </p>
        <p>
          <b>Hands-on tests.</b> A person signed in to Composio, GitHub and Google Cloud, and an agent drove the browser and took screenshots. We created a GitHub OAuth
          app and connected it through a Composio custom auth config, and set up a Google OAuth client in Testing mode. Nothing was submitted for review. Only claims we
          fully observed carry the Tested label. Each guide&apos;s &quot;What we tested by hand&quot; section has the dated log and the screenshots.
        </p>
        <table>
          <thead><tr><th>Check</th><th>Date</th><th>Claims</th><th>Confirmed</th><th>Corrected</th><th>Could not verify</th></tr></thead>
          <tbody>
            <tr><td>Library guides, independent fact-check</td><td>{CHECK_SUMMARY.date}</td><td>{CHECK_SUMMARY.claims}</td><td>{CHECK_SUMMARY.confirmed}</td><td>{CHECK_SUMMARY.corrected}</td><td>0</td></tr>
            {OTHER_CHECKS.map((c) => (
              <tr key={c.name}><td>{c.name}</td><td>{c.date}</td><td>{c.claims}</td><td>{c.confirmed}</td><td>{c.corrected}</td><td>{c.couldNotVerify}</td></tr>
            ))}
          </tbody>
        </table>
        <p>The table below lists every correction from the first fact-check and the Shopify check, the main HubSpot corrections, every hands-on result, and a sample of confirmed claims.</p>
        {VERIFICATION.length === 0 ? <p>Spot-checks are in progress.</p> : (
          <table>
            <thead><tr><th>Guide</th><th>Claim</th><th>How we checked</th><th>Result</th></tr></thead>
            <tbody>
              {VERIFICATION.map((v, i) => (
                <tr key={i}><td><Link href={`/guides/${v.slug}`}>{CURATED.find((g) => g.slug === v.slug)?.name ?? OTHER_NAMES[v.slug] ?? v.slug}</Link></td><td>{v.claim}</td><td>{v.method}</td><td><b>{v.result}</b>{v.note ? `. ${v.note}` : ""}</td></tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Known limits</h2>
        <ul>
          <li>Eight library guides, not one hundred. The schema and the live agent are built to scale to the full list; the review step is the bottleneck, by design.</li>
          <li>We did not complete any provider review or verification. Review durations come from provider statements where published and from community reports otherwise.</li>
          <li>Hands-on tests covered Composio, GitHub and Google. Slack, Notion, Outlook, LinkedIn and Shopify were not tested by hand.</li>
          <li>Guides go stale. Each shows its last verified date; a production version would re-run the agent on a schedule and flag diffs for review.</li>
          <li>Live guides depend on what the agent can find in a few minutes, and two runs for the same app can differ. Treat them as a first draft with sources, not as a reviewed guide.</li>
        </ul>
      </article>
    </main>
  );
}
