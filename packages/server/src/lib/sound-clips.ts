import { SOUND_CLIP_EXTENSIONS } from "@magic-vault/shared";
import { OBJECT_STORAGE_ENABLED } from "./constants/object-storage";
import type { StoredObject } from "./interfaces/object-storage";
import {
  orgObjectPrefix,
  presignObjectUrl,
  putObject,
  toDataUrl,
} from "./object-storage";

function soundClipKey(
  orgId: string,
  clipGuid: string,
  contentType: string,
): string {
  const extension = SOUND_CLIP_EXTENSIONS[contentType] ?? "bin";
  return `${orgObjectPrefix(orgId)}sounds/${clipGuid}.${extension}`;
}

export async function storeSoundClip(
  orgId: string,
  clipGuid: string,
  body: Buffer,
  contentType: string,
): Promise<StoredObject> {
  if (!OBJECT_STORAGE_ENABLED) {
    return { key: null, dataUrl: toDataUrl(body, contentType) };
  }
  const key = soundClipKey(orgId, clipGuid, contentType);
  await putObject(key, body, contentType);
  return { key, dataUrl: null };
}

export async function resolveSoundClipUrl(row: {
  storageKey: string | null;
  dataUrl: string | null;
}): Promise<string | null> {
  if (row.storageKey && OBJECT_STORAGE_ENABLED) {
    return presignObjectUrl(row.storageKey);
  }
  return row.dataUrl;
}
