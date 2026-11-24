import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { authProvider } from "../src/auth";
import {
  getPiUpdateStatus,
  piUpdateRuntime,
  readPiUpdateState,
  startPiUpdate,
  checkPiUpdateVersion,
  kernelChangedSinceBoot,
} from "../src/lib/pi-update";
const INSTALLED_VERSION = "1.0.209";
import { getStatus, resetState } from "../src/lib/sync-job/state";
import { piUpdateRouter } from "../src/routes/pi-update";
import { PI_UPDATE_CHECK_MS } from "../src/lib/constants/pi-update";
import { PiControllerPort } from "../src/lib/pi-controller-port";
import { claimSorterPort, releaseSorterPort, piSerialRuntime } from "../src/lib/pi-serial-port";
import { acquireLock, releaseLock } from "../src/lib/scan-lock";
import { db } from "../src/db";

class FakeSorterPort extends EventEmitter {
  isOpen = true;
  write() {}
  close() { this.isOpen = false; }
}

async function gpioViewer(t: TestContext) {
  const previous = { host: process.env.PI_HOST, sorter: process.env.PI_SORTER, socket: process.env.PI_CONTROLLER_SOCKET };
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "1";
  process.env.PI_CONTROLLER_SOCKET = "/tmp/fake-mault-controller.sock";
  t.mock.method(PiControllerPort, "open", async () => new FakeSorterPort());
  t.after(() => {
    releaseSorterPort("bridge");
    for (const [key, value] of [["PI_HOST", previous.host], ["PI_SORTER", previous.sorter], ["PI_CONTROLLER_SOCKET", previous.socket]]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  });
  return claimSorterPort("bridge", { controllerId: "gpio" });
}

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "mault-update-"));
  t.after(async () => {
    await rm(join(directory, "requests/update-request"), { force: true });
    await writeFile(join(directory, "update.json"), JSON.stringify({
      phase: "failed", startedAt: Date.now() + 1000, message: null,
    }));
    await readPiUpdateState();
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(join(directory, "requests"));
  t.mock.method(piUpdateRuntime, "stateDir", () => directory);
  t.mock.method(piUpdateRuntime, "rootUpdaterInstalled", () => true);
  t.mock.method(piUpdateRuntime, "root", () => "/installation/mault");
  t.mock.method(piUpdateRuntime, "readInstalledRelease", async () => ({
    version: INSTALLED_VERSION,
    manifestUrl: "https://example.test/pi-latest/manifest.json",
  }));
  return directory;
}

function latestRelease(t: TestContext, version: unknown) {
  const requested: string[] = [];
  t.mock.method(
    piUpdateRuntime,
    "fetchReleaseManifest",
    async (manifestUrl: string) => {
      requested.push(manifestUrl);
      return { version, bundle: "mault-pi-arm64.tar.gz", sha256: "unused" };
    },
  );
  return requested;
}

test("host updater is disabled outside Pi hosting and requires platform admin", async (t) => {
  const previous = process.env.PI_HOST;
  t.after(() => {
    if (previous === undefined) delete process.env.PI_HOST;
    else process.env.PI_HOST = previous;
  });
  process.env.PI_HOST = "0";
  assert.equal((await piUpdateRouter.request("/")).status, 404);
  process.env.PI_HOST = "1";
  assert.equal(
    (await piUpdateRouter.request("/", { method: "POST" })).status,
    401,
  );
  t.mock.method(authProvider, "verifyToken", async () => ({ sub: "member" }));
  t.mock.method(authProvider, "getUserRole", async () => "user");
  assert.equal(
    (
      await piUpdateRouter.request("/", {
        method: "POST",
        headers: { Authorization: "Bearer member-token" },
      })
    ).status,
    403,
  );
});

test("host updater refuses active database sync", async (t) => {
  await fixture(t);
  const previous = getStatus();
  t.after(() => resetState(previous));
  resetState({ ...previous, status: "running" });
  await assert.rejects(startPiUpdate(), /stop database syncing/);
});

test("host updates release idle GPIO viewers and resume them after a failed request", async (t) => {
  const directory = await fixture(t);
  const viewer = await gpioViewer(t);
  await startPiUpdate();
  assert.equal(viewer.isOpen, false);
  await assert.rejects(claimSorterPort("bridge", { controllerId: "gpio" }), /busy/);
  const later = Date.now() + 60_000;
  t.mock.method(Date, "now", () => later);
  t.mock.method(piUpdateRuntime, "run", async () => { throw new Error("inactive"); });
  const state = await readPiUpdateState();
  assert.equal(state.phase, "failed");
  const reconnected = await claimSorterPort("bridge", { controllerId: "gpio" });
  assert.equal(reconnected.isOpen, true);
});

for (const phase of ["succeeded", "failed"] as const) {
  test(`GPIO reconnects after the root updater reports ${phase}`, async (t) => {
    const directory = await fixture(t);
    await gpioViewer(t);
    const state = await startPiUpdate();
    await rm(join(directory, "requests/update-request"));
    await writeFile(join(directory, "update.json"), JSON.stringify({ ...state, phase }));
    assert.equal((await readPiUpdateState()).phase, phase);
    assert.equal((await claimSorterPort("bridge", { controllerId: "gpio" })).isOpen, true);
  });
}

test("an older status poll cannot release a newer GPIO update reservation", async (t) => {
  const directory = await fixture(t);
  await gpioViewer(t);
  await writeFile(join(directory, "update.json"), JSON.stringify({
    phase: "running", startedAt: Date.now() - 60_000, message: null,
  }));
  let finishOldPoll!: () => void;
  let notifyPolling!: () => void;
  const polling = new Promise<void>((resolve) => { notifyPolling = resolve; });
  let calls = 0;
  t.mock.method(piUpdateRuntime, "run", async () => {
    if (calls++ === 0) {
      notifyPolling();
      await new Promise<void>((resolve) => { finishOldPoll = resolve; });
    }
    throw new Error("inactive");
  });
  const oldPoll = readPiUpdateState();
  await polling;
  await startPiUpdate();
  finishOldPoll();
  assert.equal((await oldPoll).phase, "failed");
  await assert.rejects(claimSorterPort("bridge", { controllerId: "gpio" }), /busy/);
});

test("a failed request write releases the GPIO update reservation", async (t) => {
  const directory = await fixture(t);
  const viewer = await gpioViewer(t);
  await rm(join(directory, "requests"), { recursive: true });
  await assert.rejects(startPiUpdate(), /ENOENT/);
  assert.equal(viewer.isOpen, false);
  const reconnected = await claimSorterPort("bridge", { controllerId: "gpio" });
  assert.equal(reconnected.isOpen, true);
});

test("active GPIO commands still prevent an update", async (t) => {
  const directory = await fixture(t);
  const viewer = await gpioViewer(t);
  viewer.write('{"test":true,"seq":1}\n');
  await assert.rejects(startPiUpdate(), /disconnect the sorter/);
  assert.equal(viewer.isOpen, true);
  await assert.rejects(stat(join(directory, "requests/update-request")));
});

test("active scan locks still prevent an update with idle GPIO viewers", async (t) => {
  await fixture(t);
  const viewer = await gpioViewer(t);
  t.mock.method(db, "update", () => ({ set: () => ({ where: async () => [] }) }));
  acquireLock("update-test-collection", "update-test-user", "update-test-org", "Test");
  t.after(() => releaseLock("update-test-collection", "update-test-user"));
  await assert.rejects(startPiUpdate(), /Finish scanning/);
  assert.equal(viewer.isOpen, true);
});

test("USB sorter connections still prevent an update", async (t) => {
  await fixture(t);
  const previous = process.env.PI_SORTER;
  process.env.PI_SORTER = "0";
  t.after(() => {
    releaseSorterPort("bridge");
    if (previous === undefined) delete process.env.PI_SORTER;
    else process.env.PI_SORTER = previous;
  });
  t.mock.method(piSerialRuntime, "list", async () => [{ path: "/dev/ttyACM904" }]);
  t.mock.method(piSerialRuntime, "open", async () => new FakeSorterPort());
  const viewer = await claimSorterPort("bridge", { controllerId: "/dev/ttyACM904" });
  await assert.rejects(startPiUpdate(), /disconnect the sorter/);
  assert.equal(viewer.isOpen, true);
});

test("host update only drops a request for the root updater and rejects duplicates", async (t) => {
  const directory = await fixture(t);
  const calls: string[] = [];
  t.mock.method(piUpdateRuntime, "run", async (program: string) => {
    calls.push(program);
    return { stdout: "", stderr: "" };
  });
  const state = await startPiUpdate();
  assert.equal(state.phase, "running");
  const request = join(directory, "requests/update-request");
  assert.ok((await stat(request)).isFile());
  assert.deepEqual(calls, []);
  assert.equal((await readPiUpdateState()).phase, "running");
  await assert.rejects(startPiUpdate(), /already running/);
  await rm(request);
  await writeFile(
    join(directory, "update.json"),
    JSON.stringify({ ...state, phase: "succeeded" }),
  );
  assert.equal((await readPiUpdateState()).phase, "succeeded");
});

test("in-app updates ask for a one-time reinstall before the root updater exists", async (t) => {
  const directory = await fixture(t);
  t.mock.method(piUpdateRuntime, "rootUpdaterInstalled", () => false);
  await assert.rejects(
    startPiUpdate(),
    /curl -fsSL https:\/\/example\.test\/pi-latest\/install\.sh \| sudo bash/,
  );
  await assert.rejects(stat(join(directory, "requests/update-request")));
});

test("a request the root updater never picks up fails and is withdrawn", async (t) => {
  const directory = await fixture(t);
  const request = join(directory, "requests/update-request");
  await writeFile(request, "");
  const longAgo = new Date(Date.now() - 60_000);
  await utimes(request, longAgo, longAgo);
  t.mock.method(piUpdateRuntime, "run", async (program: string) => {
    if (program === "systemctl") throw new Error("inactive");
    return { stdout: "", stderr: "" };
  });
  const state = await readPiUpdateState();
  assert.equal(state.phase, "failed");
  assert.match(state.message ?? "", /sudo mault update/);
  await assert.rejects(stat(request));
});

test("availability checks read the release manifest of the installed release", async (t) => {
  await fixture(t);
  const requested = latestRelease(t, "99.0.0");
  t.mock.method(piUpdateRuntime, "run", async () => ({
    stdout: "",
    stderr: "",
  }));
  const status = await getPiUpdateStatus();
  assert.equal(status.available, true);
  assert.equal(status.installedVersion, INSTALLED_VERSION);
  assert.equal(status.latestVersion, "99.0.0");
  assert.deepEqual(requested, ["https://example.test/pi-latest/manifest.json"]);
});

test("a stale running result after a stopped updater reads as failed", async (t) => {
  const directory = await fixture(t);
  await writeFile(
    join(directory, "update.json"),
    JSON.stringify({
      phase: "running",
      startedAt: Date.now() - 60_000,
      message: null,
    }),
  );
  t.mock.method(piUpdateRuntime, "run", async (program: string) => {
    if (program === "systemctl") throw new Error("inactive");
    return { stdout: "", stderr: "" };
  });
  assert.equal((await getPiUpdateStatus()).state.phase, "failed");
  assert.equal(
    JSON.parse(await readFile(join(directory, "update.json"), "utf8")).phase,
    "running",
  );
});

for (const [version, available] of [
  ["1.0.170", true],
  ["1.0.99", true],
  [INSTALLED_VERSION, false],
  [`${INSTALLED_VERSION}-dev.1`, true],
  ["1.0.210-dev.1", true],
  ["99.0.0-dev.test", true],
  ["99.0.0", true],
] as const) {
  test(`release version ${version} ${available ? "offers" : "does not offer"} an update`, async (t) => {
    await fixture(t);
    latestRelease(t, version);
    const status = await checkPiUpdateVersion();
    assert.equal(status.available, available);
    assert.equal(status.latestVersion, version);
  });
}

test("an invalid release version fails the update check", async (t) => {
  await fixture(t);
  latestRelease(t, "unknown");
  await assert.rejects(checkPiUpdateVersion(), /no valid app version/);
});

test("a dev install compares dev builds by run number", async (t) => {
  t.mock.method(piUpdateRuntime, "root", () => "/installation/mault");
  t.mock.method(piUpdateRuntime, "readInstalledRelease", async () => ({
    version: "1.0.209-dev.5",
    manifestUrl: "https://example.test/pi-dev/manifest.json",
  }));
  latestRelease(t, "1.0.209-dev.6");
  const status = await checkPiUpdateVersion();
  assert.equal(status.available, true);
  assert.equal(status.installedVersion, "1.0.209-dev.5");
});

test("a checkout without a release file reports that it cannot update", async (t) => {
  t.mock.method(piUpdateRuntime, "root", () => "/no/such/installation");
  await assert.rejects(checkPiUpdateVersion(), /not installed from a release/);
});

const BOOTED_AT = 1_000_000;

test("a kernel installed after boot or a removed running kernel needs a reboot", () => {
  const running = { name: "6.6.51+rpt-rpi-v8", installedAt: BOOTED_AT - 5_000 };
  assert.equal(kernelChangedSinceBoot(running.name, [running], BOOTED_AT), false);
  assert.equal(
    kernelChangedSinceBoot(
      running.name,
      [running, { name: "6.6.62+rpt-rpi-v8", installedAt: BOOTED_AT - 1 }],
      BOOTED_AT,
    ),
    false,
  );
  assert.equal(
    kernelChangedSinceBoot(
      running.name,
      [running, { name: "6.6.62+rpt-rpi-v8", installedAt: BOOTED_AT + 60_000 }],
      BOOTED_AT,
    ),
    true,
  );
  assert.equal(
    kernelChangedSinceBoot(
      running.name,
      [{ name: "6.6.62+rpt-rpi-v8", installedAt: BOOTED_AT - 1 }],
      BOOTED_AT,
    ),
    true,
  );
  assert.equal(kernelChangedSinceBoot(running.name, [], BOOTED_AT), false);
});

test("the update status reports a pending reboot with the boot it applies to", async (t) => {
  await fixture(t);
  latestRelease(t, INSTALLED_VERSION);
  t.mock.method(piUpdateRuntime, "run", async () => ({ stdout: "", stderr: "" }));
  t.mock.method(piUpdateRuntime, "runningKernel", () => "6.6.51+rpt-rpi-v8");
  t.mock.method(piUpdateRuntime, "installedKernels", () => [
    { name: "6.6.51+rpt-rpi-v8", installedAt: 0 },
  ]);
  t.mock.method(piUpdateRuntime, "bootedAt", () => BOOTED_AT);
  t.mock.method(piUpdateRuntime, "bootId", () => "boot-1");
  const reboot = t.mock.method(piUpdateRuntime, "rebootRequiredFileExists", () => false);
  let status = await getPiUpdateStatus();
  assert.equal(status.rebootRequired, false);
  assert.equal(status.bootId, "boot-1");
  reboot.mock.mockImplementation(() => true);
  status = await getPiUpdateStatus();
  assert.equal(status.rebootRequired, true);
});

test("the reboot notice survives a failed release check", async (t) => {
  await fixture(t);
  const now = Date.now();
  t.mock.method(Date, "now", () => now + PI_UPDATE_CHECK_MS * 10);
  t.mock.method(piUpdateRuntime, "fetchReleaseManifest", async () => {
    throw new Error("offline");
  });
  t.mock.method(piUpdateRuntime, "run", async () => ({ stdout: "", stderr: "" }));
  t.mock.method(piUpdateRuntime, "rebootRequiredFileExists", () => true);
  t.mock.method(piUpdateRuntime, "bootId", () => "boot-2");
  const status = await getPiUpdateStatus();
  assert.equal(status.rebootRequired, true);
  assert.equal(status.bootId, "boot-2");
});
