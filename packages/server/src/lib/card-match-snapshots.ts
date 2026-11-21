import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { decodeCardMatchSnapshot, encodeCardMatchSnapshot } from "./card-match-snapshot-format";
import {
  CARD_MATCH_SNAPSHOT_CONTENT_TYPE,
  CARD_MATCH_SNAPSHOT_DIRECTORY,
  CARD_MATCH_SNAPSHOT_OBJECT_PREFIX,
} from "./constants/card-search";
import { OBJECT_STORAGE_ENABLED } from "./constants/object-storage";
import type { CardMatchSegment } from "./interfaces/card-match-index";
import { getObject, putObject } from "./object-storage";

const snapshotsEnabled = process.env.CARD_MATCH_INDEX_SNAPSHOTS !== "off";

function snapshotName(gameKey: string, lang: string): string {
  return `${encodeURIComponent(gameKey)}.${encodeURIComponent(lang)}.bin`;
}

function localSnapshotDirectory(): string {
  return join(
    process.env.XDG_CACHE_HOME || join(homedir(), ".cache"),
    "mault",
    CARD_MATCH_SNAPSHOT_DIRECTORY,
  );
}

function isMissingSnapshot(err: unknown): boolean {
  const error = err as { code?: string; name?: string } | null;
  return error?.code === "ENOENT" || error?.name === "NoSuchKey";
}

async function readSnapshotBytes(gameKey: string, lang: string): Promise<Buffer> {
  const name = snapshotName(gameKey, lang);
  return OBJECT_STORAGE_ENABLED
    ? getObject(`${CARD_MATCH_SNAPSHOT_OBJECT_PREFIX}${name}`)
    : readFile(join(localSnapshotDirectory(), name));
}

async function writeSnapshotBytes(gameKey: string, lang: string, bytes: Buffer): Promise<void> {
  const name = snapshotName(gameKey, lang);
  if (OBJECT_STORAGE_ENABLED) {
    await putObject(`${CARD_MATCH_SNAPSHOT_OBJECT_PREFIX}${name}`, bytes, CARD_MATCH_SNAPSHOT_CONTENT_TYPE);
    return;
  }
  const directory = localSnapshotDirectory();
  await mkdir(directory, { recursive: true });
  const temporaryPath = join(directory, `${name}.${process.pid}.tmp`);
  await writeFile(temporaryPath, bytes);
  await rename(temporaryPath, join(directory, name));
}

export async function readCardMatchSnapshot(
  gameKey: string,
  lang: string,
  stamp: string,
): Promise<CardMatchSegment | null> {
  if (!snapshotsEnabled) return null;
  try {
    return decodeCardMatchSnapshot(await readSnapshotBytes(gameKey, lang), stamp);
  } catch (err) {
    if (!isMissingSnapshot(err)) {
      console.warn(`[card-match-index] could not read the ${gameKey}/${lang} snapshot:`, err);
    }
    return null;
  }
}

export function saveCardMatchSnapshot(segment: CardMatchSegment, stamp: string): void {
  if (!snapshotsEnabled) return;
  writeSnapshotBytes(segment.gameKey, segment.lang, encodeCardMatchSnapshot(segment, stamp)).catch(
    (err: unknown) =>
      console.warn(
        `[card-match-index] could not save the ${segment.gameKey}/${segment.lang} snapshot:`,
        err,
      ),
  );
}
