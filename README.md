# OAuth Ready

How long until your users can connect an app to your AI agent?

OAuth Ready gives developers a guide for getting a provider OAuth app set up **and approved**. Each guide covers the effort, the waiting time, the blockers, and which steps an agent can do for them. It has a library of eight researched guides, plus a live agent that writes a guide for any other app while you watch.

Walkthrough: _link added on submission_

Repository: <https://github.com/MiteshYV/oauth-ready>

Built for the Composio APM Integrations take-home.

## Run it

You need Node 22.18 or later.

```sh
npm install
cp .env.example .env.local
```

Add your `ANTHROPIC_API_KEY` to `.env.local`. Then:

```sh
npm run dev
```

Open <http://localhost:3000>.

The library, company profile and method page work without a key. A live guide takes 1 to 4 minutes and costs about $0.15 to $0.55 on your key, typically about $0.40.

| Variable | What it does |
|---|---|
| `ANTHROPIC_MODEL` | Optional. Overrides the model. Default `claude-sonnet-5-5`. It must support adaptive thinking and web search. |
| `COMPOSIO_API_KEY` | Optional. Lets the live agent ask Composio's API whether the toolkit has a Composio-managed OAuth app, so that fact is sourced, not guessed. It must be a **Platform project key**: in the Composio dashboard, switch to the Platform view, then Project Settings, then API Keys. Keys starting `ck_` belong to the consumer "For you" view and the Platform API rejects them (401). Without a valid key, the guide says managed auth is "unknown". |

Other scripts: `npm test` runs the unit tests. `npm run validate` checks every library guide against the schema and every cited source. `node scripts/build-index.mjs` rebuilds the library index after you add a guide.

## If live generation fails

The app shows one of these messages. Restart the app after changing `.env.local`.

| Message | What to do |
|---|---|
| Live generation needs ANTHROPIC_API_KEY | Add the key to `.env.local` and restart. |
| Your ANTHROPIC_API_KEY was rejected | The key is wrong or revoked. Create a new one. |
| The model "…" is not available to this API key | Set `ANTHROPIC_MODEL` to a model your key can use, with adaptive thinking and web search. |
| This API key is not allowed to use that model or feature | Check what the key's workspace may use in the Claude Console. |
| Your Anthropic account hit a rate limit | Wait a minute and try again. |
| Your Anthropic account has no credit | Add credit in the Claude Console under Billing. |
| Web search or web fetch is switched off for your Anthropic organisation | An organisation admin can switch them on at the [Capabilities page](https://platform.claude.com/settings/capabilities). Domain restrictions there can also block research. |
| The model declined to research this request | Try the app's website address instead of its name. |

## What to try

1. **Use cases change the verdict.** Open Gmail. "Read or manage mail" is Hard. Switch to "Send email only" and it drops to Moderate.
2. **Shared work counts once.** Load a sample company in Company profile, then open Google Calendar.
3. **Evidence you can inspect.** Open GitHub, then "What we tested by hand" and "Sources".
4. **A live guide.** Click New guide and enter an app outside the library, such as Zoom. A finished example ships at `/guides/hubspot`.
5. **How we check.** `/method` has the label definitions, difficulty rule and fact-check results.

The library is also JSON at `/api/guides`, and each guide at `/api/guides/<slug>`.

## The problem, as I understood it

A Composio developer can prototype on Composio's managed OAuth apps with no setup. At go-live they need their **own** app: for their name on the consent screen, for scopes or rate limits the defaults lack, or because the toolkit has no managed app. Many have none: 258 OAuth toolkits are bring-your-own against 124 managed (checked 28 Oct 2026).

So the problem lands at go-live, when a six-week review turns up. Composio's roughly 46 setup guides stop once a test connection works. They don't say whether production takes an hour or a month, or what blocks approval. That is the gap this fills.

## Why these eight apps

Each app shows a different way the path gets hard. Difficulty is for the default use case.

| App | Default use case | Gate | Difficulty | What it shows |
|---|---|---|---|---|
| GitHub | Private repos | None | Easy | Customer org owners may need to approve. |
| Notion | Read and write pages | None | Easy | Control case. Users pick pages at runtime. |
| LinkedIn | Sign in and post | None | Easy | One provider spans every level, up to unavailable. |
| Google Calendar | Read and create events | Light verification | Moderate | Shares brand verification with Gmail. |
| Outlook | Read and manage mail | Publisher verification | Moderate | Most work tenants need an admin to approve. |
| Gmail | Read or manage mail | CASA assessment | Hard | "Send email only" is Moderate. |
| Slack | Read channels and reply | Marketplace review | Hard | Outside it, history reads get 1 request a minute. |
| Shopify | Read orders and customers | App Store review | Hard | Per-store apps are built per merchant. |

## What we learned

- **"Works for me" is not "works for my users."** A test connection took 10 minutes. Opening to any user is where the weeks go.
- **Approval is not the end.** Customer admin approval is a second wait, and caps such as Google's 100 users or HubSpot's 25 installs change the plan.
- **Docs disagree and drift.** The dashboard's redirect URI differed from the docs.
- **Most fact-check faults were labels, not facts.** Inferences had been labelled Official docs.
- **Live guides vary run to run.** The shipped HubSpot run missed a cap the first found.

## Key decisions

1. **Difficulty depends on the use case, by rule.** It is the highest of the provider's gate, the hardest prerequisite and the longest wait, applied by code to library and live guides alike.
2. **Effort is personal; difficulty is fixed.** Tick what you have done and the effort updates. Shared items live in a company profile (browser-saved here, organisation-level in Composio).
3. **Verdict first, then milestones.** Difficulty, effort, wait and blockers lead. "Works with your account" and "Open to any user" each get an estimate.
4. **Every step has an owner:** agent, agent drafts and you submit, you, or the provider. "Copy brief for your coding agent" turns agent steps into a task.
5. **Every claim has an evidence label:** Tested, Checked live, Official docs, Community reports or Unverified. Tested is strict: a person signed in and saw it (6 claims). Checked live needs a server-recorded probe and a quote the server verifies, or it is downgraded.
6. **One schema for curated and live guides.** "No OAuth app needed" is a valid answer for API-key apps, and ambiguous names (Zoom) are stated, not guessed.
7. **Shareable and embeddable.** Each guide has a link, Markdown and JSON. In Composio it could be a content layer beside Create Auth Config.

## How agents are used

| Where | What the agent does | Guardrails |
|---|---|---|
| Library research | One agent per provider reads official docs and writes to the schema. | Official docs claims must cite fetched pages. |
| Independent fact-check | A separate agent re-checks key claims against sources. | Corrections are logged on `/method`. |
| Hands-on tests | An agent drives a browser while a person is signed in. | Nothing is submitted. Only fully observed claims are Tested. |
| Live generation | Claude Sonnet with web search and fetch researches an unfamiliar app. | 8 searches, 6 page reads, schema and evidence rules, one repair pass. |
| Live checks | `http_probe` makes up to 4 requests to a provider during generation. | GET, https, public hosts, no credentials. Quotes verified. |

## What was tested, sourced or uncertain

Evidence labels across the library (411 claims):

| Label | Claims |
|---|---|
| Official docs | 340 |
| Community reports | 38 |
| Unverified | 27 |
| Tested | 6 |
| Checked live | 0 (live guides only) |

Independent fact-checks: library guides 22 of 35 claims confirmed, 13 corrected, 0 contradicted (27 Oct). Shopify 17 of 22 (29 Oct). Live HubSpot guide 11 of 29, which led to the verified-quote rule (29 Oct).

Hands-on results, 29 Oct:

- Composio's dashboard gives a v1 redirect URI, not the v3 path our guides called current. Corrected.
- GitHub expires user tokens by default. Our own GitHub OAuth app connected through a Composio custom auth config in about 10 minutes.
- Google's 100-user cap is lifetime, and the client secret is shown once.
- An unlisted Google user gets 403 access_denied, naming "composio.dev".
- We could not test the warning a listed test user sees.

Detail is on `/method`.

## Limitations

- **Eight guides, not one hundred.** Review is the bottleneck, deliberately.
- **No provider approvals were completed,** and hands-on tests cover only Composio, GitHub and Google. Review durations are labelled by source.
- **Live guides vary run to run,** are labelled not reviewed, and are saved only in `data/generated/` on your machine.
- **The company profile is per browser,** hours per to-do are estimates, and guides go stale. A production version would re-run the agent on a schedule.
- **Built for local use, not hosting.** Before hosting: `/api/check` follows redirects, the address guard has a DNS-rebinding window, and there are no rate limits or spend caps.

## Project layout

```text
data/guide.schema.json      Guide format, shared by library and live agent
data/guides/*.json          Library guides
data/generated/             Live guides (hubspot.json ships as an example)
lib/                        assess (difficulty rule), agent, prompt, evidence, probe, netguard
components/                 GuideView, RouteBar
app/api/                    generate (streams progress), guides (library as JSON)
public/tests/               Hands-on test screenshots
tests/                      Unit tests (node --test)
```

## Credits

Product framing, scope and flows: Mitesh. Research, code and verification were carried out by AI agents (Claude) under that direction, as the brief encourages.
