"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Mark";
import { useReadiness } from "@/lib/profile";

const TABS = [
  { href: "/", label: "Guides", match: (p: string) => p === "/" || p.startsWith("/guides") || p.startsWith("/generate") },
  { href: "/company", label: "Company profile", match: (p: string) => p.startsWith("/company") },
  { href: "/method", label: "How we check", match: (p: string) => p.startsWith("/method") },
];

export function TopBar() {
  const path = usePathname() ?? "/";
  const profile = useReadiness();
  const org = profile.company.registered_business?.value || profile.company.company_domain?.value || "Your company";
  return (
    <header className="shell-bar">
      <div className="shell-top">
        <div className="crumb">
          <Link href="/" className="brand"><Mark />OAuth Ready</Link>
          <span className="sep">/</span>
          <Link href="/company" className="org" title="Your company profile">{org}<span className="chev">⌄</span></Link>
          <span className="proto-note hide-sm">Prototype</span>
        </div>
        <div className="top-actions">
          <a href="/api/guides" className="btn-outline hide-sm" target="_blank" rel="noreferrer">JSON API</a>
          <Link href="/method" className="btn-outline">Help</Link>
        </div>
      </div>
      <nav className="shell-tabs" aria-label="Sections">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={t.match(path) ? "on" : ""} aria-current={t.match(path) ? "page" : undefined}>{t.label}</Link>
        ))}
      </nav>
    </header>
  );
}
