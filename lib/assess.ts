import { daysBetween } from "./format";
import { VOCAB_BY_ID } from "./vocabulary";
import type { Difficulty, Gate, Guide, ItemState, Range, ReadinessState, Tier, Todo, UseCase } from "./types";

// ---------------------------------------------------------------------------
// The difficulty rule
// Difficulty is the highest hurdle between "works for me" and "any user can
// connect", for one use case. It is the highest level reached by three factors:
//   1. the provider's gate, 2. the hardest required prerequisite,
//   3. the longest single provider wait.
// It does not depend on what the developer already has; effort does.
// ---------------------------------------------------------------------------

export const LEVELS: Difficulty[] = ["Easy", "Moderate", "Hard", "Gated"];
const GATE_LEVEL: Record<Gate, Difficulty | null> = {
  none: "Easy",
  light_review: "Moderate",
  formal_review: "Hard",
  security_assessment: "Hard",
  discretionary: "Gated",
  not_available: null,
};
const TIER_LEVEL: Record<Tier, Difficulty> = { basic: "Easy", paperwork: "Moderate", costly: "Hard", relationship: "Gated" };
export const WAIT_HARD_DAYS = 14;
const waitLevel = (days: number): Difficulty => (days <= 0 ? "Easy" : days <= WAIT_HARD_DAYS ? "Moderate" : "Hard");
const maxLevel = (a: Difficulty, b: Difficulty) => (LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b);

export const GATE_LABEL: Record<Gate, string> = {
  none: "No provider review",
  light_review: "Light verification",
  formal_review: "Formal review",
  security_assessment: "Security assessment",
  discretionary: "Provider can refuse",
  not_available: "Not offered to developers",
};

export interface ResolvedTodo extends Todo {
  tier: Tier;
  hoursR?: Range; // after any accelerator
  waitR?: Range;
  level: "company" | "provider" | "integration";
  provider?: string;
  label: string;
  state: ItemState & { expired?: boolean };
  accelerated?: string; // label of the item that made this faster
  remainingHours: Range;
  remainingWait: Range;
}

export interface Assessment {
  useCase: UseCase;
  available: boolean;
  difficulty: Difficulty | "Not available";
  drivers: string[]; // why it is this difficult
  todos: ResolvedTodo[];
  typical: { hours: Range; wait: Range; waitUnknown: boolean };
  forYou: { hours: Range; wait: Range; waitUnknown: boolean };
  personalised: boolean; // at least one item is done or submitted
  blockers: ResolvedTodo[]; // hard prerequisites not yet in place
  doneCount: number;
  requiredCount: number;
}

const EMPTY: ReadinessState = { company: {}, guides: {} };

function stateFor(t: Todo, slug: string, s: ReadinessState): ItemState & { expired?: boolean } {
  const st = (t.sharedId ? s.company[t.sharedId] : s.guides[slug]?.[t.id]) ?? { status: "not_started" as const };
  const months = t.sharedId ? VOCAB_BY_ID.get(t.sharedId)?.expiresMonths : undefined;
  if (st.status === "done" && months && st.date && daysBetween(st.date) > months * 30.4) return { ...st, status: "not_started", expired: true };
  return st;
}

export function resolveTodo(t: Todo, slug: string, s: ReadinessState): ResolvedTodo {
  const v = t.sharedId ? VOCAB_BY_ID.get(t.sharedId) : undefined;
  let hoursR = v ? v.hours : t.hours;
  let waitR = v ? v.waitDays : t.waitDays;
  let accelerated: string | undefined;
  if (v?.fasterWith && s.company[v.fasterWith.id]?.status === "done") {
    hoursR = v.fasterWith.hours ?? hoursR;
    waitR = v.fasterWith.waitDays ?? waitR;
    accelerated = VOCAB_BY_ID.get(v.fasterWith.id)?.label;
  }
  const state = stateFor(t, slug, s);
  const zero: Range = [0, 0];
  let remainingHours: Range = hoursR ?? zero;
  let remainingWait: Range = waitR ?? zero;
  if (state.status === "done") {
    remainingHours = zero;
    remainingWait = zero;
  } else if (state.status === "submitted") {
    const gone = state.date ? daysBetween(state.date) : 0;
    remainingHours = zero;
    remainingWait = [Math.max(0, (waitR?.[0] ?? 0) - gone), Math.max(0, (waitR?.[1] ?? 0) - gone)];
  }
  return {
    ...t,
    tier: v?.tier ?? t.tier ?? "basic",
    blocking: t.blocking ?? v?.blocking,
    hoursR,
    waitR,
    level: v ? v.level : "integration",
    provider: v?.provider,
    label: t.title || v?.label || t.id,
    state,
    accelerated,
    remainingHours,
    remainingWait,
  };
}

function totals(todos: ResolvedTodo[], pick: (t: ResolvedTodo) => { h: Range; w: Range; open: boolean }) {
  let h: Range = [0, 0];
  let prereqWait: Range = [0, 0];
  let reviewWait: Range = [0, 0];
  let waitUnknown = false;
  for (const t of todos) {
    if (t.optional) continue;
    const { h: hh, w, open } = pick(t);
    h = [h[0] + hh[0], h[1] + hh[1]];
    if (t.kind === "review") {
      reviewWait = [reviewWait[0] + w[0], reviewWait[1] + w[1]];
      if (open && !t.waitR) waitUnknown = true;
    } else {
      // Prerequisites and tasks can run in parallel, so only the longest wait counts.
      prereqWait = [Math.max(prereqWait[0], w[0]), Math.max(prereqWait[1], w[1])];
    }
  }
  return { hours: h, wait: [prereqWait[0] + reviewWait[0], prereqWait[1] + reviewWait[1]] as Range, waitUnknown };
}

export function assess(g: Guide, useCaseId?: string, s: ReadinessState = EMPTY): Assessment {
  const useCase = g.useCases.find((u) => u.id === useCaseId) ?? g.useCases.find((u) => u.id === g.defaultUseCase) ?? g.useCases[0];
  const byId = new Map(g.todos.map((t) => [t.id, t]));
  const todos = useCase.todoIds.map((id) => byId.get(id)).filter((t): t is Todo => Boolean(t)).map((t) => resolveTodo(t, g.slug, s));
  const typicalTodos = useCase.todoIds.map((id) => byId.get(id)).filter((t): t is Todo => Boolean(t)).map((t) => resolveTodo(t, g.slug, EMPTY));

  const typical = totals(typicalTodos, (t) => ({ h: t.hoursR ?? [0, 0], w: t.waitR ?? [0, 0], open: true }));
  const forYou = totals(todos, (t) => ({ h: t.remainingHours, w: t.remainingWait, open: t.state.status !== "done" }));

  // Difficulty: fixed per use case, computed from the typical path.
  const drivers: string[] = [];
  let difficulty: Difficulty | "Not available";
  if (useCase.gate === "not_available") {
    difficulty = "Not available";
    drivers.push(useCase.notAvailableReason ?? "Not offered to developers");
  } else {
    let level = GATE_LEVEL[useCase.gate]!;
    const gateDriver = `${useCase.gateName ?? GATE_LABEL[useCase.gate]}`;
    let tierLevel: Difficulty = "Easy";
    let tierDriver = "";
    for (const t of typicalTodos) {
      if (t.optional) continue;
      const l = TIER_LEVEL[t.tier];
      if (LEVELS.indexOf(l) > LEVELS.indexOf(tierLevel)) { tierLevel = l; tierDriver = t.label; }
    }
    // Only waits on the provider count here (reviews and shared verifications), not your own testing time.
    const longest = Math.max(0, ...typicalTodos.filter((t) => !t.optional && (t.kind === "review" || t.sharedId)).map((t) => t.waitR?.[1] ?? 0));
    const wl = waitLevel(longest);
    const final = maxLevel(maxLevel(level, tierLevel), wl);
    if (GATE_LEVEL[useCase.gate] === final) drivers.push(gateDriver);
    if (tierLevel === final && tierDriver) drivers.push(tierDriver);
    if (wl === final && longest > 0) drivers.push(`a provider wait of up to ${longest > 13 ? Math.round(longest / 7) + " weeks" : Math.round(longest) + " days"}`);
    if (!drivers.length) drivers.push(gateDriver);
    level = final;
    difficulty = level;
  }

  const required = todos.filter((t) => !t.optional);
  return {
    useCase,
    available: useCase.gate !== "not_available",
    difficulty,
    drivers,
    todos,
    typical,
    forYou,
    personalised: todos.some((t) => t.state.status !== "not_started"),
    blockers: todos.filter((t) => t.blocking && t.state.status !== "done" && !t.optional),
    doneCount: required.filter((t) => t.state.status === "done").length,
    requiredCount: required.length,
  };
}

// Every guide that uses a shared item, for "used by" labels.
export function sharedUsage(guides: Guide[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const g of guides) for (const t of g.todos ?? []) if (t.sharedId) {
    const list = m.get(t.sharedId) ?? [];
    if (!list.includes(g.name)) list.push(g.name);
    m.set(t.sharedId, list);
  }
  return m;
}
