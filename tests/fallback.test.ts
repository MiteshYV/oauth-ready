import assert from "node:assert/strict";
import { test } from "node:test";
import { afterFallback } from "../lib/fallback.ts";

const fb = { type: "fallback", from: { model: "a" }, to: { model: "b" } };

test("with no fallback block everything is echoed and every tool_use is live", () => {
  const content = [{ type: "thinking" }, { type: "text" }, { type: "tool_use", id: "t1" }];
  const { echo, live } = afterFallback(content);
  assert.deepEqual(echo, content);
  assert.deepEqual(live, [{ type: "tool_use", id: "t1" }]);
});

test("model-internal blocks and unpaired server tool calls before the last fallback are not echoed", () => {
  const content = [
    { type: "thinking" },
    { type: "redacted_thinking" },
    { type: "text" },
    { type: "server_tool_use", id: "s1" },
    { type: "web_search_tool_result", tool_use_id: "s1" },
    { type: "server_tool_use", id: "s2" },
    { type: "tool_use", id: "t1" },
    fb,
    { type: "thinking" },
    { type: "server_tool_use", id: "s3" },
    { type: "tool_use", id: "t2" },
  ];
  const { echo, live } = afterFallback(content);
  assert.deepEqual(echo.map((b) => b.type), ["text", "server_tool_use", "web_search_tool_result", "fallback", "thinking", "server_tool_use", "tool_use"]);
  assert.deepEqual(echo[1], { type: "server_tool_use", id: "s1" });
  assert.deepEqual(live, [{ type: "tool_use", id: "t2" }]);
});

test("only the last fallback block is the boundary", () => {
  const content = [{ type: "tool_use", id: "t1" }, fb, { type: "tool_use", id: "t2" }, fb, { type: "text" }];
  const { echo, live } = afterFallback(content);
  assert.deepEqual(echo.map((b) => b.type), ["fallback", "fallback", "text"]);
  assert.deepEqual(live, []);
});
