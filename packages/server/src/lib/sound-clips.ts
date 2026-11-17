import { SOUND_CLIP_EXTENSIONS } from "@magic-vault/shared";
import {
  OBJECT_STORAGE_ENABLED,
  SYSTEM_SOUND_CLIP_PREFIX,
} from "./constants/object-storage";
import type { StoredObject } from "./interfaces/object-storage";
import {
  orgObjectPrefix,
  presignObjectUrl,
  putObject,
  toDataUrl,
} from "./object-storage";

function soundClipKey(
  orgId: string | null,
  clipGuid: string,
  contentType: string,
): string {
  const extension = SOUND_CLIP_EXTENSIONS[contentType] ?? "bin";
  const prefix =
    orgId === null
      ? SYSTEM_SOUND_CLIP_PREFIX
      : `${orgObjectPrefix(orgId)}sounds/`;
  return `${prefix}${clipGuid}.${extension}`;
}

export async function storeSoundClip(
  orgId: string | null,
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
