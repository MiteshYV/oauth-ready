export interface Check {
  slug: string;
  claim: string;
  method: string;
  result: "Confirmed" | "Corrected" | "Could not verify";
  note?: string;
}

// The first independent fact-check of the library. The later checks are summarised in OTHER_CHECKS.
export const CHECK_SUMMARY = {
  date: "27 Oct 2026",
  claims: 35,
  confirmed: 22,
  corrected: 13,
  contradicted: 0,
  method:
    "A separate fact-checking agent, which had not seen the research, re-checked the verdict-level claims (production milestone and top blockers) in the library guides of the time. It fetched each cited source and judged both the claim and its evidence label.",
};

export const OTHER_CHECKS = [
  { name: "Shopify guide, independent fact-check", date: "29 Oct 2026", claims: 22, confirmed: 17, corrected: 5, couldNotVerify: 0 },
  { name: "Live HubSpot guide, independent fact-check", date: "29 Oct 2026", claims: 29, confirmed: 11, corrected: 18, couldNotVerify: 0 },
  { name: "Hands-on tests in Composio, GitHub and Google", date: "29 Oct 2026", claims: 9, confirmed: 7, corrected: 1, couldNotVerify: 1 },
];

const SRC = "Independent agent re-read the cited source (27 Oct 2026 check)";
const SRC_SHOPIFY = "Independent agent re-read the cited source (29 Oct 2026 Shopify check)";
const SRC_LIVE = "Independent agent re-read the cited sources of a live-generated guide (29 Oct 2026)";
const HANDS_ON = "Hands-on test, 29 Oct 2026 (person signed in, agent drove the browser)";

export const VERIFICATION: Check[] = [
  { slug: "github", claim: "Composio's redirect URI is .../api/v3.1/toolkits/auth/callback", method: "GitHub research agent found no v3.1 path; we then counted URIs across docs.composio.dev", result: "Corrected", note: "No v3.1 path exists: Composio's docs show /api/v3/toolkits/auth/callback and /api/v1/auth-apps/add. Our v3.1 came from a Composio preview deployment. Fixed in all guides and in the live agent's instructions. The 29 Oct 2026 hands-on test then found the dashboard shows the v1 path (below)" },
  { slug: "gmail", claim: "Composio's default callback cannot pass Google's domain verification", method: SRC, result: "Corrected", note: "Downgraded from Official docs to Community reports: the domain rule is Google's, the conclusion about Composio is our inference" },
  { slug: "gmail", claim: "Production takes 1-7 days hands-on and 4-10 weeks waiting", method: SRC, result: "Corrected", note: "Individual review times are Google's; the totals are now labelled as our estimate. 'Any new scope means another review' softened to Google's 'may need reassessment'" },
  { slug: "gmail", claim: "CASA lab pricing and when CASA applies", method: SRC, result: "Corrected", note: "Prices attributed to a 2024 third-party table; CASA scoped to apps whose servers store or handle restricted data" },
  { slug: "gmail", claim: "Verification Center complaints, Jul-Oct 2026", method: SRC, result: "Corrected", note: "Threads actually span Sep 2025 to Oct 2026; 'silent for weeks' changed to 'stalled for 10+ days'" },
  { slug: "gmail", claim: "Gmail read/modify/compose/metadata scopes are restricted", method: SRC, result: "Confirmed" },
  { slug: "github", claim: "Production wait is 'hours to weeks' per customer org", method: SRC, result: "Corrected", note: "Mechanism is GitHub's; the duration is our estimate and now labelled so. Added the 15,000 req/hr Enterprise Cloud exception" },
  { slug: "github", claim: "New OAuth apps issue 8-hour tokens by default since 14 Aug 2026", method: SRC, result: "Confirmed", note: "Added: existing apps are not switched automatically" },
  { slug: "linkedin", claim: "r_member_social is a 'high-risk programme'", method: SRC, result: "Corrected", note: "LinkedIn's wording is a closed permission not accepting requests due to resource constraints" },
  { slug: "linkedin", claim: "Standard tier needs a narrated screencast", method: SRC, result: "Corrected", note: "A screen recording is required; narration is recommended" },
  { slug: "linkedin", claim: "Development tier limits (500 calls/app, 100/member/day)", method: SRC, result: "Confirmed" },
  { slug: "notion", claim: "'Selected workspaces' connections hit a Free-plan 1,000-block write limit", method: SRC, result: "Corrected", note: "Applies only to Free workspaces with more than one member, as a lifetime block limit" },
  { slug: "notion", claim: "Re-authorising invalidates older connections", method: SRC, result: "Corrected", note: "Not supported by Notion's docs; reframed as a possible duplicate-connection risk, labelled unverified" },
  { slug: "notion", claim: "No Notion review is needed for a public connection to work", method: SRC, result: "Confirmed" },
  { slug: "outlook", claim: "Every customer tenant needs admin consent", method: SRC, result: "Corrected", note: "Only tenants whose policy blocks mail scopes, which includes the Microsoft-managed default for new tenants" },
  { slug: "outlook", claim: "M365 Developer Program eligibility; solo developers need an Azure free account", method: SRC, result: "Corrected", note: "Added Premier/Unified Support customers; the Azure route is labelled as our recommendation" },
  { slug: "outlook", claim: "Client secrets last at most 24 months", method: SRC, result: "Confirmed" },
  { slug: "slack", claim: "Non-Marketplace apps throttled to 1 req/min on history reads", method: SRC, result: "Corrected", note: "The 50+/min figures apply to internal apps, not Marketplace apps; the conflict between Slack's two changelogs is now in the guide" },
  { slug: "slack", claim: "Marketplace needs 10 active workspaces, then up to 10 business days plus up to 10 weeks review", method: SRC, result: "Confirmed", note: "Slack says 'generally'; added" },
  { slug: "slack", claim: "Undistributed apps only install on their own workspace", method: SRC, result: "Corrected", note: "Claim is right but the cited page did not say it; re-cited to Slack's App distribution page" },
  { slug: "shopify", claim: "Named-store (custom distribution) use case needs no review and works for any merchant", method: SRC_SHOPIFY, result: "Corrected", note: "Added that each per-merchant app must be built for that merchant (cloning breaches the Partner Program Agreement) and that Level 2 customer fields in merchant-created apps need the Grow plan or higher" },
  { slug: "shopify", claim: "Draft public apps install only on your own development stores", method: SRC_SHOPIFY, result: "Corrected", note: "Review for unlisted apps is in Shopify's docs, but the development-store detail is only in community answers; the note now says so and cites a forum thread" },
  { slug: "shopify", claim: "Without review, every merchant needs its own app", method: SRC_SHOPIFY, result: "Corrected", note: "Added the Partner Program Agreement limit on cloning apps; the merchant-hands-you-credentials route is labelled our inference, since client credentials work only within one organisation" },
  { slug: "shopify", claim: "App Store review takes 2 weeks to 3 months", method: SRC_SHOPIFY, result: "Corrected", note: "Forum reports show a first look at 18 days to 1-1.5 months, not 3 months; the 7-60 day range is labelled our estimate" },
  { slug: "shopify", claim: "Who creates the OAuth app (public, custom, merchant-created)", method: SRC_SHOPIFY, result: "Corrected", note: "Public and custom parts are sourced; the merchant-created handover is labelled our inference, and the App developer role and Grow-plan rule were added" },
  { slug: "shopify", claim: "Protected customer data needs Shopify approval for public apps", method: SRC_SHOPIFY, result: "Confirmed" },
  { slug: "shopify", claim: "Expiring offline tokens: required for new public apps from 1 Apr 2026 and all public apps by 1 Jan 2027, HTTP 403 from 1 Apr 2027", method: SRC_SHOPIFY, result: "Confirmed" },
  { slug: "shopify", claim: "Composio has no managed Shopify OAuth app", method: SRC_SHOPIFY, result: "Confirmed", note: "Added that Composio's FAQ says a managed app may return; re-check" },
  { slug: "shopify", claim: "read_orders returns only the last 60 days without read_all_orders", method: SRC_SHOPIFY, result: "Confirmed", note: "Added that Dev Dashboard apps under a merchant organisation do not need the approval" },
  { slug: "hubspot", claim: "Production is open to any customer with no review", method: SRC_LIVE, result: "Corrected", note: "An unlisted app can be installed in at most 25 non-test accounts after the Acceptable Use Policy is signed; beyond that a Marketplace listing, which means manual review, is required" },
  { slug: "hubspot", claim: "Top blockers omit any install cap on unlisted apps", method: SRC_LIVE, result: "Corrected", note: "Added as the first blocker: until listed, only 25 non-test accounts can install the app" },
  { slug: "hubspot", claim: "CRM use cases are self-serve with no limit and no review gate", method: SRC_LIVE, result: "Corrected", note: "Gate stays none but the use cases are now labelled up to 25 customer accounts, with the unverified-app warning and the cap stated" },
  { slug: "hubspot", claim: "Installer permissions were 'checked live' against the OAuth page", method: SRC_LIVE, result: "Corrected", note: "The probe snippet does not contain the permission text; relabelled as Official docs and re-cited to the working-with-OAuth page" },
  { slug: "hubspot", claim: "Listing review takes 14 to 84 days", method: SRC_LIVE, result: "Corrected", note: "HubSpot states 10 business days (about 14 calendar days) plus at most 60 days after feedback, so the range is now 14 to 74 days" },
  { slug: "hubspot", claim: "Certification needs 'reportedly' six months listed", method: SRC_LIVE, result: "Corrected", note: "The certification requirements page states 60 active unaffiliated installs, a verified domain and at least six months listed; 'reportedly' dropped" },
  { slug: "hubspot", claim: "Rate limit is about 100-110 requests per 10 seconds, Search about 4 per second", method: SRC_LIVE, result: "Corrected", note: "Usage guidelines say 110 per 10 seconds per installing account for marketplace OAuth apps; the CRM Search API allows 5 per second. Upgraded from community reports to Official docs" },
  { slug: "hubspot", claim: "Alternatives include the Marketing and CMS Hub APIs", method: SRC_LIVE, result: "Corrected", note: "Those APIs use the same OAuth app so they are not alternatives; replaced with a privately distributed app (up to 10 allowlisted accounts)" },
  { slug: "hubspot", claim: "Listing review: 10 business days initial, up to 60 days from feedback, one app at a time", method: SRC_LIVE, result: "Confirmed" },
  { slug: "hubspot", claim: "A single app ID and minimal scopes are required for one use case", method: SRC_LIVE, result: "Confirmed" },
  { slug: "hubspot", claim: "The developer creates one OAuth app that every customer installs", method: SRC_LIVE, result: "Confirmed" },
  { slug: "github", claim: "Composio's redirect URI is .../api/v3/toolkits/auth/callback (v1 /api/v1/auth-apps/add is older)", method: HANDS_ON, result: "Corrected", note: "The dashboard shows /api/v1/auth-apps/add, not the v3 path our guides called current. Every guide and the live agent now say to copy the dashboard value and mention both paths" },
  { slug: "github", claim: "New OAuth apps have 'Expire user access tokens' on by default", method: HANDS_ON, result: "Confirmed" },
  { slug: "github", claim: "OAuth apps accept up to 10 redirect URIs", method: HANDS_ON, result: "Confirmed", note: "Plus a new per-URI 'Allow wildcard matching' option, now in the guide" },
  { slug: "github", claim: "A GitHub OAuth app connects through a Composio custom auth config", method: HANDS_ON, result: "Confirmed", note: "Connected account Active, about 10 minutes hands-on" },
  { slug: "gmail", claim: "gmail.readonly, gmail.compose and gmail.metadata are restricted; gmail.send is sensitive", method: HANDS_ON, result: "Confirmed", note: "Google's Data Access page also classed calendar.events as sensitive" },
  { slug: "gmail", claim: "Unverified apps are capped at 100 users", method: HANDS_ON, result: "Confirmed", note: "Counted over the app's lifetime, so removing test users does not free places" },
  { slug: "gmail", claim: "Unverified apps show the redirect domain, not the app name", method: HANDS_ON, result: "Confirmed", note: "Shown as composio.dev on a 403 for a non-test user" },
  { slug: "gmail", claim: "Google client secrets are shown once", method: HANDS_ON, result: "Confirmed" },
  { slug: "gmail", claim: "Listed test users see a click-through unverified-app warning", method: HANDS_ON, result: "Could not verify", note: "Adding a test user failed silently twice, so no listed test user could try. An account not on the list was blocked with Error 403 access_denied" },
];
