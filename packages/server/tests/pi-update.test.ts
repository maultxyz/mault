import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
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
} from "../src/lib/pi-update";
const INSTALLED_VERSION = "1.0.209";
import { getStatus, resetState } from "../src/lib/sync-job/state";
import { piUpdateRouter } from "../src/routes/pi-update";

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "mault-update-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  t.mock.method(piUpdateRuntime, "stateDir", () => directory);
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

test("host update runs independently, rejects duplicates and persists its result", async (t) => {
  const directory = await fixture(t);
  const calls: { program: string; args: string[] }[] = [];
  t.mock.method(
    piUpdateRuntime,
    "run",
    async (program: string, args: string[]) => {
      calls.push({ program, args });
      return { stdout: "", stderr: "" };
    },
  );
  const state = await startPiUpdate();
  assert.equal(state.phase, "running");
  const launch = calls.find((call) => call.program === "systemd-run")!;
  assert.deepEqual(launch.args, [
    "--user",
    "--collect",
    "--unit=mault-update",
    "/bin/bash",
    "/installation/mault/scripts/pi/run-update.sh",
  ]);
  assert.deepEqual(await readPiUpdateState(), state);
  await assert.rejects(startPiUpdate(), /already running/);
  assert.equal(
    calls.filter((call) => call.program === "systemd-run").length,
    1,
  );
  await writeFile(
    join(directory, "update.json"),
    JSON.stringify({ ...state, phase: "succeeded" }),
  );
  assert.equal((await readPiUpdateState()).phase, "succeeded");
});

test("failed job launch is recorded instead of leaving an update running", async (t) => {
  await fixture(t);
  t.mock.method(piUpdateRuntime, "run", async (program: string) => {
    if (program === "systemd-run") throw new Error("No user bus");
    return { stdout: "", stderr: "" };
  });
  await assert.rejects(startPiUpdate(), /No user bus/);
  assert.equal((await readPiUpdateState()).phase, "failed");
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

test("a stale running result after a stopped updater becomes a persisted failure", async (t) => {
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
    "failed",
  );
});

for (const [version, available] of [
  ["1.0.170", false],
  ["1.0.99", false],
  [INSTALLED_VERSION, false],
  [`${INSTALLED_VERSION}-dev.1`, false],
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
