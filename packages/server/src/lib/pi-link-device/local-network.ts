import { BlockList, isIP } from "node:net";
import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";
import {
  PI_LINK_LOCAL_MIN_INTERFACE_PREFIX,
  PI_LINK_LOCAL_TRUSTED_SUBNETS,
} from "../constants/pi-hosts";

function normalizedAddress(address: string): string {
  const withoutZone = address.trim().split("%")[0];
  const mappedIpv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(withoutZone);
  return mappedIpv4 ? mappedIpv4[1] : withoutZone;
}

function addressType(address: string): "ipv4" | "ipv6" | null {
  const version = isIP(address);
  return version === 4 ? "ipv4" : version === 6 ? "ipv6" : null;
}

function localNetworkBlockList(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
): BlockList {
  const list = new BlockList();
  for (const subnet of PI_LINK_LOCAL_TRUSTED_SUBNETS) {
    list.addSubnet(subnet.network, subnet.prefix, subnet.type);
  }
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (!entry.cidr) continue;
      const [network, prefixText] = entry.cidr.split("/");
      const type = addressType(normalizedAddress(network));
      const prefix = Number(prefixText);
      if (!type || prefix < PI_LINK_LOCAL_MIN_INTERFACE_PREFIX[type]) continue;
      list.addSubnet(normalizedAddress(network), prefix, type);
    }
  }
  return list;
}

export function isLoopbackAddress(address: string): boolean {
  const normalized = normalizedAddress(address);
  return normalized === "::1" || normalized.startsWith("127.");
}

export function isLocalNetworkAddress(
  address: string | undefined,
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces(),
): boolean {
  if (!address) return false;
  const normalized = normalizedAddress(address);
  const type = addressType(normalized);
  if (!type) return false;
  return localNetworkBlockList(interfaces).check(normalized, type);
}
