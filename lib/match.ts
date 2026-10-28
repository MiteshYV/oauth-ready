import type { Guide } from "./types";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|io|so|ai|app|dev|co|net|org)(\/.*)?$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const domainOf = (url: string) => url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

// Finds a curated guide for a free-text query: name, slug, toolkit slug or website domain.
export function findGuide(query: string, guides: Guide[]): Guide | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const qSlug = slugify(q);
  const qDomain = domainOf(q);
  return guides.find((g) => {
    const names = [g.name.toLowerCase(), g.slug, g.composio?.toolkitSlug ?? "", slugify(g.name)];
    if (names.includes(q) || names.includes(qSlug)) return true;
    return Boolean(g.website) && qDomain.includes(".") && domainOf(g.website) === qDomain;
  });
}
