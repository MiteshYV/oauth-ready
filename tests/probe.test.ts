import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToText, httpProbe } from "../lib/probe.ts";

test("htmlToText strips script and style blocks and tags, and collapses whitespace", () => {
  assert.equal(htmlToText("<html><script>x()</script><p>Hello <b>world</b></p></html>"), "Hello world");
  assert.equal(htmlToText("<style>p { color: red }</style>\n\n<p>a \n  b</p>"), "a b");
});

test("hostile HTML is converted in linear time", () => {
  for (const html of ["<".repeat(30_000), "<a".repeat(15_000), "<script ".repeat(4_000)]) {
    const start = performance.now();
    htmlToText(html);
    const ms = performance.now() - start;
    assert.ok(ms < 500, `${html.slice(0, 10)}... took ${Math.round(ms)} ms`);
  }
});

test("non-https and non-public URLs are refused without any network call", async () => {
  const plain = await httpProbe("p1", "http://example.com");
  assert.equal(plain.status, 0);
  assert.match(plain.snippet, /^Refused: only https/);
  const local = await httpProbe("p2", "https://localhost/");
  assert.equal(local.status, 0);
  assert.match(local.snippet, /^Refused: that host/);
});

test("an unclosed trailing script or style block is dropped to the end", () => {
  assert.equal(htmlToText("<p>Kept</p><script>var token = 'x'; document.write('<b>"), "Kept");
  assert.equal(htmlToText("<p>Kept</p><STYLE>p { color: red }"), "Kept");
});
