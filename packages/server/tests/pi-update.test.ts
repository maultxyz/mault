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
import pkg from "../package.json";
import { getStatus, resetState } from "../src/lib/sync-job/state";
import { piUpdateRouter } from "../src/routes/pi-update";

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "mault-update-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  t.mock.method(piUpdateRuntime, "stateDir", () => directory);
  t.mock.method(piUpdateRuntime, "root", () => "/installation/mault");
  return directory;
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

test("host updater refuses local changes before launching anything", async (t) => {
  await fixture(t);
  let launches = 0;
  t.mock.method(piUpdateRuntime, "run", async (program: string) => {
    if (program === "systemd-run") launches++;
    return { stdout: " M README.md", stderr: "" };
  });
  await assert.rejects(startPiUpdate(), /Local files have changed/);
  assert.equal(launches, 0);
  assert.equal((await readPiUpdateState()).phase, "idle");
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

test("availability checks use the tracking remote and only offer a fast-forward", async (t) => {
  await fixture(t);
  const calls: string[][] = [];
  t.mock.method(
    piUpdateRuntime,
    "run",
    async (_program: string, args: string[]) => {
      calls.push(args);
      const stdout =
        args[0] === "branch"
          ? "master"
          : args[0] === "config"
            ? "origin"
            : args[0] === "show"
              ? JSON.stringify({ version: "99.0.0" })
              : "";
      return { stdout, stderr: "" };
    },
  );
  const status = await getPiUpdateStatus();
  assert.equal(status.available, true);
  assert.equal(status.installedVersion, pkg.version);
  assert.equal(status.latestVersion, "99.0.0");
  assert.ok(calls.some((args) => args.join(" ") === "fetch -- origin"));
  assert.ok(
    calls.some(
      (args) => args.join(" ") === "merge-base --is-ancestor HEAD @{upstream}",
    ),
  );
});

test("different upstream commits with the same app version do not offer an update", async (t) => {
  await fixture(t);
  t.mock.method(
    piUpdateRuntime,
    "run",
    async (_program: string, args: string[]) => ({
      stdout:
        args[0] === "branch"
          ? "master"
          : args[0] === "config"
            ? "origin"
            : args[0] === "show"
              ? JSON.stringify({ version: pkg.version })
              : "",
      stderr: "",
    }),
  );
  const status = await checkPiUpdateVersion();
  assert.equal(status.available, false);
  assert.equal(status.installedVersion, pkg.version);
  assert.equal(status.latestVersion, pkg.version);
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
