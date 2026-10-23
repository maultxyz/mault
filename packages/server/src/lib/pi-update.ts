import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import type { PiUpdateState, PiUpdateStatus } from "@magic-vault/shared";
import pkg from "../../package.json";
import {
  PI_UPDATE_CHECK_MS,
  PI_UPDATE_COMMAND_TIMEOUT_MS,
  PI_UPDATE_MAX_BUFFER,
  PI_UPDATE_STATE_FILE,
  PI_UPDATE_UNIT,
  PI_UPDATE_LAUNCH_GRACE_MS,
} from "./constants/pi-update";
import type { PiUpdateCheck } from "./interfaces/pi-update";
import { getActiveScanLockStats } from "./scan-lock";
import { sorterPortOwner } from "./pi-serial-port";
import { getStatus as syncStatus } from "./sync-job/state";

export const piUpdateRuntime = {
  root() {
    let directory = process.cwd();
    while (!existsSync(join(directory, "scripts/pi/update.sh"))) {
      const parent = dirname(directory);
      if (parent === directory)
        throw new Error("The Linux updater is not installed.");
      directory = parent;
    }
    return directory;
  },
  stateDir: () =>
    join(
      process.env.XDG_STATE_HOME || join(homedir(), ".local/state"),
      "mault",
    ),
  run: promisify(execFile),
};

let cachedCheck: PiUpdateCheck | null = null;
let checkedAt = 0;
let checking: Promise<PiUpdateCheck> | null = null;
let launching = false;

async function command(program: string, args: string[]): Promise<string> {
  const result = await piUpdateRuntime.run(program, args, {
    cwd: piUpdateRuntime.root(),
    timeout: PI_UPDATE_COMMAND_TIMEOUT_MS,
    maxBuffer: PI_UPDATE_MAX_BUFFER,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return String(result.stdout).trim();
}

export async function readPiUpdateState(): Promise<PiUpdateState> {
  try {
    return JSON.parse(
      await readFile(
        join(piUpdateRuntime.stateDir(), PI_UPDATE_STATE_FILE),
        "utf8",
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { phase: "idle", startedAt: null, message: null };
  }
}

async function writeState(state: PiUpdateState) {
  const directory = piUpdateRuntime.stateDir();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, PI_UPDATE_STATE_FILE);
  await writeFile(`${file}.tmp`, JSON.stringify(state), { mode: 0o600 });
  await rename(`${file}.tmp`, file);
}

export async function piUpdateRunning(): Promise<boolean> {
  return launching || (await readPiUpdateState()).phase === "running";
}

export async function checkPiUpdateVersion(
  fetchRemote = true,
): Promise<PiUpdateCheck> {
  const branch = await command("git", ["branch", "--show-current"]);
  if (!branch)
    throw new Error("Check out the installed branch before updating.");
  const remote = await command("git", [
    "config",
    "--get",
    `branch.${branch}.remote`,
  ]);
  if (fetchRemote) await command("git", ["fetch", "--", remote]);
  const installedVersion = pkg.version;
  const latestPackage = JSON.parse(
    await command("git", ["show", "@{upstream}:packages/server/package.json"]),
  );
  const latestVersion = latestPackage.version;
  if (typeof latestVersion !== "string" || latestVersion.length === 0) {
    throw new Error("The tracking branch has no app version.");
  }
  await command("git", ["merge-base", "--is-ancestor", "HEAD", "@{upstream}"]);
  return {
    installedVersion,
    latestVersion,
    available: installedVersion !== latestVersion,
  };
}

export async function getPiUpdateStatus(): Promise<PiUpdateStatus> {
  let state = await readPiUpdateState();
  if (
    state.phase === "running" &&
    Date.now() - (state.startedAt ?? 0) > PI_UPDATE_LAUNCH_GRACE_MS
  ) {
    try {
      await command("systemctl", [
        "--user",
        "is-active",
        "--quiet",
        `${PI_UPDATE_UNIT}.service`,
      ]);
    } catch {
      state = {
        ...state,
        phase: "failed",
        message:
          "The updater stopped before completion. Check the Linux update log.",
      };
      await writeState(state);
    }
  }
  if (
    state.phase !== "running" &&
    (!cachedCheck || Date.now() - checkedAt > PI_UPDATE_CHECK_MS)
  ) {
    if (!checking) {
      checking = checkPiUpdateVersion(
        cachedCheck !== null || state.phase === "idle",
      )
        .then((value) => {
          cachedCheck = value;
          checkedAt = Date.now();
          return value;
        })
        .catch((error) => {
          if (state.phase === "idle") throw error;
          return {
            available: false,
            installedVersion: null,
            latestVersion: null,
          };
        })
        .finally(() => {
          checking = null;
        });
    }
    await checking;
  }
  return {
    state,
    ...(cachedCheck ?? {
      available: false,
      installedVersion: null,
      latestVersion: null,
    }),
  };
}

export async function startPiUpdate(): Promise<PiUpdateState> {
  if (launching) throw new Error("An update is already running.");
  launching = true;
  try {
    if ((await readPiUpdateState()).phase === "running")
      throw new Error("An update is already running.");
    if (
      getActiveScanLockStats().sessions > 0 ||
      sorterPortOwner() ||
      syncStatus().status === "running"
    ) {
      throw new Error(
        "Finish scanning, disconnect the sorter, and stop database syncing before updating.",
      );
    }
    if (
      await command("git", ["status", "--porcelain", "--untracked-files=all"])
    ) {
      throw new Error(
        "Local files have changed. Update from the Linux terminal after saving your work.",
      );
    }
    const state: PiUpdateState = {
      phase: "running",
      startedAt: Date.now(),
      message: null,
    };
    await writeState(state);
    try {
      await command("systemd-run", [
        "--user",
        "--collect",
        `--unit=${PI_UPDATE_UNIT}`,
        "/bin/bash",
        join(piUpdateRuntime.root(), "scripts/pi/run-update.sh"),
      ]);
    } catch (error) {
      await writeState({
        ...state,
        phase: "failed",
        message: "Could not start the updater. Check the Linux user services.",
      });
      throw error;
    }
    cachedCheck = null;
    return state;
  } finally {
    launching = false;
  }
}
