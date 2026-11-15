import assert from "node:assert/strict";
import { test } from "node:test";
import { authProvider } from "../src/auth";
import { createPiSerialRouter } from "../src/routes/pi-serial";
import { piBluetoothRuntime } from "../src/lib/pi-bluetooth";

test("host Bluetooth requires org authentication, stays disabled in GPIO mode, and scans only by POST", async (t) => {
  const previous = { host: process.env.PI_HOST, sorter: process.env.PI_SORTER };
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "0";
  t.after(() => {
    for (const [key, value] of [["PI_HOST", previous.host], ["PI_SORTER", previous.sorter]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  });
  t.mock.method(authProvider, "verifyToken", async () => ({ sub: "ble-user" }));
  t.mock.method(authProvider, "getUserRole", async () => "user");
  t.mock.method(authProvider, "resolveOrgMembership", async (_user: string, org: string) => org === "ble-org" ? { role: "member" } : null);
  const execute = t.mock.method(piBluetoothRuntime, "execute", async (action: string) => action === "capabilities" ? { supported: true, powered: true } : { devices: [{ id: "ble:AA:BB:CC:DD:EE:FF", label: "ESP32", builtin: false, busy: false }] });
  const router = createPiSerialRouter(() => async (c) => c.text("upgrade"));
  assert.equal((await router.request("/bluetooth")).status, 401);
  assert.equal((await router.request("/bluetooth/devices", { method: "POST" })).status, 401);
  assert.equal(execute.mock.callCount(), 0);
  const headers = { Authorization: "Bearer token", "X-Org-Id": "ble-org" };
  const capabilities = await router.request("/bluetooth", { headers });
  assert.deepEqual(await capabilities.json(), { supported: true, powered: true });
  assert.equal(execute.mock.callCount(), 1);
  const scan = await router.request("/bluetooth/devices", { method: "POST", headers });
  assert.equal(scan.status, 200);
  assert.equal((await scan.json()).devices[0].id, "ble:AA:BB:CC:DD:EE:FF");
  const count = execute.mock.callCount();
  process.env.PI_SORTER = "1";
  assert.equal((await router.request("/bluetooth", { headers })).status, 404);
  assert.equal((await router.request("/bluetooth/devices", { method: "POST", headers })).status, 404);
  assert.equal(execute.mock.callCount(), count);
  process.env.PI_SORTER = "0";
  execute.mock.mockImplementation(async () => ({ supported: true, powered: false }));
  assert.equal((await router.request("/bluetooth/devices", { method: "POST", headers })).status, 503);
  process.env.PI_HOST = "0";
  assert.equal((await router.request("/bluetooth", { headers })).status, 404);
});
