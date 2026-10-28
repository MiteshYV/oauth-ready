"use client";
import { useSyncExternalStore } from "react";
import type { ItemState, ItemStatus, ReadinessState } from "./types";

// The readiness profile. In Composio this would live at the organisation level;
// in this prototype it is saved in the viewer's browser so anyone can test it.
const KEY = "oauth-ready:profile:v2";
const EMPTY: ReadinessState = { company: {}, guides: {} };
let current: ReadinessState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: keep the profile in memory only */
  }
}

function commit(next: ReadinessState) {
  current = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* in-memory only */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    try { current = e.newValue ? JSON.parse(e.newValue) : EMPTY; } catch { current = EMPTY; }
    listeners.forEach((x) => x());
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export function useReadiness(): ReadinessState {
  return useSyncExternalStore(subscribe, () => { load(); return current; }, () => EMPTY);
}

const today = () => new Date().toISOString();

export function setItem(scope: { sharedId?: string; slug?: string; todoId?: string }, patch: Partial<ItemState>) {
  load();
  const prevOf = (s?: ItemState): ItemState => s ?? { status: "not_started" };
  if (scope.sharedId) {
    const prev = prevOf(current.company[scope.sharedId]);
    commit({ ...current, company: { ...current.company, [scope.sharedId]: { ...prev, ...patch } } });
  } else if (scope.slug && scope.todoId) {
    const g = current.guides[scope.slug] ?? {};
    const prev = prevOf(g[scope.todoId]);
    commit({ ...current, guides: { ...current.guides, [scope.slug]: { ...g, [scope.todoId]: { ...prev, ...patch } } } });
  }
}

export function setStatus(scope: { sharedId?: string; slug?: string; todoId?: string }, status: ItemStatus) {
  setItem(scope, { status, date: status === "not_started" ? undefined : today() });
}

export function resetProfile() {
  load();
  commit(EMPTY);
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// A plausible early-stage company that has already shipped Gmail-style Google work.
export function loadSampleCompany() {
  load();
  commit({
    company: {
      company_domain: { status: "done", date: daysAgo(400), value: "example.com" },
      business_email: { status: "done", date: daysAgo(400) },
      homepage: { status: "done", date: daysAgo(300), value: "https://example.com" },
      privacy_policy: { status: "done", date: daysAgo(120), value: "https://example.com/privacy" },
      terms_of_service: { status: "done", date: daysAgo(120), value: "https://example.com/terms" },
      support_contact: { status: "done", date: daysAgo(300), value: "support@example.com" },
      app_logo: { status: "done", date: daysAgo(200) },
      registered_business: { status: "done", date: daysAgo(500), value: "Sample Agents Ltd" },
      google_cloud_project: { status: "done", date: daysAgo(60) },
      google_domain_verified: { status: "done", date: daysAgo(40) },
      google_brand_verified: { status: "submitted", date: daysAgo(2) },
      github_org: { status: "done", date: daysAgo(500) },
      slack_dev_workspace: { status: "done", date: daysAgo(500) },
    },
    guides: {},
  });
}
