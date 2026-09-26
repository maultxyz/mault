import type { SyncState } from "@magic-vault/shared";
import { type ChildProcess, fork } from "node:child_process";
import path from "node:path";
import { sendDiscordNotification } from "../discord";
import type { StartMessage, WorkerToParentMessage } from "./protocol";
import { SYNC_SOURCES } from "./sources";
import {
  addLog,
  emitEvent,
  getState,
  getStatus,
  incrementCounters,
  patchState,
  resetState,
  subscribeSSE,
} from "./state";

export { getStatus, subscribeSSE, SYNC_SOURCES };

let currentWorker: ChildProcess | null = null;

function resolveWorkerEntry(): { modulePath: string; execArgv: string[] } {
  if (process.env.NODE_ENV === "production") {
    return {
      modulePath: path.join(__dirname, "lib", "sync-job", "worker.js"),
      execArgv: [],
    };
  }
  return {
    modulePath: path.join(__dirname, "worker.ts"),
    execArgv: ["--require", "tsx/cjs"],
  };
}

export function startSync(
  orgId: string | undefined,
  gameKey: string,
  lang: string = "en",
  forceResync: boolean = false,
  skipUpdatedWithinMs?: number,
): void {
  if (currentWorker) return;

  const source = SYNC_SOURCES[gameKey];
  if (!source) return;
  if (!source.languages.includes(lang)) return;

  const initialState: SyncState = {
    status: "running",
    gameKey,
    lang,
    total: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    queued: 0,
    startedAt: new Date().toISOString(),
    logs: [],
  };
  resetState(initialState);

  const notifyFailure = (message: string) => {
    if (!orgId) return;
    void sendDiscordNotification(
      orgId,
      {
        title: "Magic Vault — Sync Failed",
        description: `The card database sync job encountered a fatal error.\n\n**Error:** ${message}`,
        color: 0xed4245,
        timestamp: new Date().toISOString(),
      },
      "error",
    );
  };

  const { modulePath, execArgv } = resolveWorkerEntry();
  const child = fork(modulePath, [], {
    execArgv,
    stdio: ["inherit", "inherit", "inherit", "ipc"],
    env: {
      ...process.env,
      DB_POOL_MAX: process.env.SYNC_DB_POOL_MAX ?? "3",
      DB_IDLE_TIMEOUT_MS: process.env.SYNC_DB_IDLE_TIMEOUT_MS ?? "60000",
      DB_CONNECTION_TIMEOUT_MS:
        process.env.SYNC_DB_CONNECTION_TIMEOUT_MS ?? "30000",
      SCAN_VECTORIZE_CONCURRENCY:
        process.env.SYNC_VECTORIZE_CONCURRENCY ??
        process.env.VECTORIZE_CONCURRENCY ??
        "10",
    },
  });
  currentWorker = child;
  let reachedTerminalStatus = false;

  child.on("message", (msg: WorkerToParentMessage) => {
    switch (msg.type) {
      case "patchState":
        patchState(msg.patch);
        if (msg.patch.status && msg.patch.status !== "running") {
          reachedTerminalStatus = true;
        }
        break;
      case "incrementCounters":
        incrementCounters(msg.delta);
        break;
      case "addLog":
        addLog(msg.msg);
        break;
      case "emitEvent":
        emitEvent(msg.event, msg.data);
        if (msg.event === "error") {
          const data = msg.data as { message?: string };
          notifyFailure(data.message ?? "Unknown error");
        }
        break;
    }
  });

  // "close", not "exit": "exit" can fire before the last IPC messages (the
  // terminal status among them) have been read off the channel.
  child.on("close", (code) => {
    currentWorker = null;
    if (reachedTerminalStatus) return;
    const msg = `Sync worker exited unexpectedly (code ${code ?? "unknown"}).`;
    patchState({ status: "failed" });
    addLog(`Fatal error: ${msg}`);
    emitEvent("error", { message: msg });
    notifyFailure(msg);
  });

  const startMessage: StartMessage = {
    type: "start",
    gameKey,
    lang,
    forceResync,
    skipUpdatedWithinMs,
    initialState,
  };
  child.send(startMessage);
}

export function cancelSync(): void {
  if (currentWorker && getState().status === "running") {
    currentWorker.send({ type: "cancel" });
  }
}
