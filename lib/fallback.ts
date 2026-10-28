// Type-only on purpose, so node --test can load it without the SDK.
type Block = { type: string; id?: string; tool_use_id?: string };

const DROPPED = new Set(["thinking", "redacted_thinking", "tool_use"]);

// After a mid-output fallback, the model that declined left blocks the next request must not echo: its thinking,
// its tool calls, and any server tool call it made without a result. Only tool calls after the last fallback block are live.
export function afterFallback<B extends Block>(content: B[]): { echo: B[]; live: B[] } {
  const cut = content.findLastIndex((b) => b.type === "fallback");
  const answered = new Set(content.map((b) => b.tool_use_id).filter(Boolean));
  const echo = content.filter((b, i) => i > cut || !(DROPPED.has(b.type) || (b.type === "server_tool_use" && !answered.has(b.id))));
  return { echo, live: content.slice(cut + 1).filter((b) => b.type === "tool_use") };
}
