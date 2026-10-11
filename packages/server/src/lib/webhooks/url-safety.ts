import { WEBHOOK_URL_MAX_LENGTH } from "@magic-vault/shared";
import type { LookupAddress, LookupAllOptions, LookupOptions } from "node:dns";
import { lookup as dnsLookup } from "node:dns";
import { BlockList, isIP } from "node:net";
import {
  WEBHOOK_BLOCKED_IPV4_SUBNETS,
  WEBHOOK_BLOCKED_IPV6_SUBNETS,
} from "../constants/webhooks";

let blockList: BlockList | null = null;

function blockedAddresses(): BlockList {
  if (blockList) return blockList;
  blockList = new BlockList();
  for (const [address, prefix] of WEBHOOK_BLOCKED_IPV4_SUBNETS) {
    blockList.addSubnet(address, prefix, "ipv4");
  }
  for (const [address, prefix] of WEBHOOK_BLOCKED_IPV6_SUBNETS) {
    blockList.addSubnet(address, prefix, "ipv6");
  }
  return blockList;
}

export function isInsecureWebhookUrlAllowed(): boolean {
  return process.env.WEBHOOK_ALLOW_INSECURE_URLS === "true";
}

export function isBlockedAddress(address: string): boolean {
  const mapped = address.toLowerCase().startsWith("::ffff:")
    ? address.slice(7)
    : address;
  const family = isIP(mapped);
  if (family === 0) return true;
  return blockedAddresses().check(mapped, family === 6 ? "ipv6" : "ipv4");
}

export function webhookHostname(url: URL): string {
  return url.hostname.replace(/^\[(.*)\]$/, "$1");
}

export function parseWebhookUrl(value: string): URL | null {
  if (value.length > WEBHOOK_URL_MAX_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const allowedProtocols = isInsecureWebhookUrlAllowed()
    ? ["https:", "http:"]
    : ["https:"];
  if (!allowedProtocols.includes(url.protocol)) return null;
  if (url.username || url.password) return null;
  const hostname = webhookHostname(url);
  if (!isInsecureWebhookUrlAllowed()) {
    if (isIP(hostname) && isBlockedAddress(hostname)) return null;
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return null;
    }
  }
  return url;
}

export function safeLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
): void {
  dnsLookup(
    hostname,
    { ...options, all: true } as LookupAllOptions,
    (err, addresses) => {
      if (err) return callback(err, []);
      if (
        !isInsecureWebhookUrlAllowed() &&
        addresses.some((entry) => isBlockedAddress(entry.address))
      ) {
        const blocked: NodeJS.ErrnoException = new Error(
          `Refusing to deliver to a private address for ${hostname}.`,
        );
        blocked.code = "EWEBHOOKBLOCKED";
        return callback(blocked, []);
      }
      if (options.all) return callback(null, addresses);
      const [first] = addresses;
      if (!first) return callback(new Error(`No address for ${hostname}.`), []);
      callback(null, first.address, first.family);
    },
  );
}
