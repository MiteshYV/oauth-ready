// Our own mark: a short route from "works for me" (open dot) to "works for everyone" (filled dot).
export function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="16" height="8" viewBox="0 0 22 10">
        <circle cx="3" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line x1="6" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="11.5" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.6" strokeDasharray="1.6 1.4" />
        <circle cx="19" cy="5" r="2.4" fill="currentColor" />
      </svg>
    </span>
  );
}
