import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  isRetryableScanSaveStatus,
  pendingScanSaveRetryDelayMs,
} from "@magic-vault/shared";
import {
  PI_SCAN_PENDING_DIRECTORY,
  PI_SCAN_POLL_MS,
} from "../constants/pi-scan";
import type {
  PendingPiScanSave,
  PiScanSaveResult,
  SendPendingPiScanSave,
} from "../interfaces/pi-scan";

export const piScanSaveRuntime = {
  directory: () =>
    join(
      process.env.XDG_STATE_HOME || join(homedir(), ".local/state"),
      "mault",
      PI_SCAN_PENDING_DIRECTORY,
    ),
  wait: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

function ownerKey(orgId: string, userId: string): string {
  return createHash("sha256")
    .update(JSON.stringify([orgId, userId]))
    .digest("hex");
}

function savePath(save: PendingPiScanSave): string {
  const key = createHash("sha256").update(save.body.scanId).digest("hex");
  return join(
    piScanSaveRuntime.directory(),
    `${ownerKey(save.orgId, save.userId)}-${key}.json`,
  );
}

async function putPending(save: PendingPiScanSave) {
  await mkdir(piScanSaveRuntime.directory(), { recursive: true, mode: 0o700 });
  const target = savePath(save);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(save), {
    mode: 0o600,
    flush: true,
  });
  await rename(temporary, target);
  const directory = await open(piScanSaveRuntime.directory(), "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

async function finishPending(
  save: PendingPiScanSave,
  send: SendPendingPiScanSave,
  stopping: () => boolean,
  recovered: boolean,
): Promise<PiScanSaveResult> {
  for (
    let attempt = 0;
    (!recovered && attempt === 0) || !stopping();
    attempt++
  ) {
    try {
      const result = await send(save, recovered || attempt > 0);
      if (result.success) {
        await unlink(savePath(save));
        return result;
      }
      if (result.status == null || !isRetryableScanSaveStatus(result.status))
        return result;
      console.warn(
        `[pi-scan] save ${save.body.scanId} pending: ${result.message}`,
      );
    } catch (error) {
      console.warn(`[pi-scan] save ${save.body.scanId} pending:`, error);
    }
    const delay = pendingScanSaveRetryDelayMs(attempt);
    for (
      let elapsed = 0;
      elapsed < delay && !stopping();
      elapsed += PI_SCAN_POLL_MS
    ) {
      await piScanSaveRuntime.wait(Math.min(PI_SCAN_POLL_MS, delay - elapsed));
    }
  }
  return { success: false, message: "The card could not be saved." };
}

export async function submitPiScanSave(
  save: PendingPiScanSave,
  send: SendPendingPiScanSave,
  stopping: () => boolean,
): Promise<PiScanSaveResult> {
  await putPending(save);
  return finishPending(save, send, stopping, false);
}

export async function recoverPiScanSaves(
  orgId: string,
  userId: string,
  send: SendPendingPiScanSave,
  stopping: () => boolean,
): Promise<PiScanSaveResult> {
  let names: string[];
  try {
    names = await readdir(piScanSaveRuntime.directory());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { success: true, message: "" };
    throw error;
  }
  const saves: PendingPiScanSave[] = [];
  for (const name of names.filter(
    (name) =>
      name.startsWith(`${ownerKey(orgId, userId)}-`) && name.endsWith(".json"),
  )) {
    const save = JSON.parse(
      await readFile(join(piScanSaveRuntime.directory(), name), "utf8"),
    ) as PendingPiScanSave;
    if (save.orgId === orgId && save.userId === userId) saves.push(save);
  }
  for (const save of saves.sort((a, b) => a.queuedAt - b.queuedAt)) {
    const result = await finishPending(save, send, stopping, true);
    if (!result.success) return result;
  }
  return { success: true, message: "" };
}
