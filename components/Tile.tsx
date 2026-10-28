// Neutral letter tile in place of provider logos.
export function Tile({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`tile ${large ? "tile-lg" : ""}`} aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>;
}

export function DiffPill({ d }: { d: string }) {
  return <span className={`pill pill-${d.replace(" ", "")}`}><span className="dot" />{d}</span>;
}

export const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
