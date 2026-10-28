export type EvidenceLevel = "tested" | "checked" | "sourced" | "reported" | "unverified";
export type Owner = "agent" | "agent_assist" | "you" | "provider";
export type MilestoneId = "test" | "production" | "listing";
export type Difficulty = "Easy" | "Moderate" | "Hard" | "Gated";

export interface Evidence {
  level: EvidenceLevel;
  sourceIds?: number[];
  probeIds?: string[];
  note?: string;
}

export interface Milestone {
  id: MilestoneId;
  label: string;
  activeEffort: string;
  calendarWait: string;
  approvalRequired: boolean;
  approvalName?: string;
  whatYouGet?: string;
  limits?: string;
  notes?: string;
  evidence?: Evidence;
}

export interface Item {
  title: string;
  detail: string;
  evidence: Evidence;
}

export interface Step {
  milestone: MilestoneId;
  title: string;
  detail: string;
  owner: Owner;
  agentHelp?: string;
  estTime?: string;
  url?: string;
  evidence: Evidence;
}

export interface Source {
  title: string;
  url: string;
  type: "official" | "community" | "composio" | "test";
  accessed?: string;
}

export interface Probe {
  id: string;
  url: string;
  status: number; // 0 when no response
  finalUrl?: string;
  contentType?: string;
  snippet: string;
  at: string;
}

export interface Guide {
  slug: string;
  name: string;
  website: string;
  category?: string;
  summary: string;
  lastVerified: string;
  origin: "curated" | "live";
  verdict: {
    difficulty: Difficulty;
    difficultyReason: string;
    milestones: Milestone[];
    topBlockers: Item[];
  };
  composio: {
    toolkitSlug?: string;
    managedAuth?: "yes" | "no" | "unknown";
    meanwhile?: string;
    redirectUriNote?: string;
    evidence?: Evidence;
  };
  prerequisites: { item: string; detail?: string; owner: Owner; evidence: Evidence }[];
  steps: Step[];
  nuances: Item[];
  whenStuck: { symptom: string; fix: string; evidence: Evidence }[];
  openQuestions: string[];
  sources: Source[];
  testLog?: { date?: string; action?: string; result?: string }[];
  probes?: Probe[];
  interpretation?: Interpretation;
  defaultUseCase: string;
  useCases: UseCase[];
  todos: Todo[];
  generatedAt?: string;
  generatedQuery?: string;
}

export interface Interpretation {
  covers: string;
  alternatives?: string[];
}

export interface NoOAuthGuide {
  slug: string;
  name: string;
  website: string;
  category?: string;
  summary: string;
  lastVerified: string;
  origin: "curated" | "live";
  interpretation?: Interpretation;
  noOAuth: { method: "api_key" | "basic" | "other" | "not_found"; howUsersConnect: string; evidence: Evidence };
  nuances: Item[];
  whenStuck?: { symptom: string; fix: string; evidence: Evidence }[];
  openQuestions: string[];
  sources: Source[];
  probes?: Probe[];
  generatedAt?: string;
  generatedQuery?: string;
}

export type AnyGuide = Guide | NoOAuthGuide;
export const isNoOAuth = (g: AnyGuide): g is NoOAuthGuide => "noOAuth" in g;

export const OWNER_LABEL: Record<Owner, string> = {
  agent: "Agent can do this",
  agent_assist: "Agent drafts, you submit",
  you: "You do this",
  provider: "Waiting on provider",
};

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  tested: "Tested",
  checked: "Checked live",
  sourced: "Official docs",
  reported: "Community reports",
  unverified: "Unverified",
};

export const EVIDENCE_HELP: Record<EvidenceLevel, string> = {
  tested: "We did this ourselves and saw the result.",
  checked: "The agent sent a real request to the provider today and the response shows this. No account was used.",
  sourced: "Stated in the provider's official documentation.",
  reported: "From forums, blogs or other developers. Plausible, not official.",
  unverified: "Our estimate or inference. Check before you rely on it.",
};

export const MILESTONE_LABEL: Record<MilestoneId, string> = {
  test: "Works with your own account",
  production: "Open to any user",
  listing: "Listed in the marketplace",
};

export type Gate = "none" | "light_review" | "formal_review" | "security_assessment" | "discretionary" | "not_available";
export type Tier = "basic" | "paperwork" | "costly" | "relationship";
export type Range = [number, number];

export interface UseCase {
  id: string;
  label: string;
  summary: string;
  scopes: string[];
  gate: Gate;
  gateName?: string;
  todoIds: string[];
  customerApproval: { likelihood: "none" | "sometimes" | "usually"; who?: string; detail?: string };
  notAvailableReason?: string;
  evidence: Evidence;
}

export interface Todo {
  id: string;
  sharedId?: string;
  title: string;
  detail?: string;
  owner: Owner;
  kind: "prereq" | "task" | "review";
  tier?: Tier;
  hours?: Range;
  waitDays?: Range;
  waitBasis?: "official" | "reported" | "estimate";
  optional?: boolean;
  blocking?: boolean;
  agentHelp?: string;
  url?: string;
  evidence: Evidence;
}

export interface VocabItem {
  id: string;
  level: "company" | "provider";
  provider?: string;
  label: string;
  tier: Tier;
  hours?: Range;
  waitDays?: Range;
  expiresMonths?: number;
  blocking?: boolean;
  accelerator?: boolean;
  fasterWith?: { id: string; hours?: Range; waitDays?: Range };
  valueLabel?: string;
  valuePlaceholder?: string;
  check?: "url" | "dns";
  note?: string;
}

export type ItemStatus = "not_started" | "submitted" | "done";
export interface ItemState { status: ItemStatus; date?: string; value?: string; check?: { ok: boolean; at: string; detail: string } }
export interface ReadinessState {
  company: Record<string, ItemState>;
  guides: Record<string, Record<string, ItemState>>;
}
