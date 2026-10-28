import { SYNC_VECTORIZE_CONCURRENCY_MAX } from "@magic-vault/shared";
import { isPiHost } from "../pi-host";
import { piUpdateRunning } from "../pi-update";
import type {
  SyncStartBody,
  SyncStartOutcome,
  SyncStartRequest,
} from "../interfaces/sync-job";
import { startSync } from "./index";
import { SYNC_SOURCES } from "./sources";

function parseConcurrency(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 1 || value > SYNC_VECTORIZE_CONCURRENCY_MAX) return undefined;
  return value;
}

export function toSyncStartRequest(body: SyncStartBody): SyncStartRequest {
  return {
    gameKey: body.gameKey,
    lang: body.lang || "en",
    forceResync: body.forceResync === true,
    concurrency: parseConcurrency(body.concurrency),
    vectorizeOn: body.vectorizeOn === "browser" ? "browser" : "server",
  };
}

export async function requestSyncStart(
  orgId: string | undefined,
  request: SyncStartRequest,
): Promise<SyncStartOutcome> {
  if (isPiHost() && (await piUpdateRunning())) {
    return {
      success: false,
      message: "A system update is running.",
      status: 409,
    };
  }
  if (request.vectorizeOn === "browser" && !isPiHost()) {
    return {
      success: false,
      message: "Browser vectorizing is only available on a Raspberry Pi host.",
      status: 400,
    };
  }
  if (!request.gameKey) {
    return { success: false, message: "gameKey is required.", status: 400 };
  }
  const source = SYNC_SOURCES[request.gameKey];
  if (!source) {
    return {
      success: false,
      message: `Unknown sync source: ${request.gameKey}`,
      status: 400,
    };
  }
  if (!source.languages.includes(request.lang)) {
    return {
      success: false,
      message: `${source.label} does not support language: ${request.lang}`,
      status: 400,
    };
  }

  startSync(
    orgId,
    request.gameKey,
    request.lang,
    request.forceResync,
    undefined,
    request.concurrency,
    request.vectorizeOn,
  );
  return { success: true };
}
