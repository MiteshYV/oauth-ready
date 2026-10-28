import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

// Addresses a server-side request must never reach: this machine, its network, cloud metadata, and IPv4 hidden inside IPv6.
// Node already checks ::ffff:a.b.c.d against the IPv4 rules, so no blanket ::ffff:0:0/96 entry: it would match every IPv4 address too.
const blocked = new BlockList();
for (const [net, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3]] as const) blocked.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [["::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const) blocked.addSubnet(net, bits, "ipv6");

export function isBlockedAddress(ip: string): boolean {
  const v = isIP(ip);
  return v === 0 || blocked.check(ip, v === 4 ? "ipv4" : "ipv6");
}

// ponytail: checks DNS once, then fetch resolves again (a rebinding window). Fine for a locally run demo; pin the resolved address if this is ever hosted.
export async function isPublicHost(host: string): Promise<boolean> {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h || h === "localhost" || /\.(localhost|local|internal)$/.test(h)) return false;
  if (isIP(h)) return !isBlockedAddress(h);
  try {
    const addrs = await lookup(h, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isBlockedAddress(a.address));
  } catch {
    return false;
  }
}
