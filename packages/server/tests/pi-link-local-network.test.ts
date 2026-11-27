import assert from "node:assert/strict";
import type { NetworkInterfaceInfo } from "node:os";
import { test } from "node:test";
import { isLocalNetworkAddress } from "../src/lib/pi-link-device/local-network";
import { piLinkLocalRouter } from "../src/routes/pi-link/local";

const boardInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
  wlan0: [
    {
      address: "192.168.1.204",
      netmask: "255.255.255.0",
      family: "IPv4",
      mac: "00:00:00:00:00:00",
      internal: false,
      cidr: "192.168.1.204/24",
    },
    {
      address: "2600:1702:7f2e:2210:1111:2222:3333:4444",
      netmask: "ffff:ffff:ffff:ffff::",
      family: "IPv6",
      mac: "00:00:00:00:00:00",
      internal: false,
      cidr: "2600:1702:7f2e:2210:1111:2222:3333:4444/64",
      scopeid: 0,
    },
  ],
};

test("a computer on the board's own public IPv6 network can read the link code", () => {
  assert.equal(isLocalNetworkAddress("2600:1702:7f2e:2210:f577:b71:8e72:358b", boardInterfaces), true);
});

test("private, loopback and mapped IPv4 addresses are local", () => {
  for (const address of ["192.168.1.133", "10.1.2.3", "127.0.0.1", "::1", "fe80::1%wlan0", "::ffff:192.168.1.133"])
    assert.equal(isLocalNetworkAddress(address, boardInterfaces), true, address);
});

test("addresses outside the board's networks are refused", () => {
  for (const address of ["2600:1702:7f2e:2211::1", "8.8.8.8", "100.64.1.2", "not-an-address", undefined])
    assert.equal(isLocalNetworkAddress(address, boardInterfaces), false, String(address));
});

test("interface prefixes too broad to mean one network are ignored", () => {
  const broad: NodeJS.Dict<NetworkInterfaceInfo[]> = {
    tun0: [
      {
        address: "2001:db8::1",
        netmask: "ffff::",
        family: "IPv6",
        mac: "00:00:00:00:00:00",
        internal: false,
        cidr: "2001:db8::1/16",
        scopeid: 0,
      },
    ],
  };
  assert.equal(isLocalNetworkAddress("2001:abcd::1", broad), false);
});

test("the link status route refuses a forwarded address from outside the network", async () => {
  const previous = process.env.PI_HOST;
  process.env.PI_HOST = "1";
  try {
    const refused = await piLinkLocalRouter.request("/", { headers: { "X-Real-IP": "8.8.8.8" } });
    assert.equal(refused.status, 403);
    const missing = await piLinkLocalRouter.request("/");
    assert.equal(missing.status, 403);
    const allowed = await piLinkLocalRouter.request("/", { headers: { "X-Real-IP": "192.168.1.133" } });
    assert.equal(allowed.status, 200);
    const body = (await allowed.json()) as { success: boolean; data: { appUrl: string } };
    assert.equal(body.success, true);
  } finally {
    if (previous === undefined) delete process.env.PI_HOST;
    else process.env.PI_HOST = previous;
  }
});
