import assert from "node:assert/strict";
import { test } from "node:test";
import { isBlockedAddress, isPublicHost } from "../lib/netguard.ts";

test("private, loopback, link-local, metadata and mapped addresses are blocked", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "::127.0.0.1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "not-an-ip"]) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
});

test("public addresses are allowed", () => {
  for (const ip of ["8.8.8.8", "140.82.112.3", "2606:4700:4700::1111"]) assert.equal(isBlockedAddress(ip), false, ip);
});

test("hosts that are local by name are refused without a DNS lookup", async () => {
  for (const h of ["localhost", "api.localhost", "printer.local", "db.internal", "[::1]", "127.0.0.1"]) assert.equal(await isPublicHost(h), false, h);
});
