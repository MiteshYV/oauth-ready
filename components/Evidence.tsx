import { EVIDENCE_HELP, EVIDENCE_LABEL, type Evidence as Ev, type Source } from "@/lib/types";

export function Evidence({ e, sources }: { e?: Ev; sources: Source[] }) {
  if (!e) return null;
  const refs = (e.sourceIds ?? []).filter((i) => sources[i]);
  return (
    <>
      <span className={`ev ev-${e.level}`} title={EVIDENCE_HELP[e.level]}>
        {EVIDENCE_LABEL[e.level]}
        {refs.map((i, n) => (
          <a key={`${n}-${i}`} href={sources[i].url} target="_blank" rel="noreferrer" title={sources[i].title}>[{i + 1}]</a>
        ))}
        {e.level === "checked" && (e.probeIds ?? []).map((id, n) => <span key={`${n}-${id}`} title="See Sources: checked live">[{id}]</span>)}
      </span>
      {e.note && <span className="ev-note">{e.note}</span>}
    </>
  );
}
