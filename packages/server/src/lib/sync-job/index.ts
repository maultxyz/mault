import { SYNC_WORK_RESPONSE_TIMEOUT_MS } from "../constants/sync";
import type {
  BrowserSyncWorkCard,
  BrowserSyncWorkFailure,
  BrowserSyncWorkResult,
  SyncState,
  SyncVectorizeOn,
} from "@magic-vault/shared";
import { type ChildProcess, fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { sendDiscordNotification } from "../discord";
import type {
  PendingSyncWork,
  ClaimWorkMessage,
  StartMessage,
  SubmitWorkMessage,
  WorkResponseMessage,
  WorkerToParentMessage,
} from "../interfaces/sync-job";
import { publicGamesCache } from "../public-games";
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

const pendingWork = new Map<string, PendingSyncWork>();

function rejectPendingWork(message: string): void {
  for (const [requestId, pending] of pendingWork) {
    clearTimeout(pending.timer);
    pendingWork.delete(requestId);
    pending.reject(new Error(message));
  }
}

function requestWork(
  message: ClaimWorkMessage | SubmitWorkMessage,
): Promise<WorkResponseMessage> {
  const worker = currentWorker;
  if (!worker) return Promise.reject(new Error("Sync is not running."));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingWork.delete(message.requestId);
      reject(new Error("Sync worker did not answer."));
    }, SYNC_WORK_RESPONSE_TIMEOUT_MS);
    pendingWork.set(message.requestId, { resolve, reject, timer });
    worker.send(message);
  });
}

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
  concurrency?: number,
  vectorizeOn: SyncVectorizeOn = "server",
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
    vectorizeOn,
    acceptingWork: false,
    ...(concurrency !== undefined ? { concurrency } : {}),
  };
  resetState(initialState);

  const notifyFailure = (message: string) => {
    if (!orgId) return;
    void sendDiscordNotification(
      orgId,
      {
        title: "Mault — Sync Failed",
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
      VECTORIZE_CONCURRENCY:
        concurrency?.toString() ??
        process.env.VECTORIZE_CONCURRENCY ??
        "10",
      SCAN_VECTORIZE_CONCURRENCY:
        concurrency?.toString() ??
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
      case "workResponse": {
        const pending = pendingWork.get(msg.requestId);
        if (!pending) break;
        clearTimeout(pending.timer);
        pendingWork.delete(msg.requestId);
        if (msg.ok === false) {
          pending.reject(new Error(msg.message || "Sync work failed."));
        } else {
          pending.resolve(msg);
        }
        break;
      }
    }
  });

  child.on("close", (code) => {
    currentWorker = null;
    publicGamesCache.invalidate();
    rejectPendingWork("Sync worker stopped.");
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
    vectorizeOn,
    initialState,
  };
  child.send(startMessage);
}

export function cancelSync(): void {
  if (currentWorker && getState().status === "running") {
    currentWorker.send({ type: "cancel" });
  }
}

export async function claimSyncWork(
  limit: number,
): Promise<BrowserSyncWorkCard[]> {
  if (
    !currentWorker ||
    getState().status !== "running" ||
    getState().vectorizeOn !== "browser"
  ) {
    return [];
  }
  const response = await requestWork({
    type: "claim",
    requestId: randomUUID(),
    limit,
  });
  return response.cards ?? [];
}

export async function submitSyncWork(
  results: BrowserSyncWorkResult[],
  failures: BrowserSyncWorkFailure[],
): Promise<void> {
  if (!currentWorker || getState().status !== "running") {
    throw new Error("Sync is not running.");
  }
  await requestWork({
    type: "submit",
    requestId: randomUUID(),
    results,
    failures,
  });
}
