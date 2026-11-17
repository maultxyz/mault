import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { gt, valid } from "semver";
import type { PiUpdateState, PiUpdateStatus } from "@magic-vault/shared";
import {
  PI_UPDATE_CHECK_MS,
  PI_UPDATE_COMMAND_TIMEOUT_MS,
  PI_UPDATE_MAX_BUFFER,
  PI_UPDATE_STATE_FILE,
  PI_UPDATE_UNIT,
  PI_UPDATE_LAUNCH_GRACE_MS,
  PI_RELEASE_FILE,
} from "./constants/pi-update";
import type { PiInstalledRelease, PiUpdateCheck } from "./interfaces/pi-update";
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
  async readInstalledRelease(root: string): Promise<PiInstalledRelease> {
    let release: { version?: unknown; manifestUrl?: unknown };
    try {
      release = JSON.parse(await readFile(join(root, PI_RELEASE_FILE), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new Error("This installation was not installed from a release.");
      throw error;
    }
    if (typeof release.version !== "string" || !valid(release.version))
      throw new Error("The installed release has no valid app version.");
    if (typeof release.manifestUrl !== "string")
      throw new Error("The installed release has no update address.");
    return { version: release.version, manifestUrl: release.manifestUrl };
  },
  async fetchReleaseManifest(manifestUrl: string): Promise<unknown> {
    const response = await fetch(manifestUrl, {
      signal: AbortSignal.timeout(PI_UPDATE_COMMAND_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`The release check failed (${response.status}).`);
    return response.json();
  },
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

export async function checkPiUpdateVersion(): Promise<PiUpdateCheck> {
  const installed = await piUpdateRuntime.readInstalledRelease(
    piUpdateRuntime.root(),
  );
  const manifest = await piUpdateRuntime.fetchReleaseManifest(
    installed.manifestUrl,
  );
  const latestVersion = (manifest as { version?: unknown } | null)?.version;
  if (typeof latestVersion !== "string" || !valid(latestVersion)) {
    throw new Error("The latest release has no valid app version.");
  }
  const installedVersion = installed.version;
  return {
    installedVersion,
    latestVersion,
    available: gt(latestVersion, installedVersion),
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
          "The updater stopped before completion. Check the update log with: sudo mault logs update",
      };
      await writeState(state);
    }
  }
  if (
    state.phase !== "running" &&
    (!cachedCheck || Date.now() - checkedAt > PI_UPDATE_CHECK_MS)
  ) {
    if (!checking) {
      checking = checkPiUpdateVersion()
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
