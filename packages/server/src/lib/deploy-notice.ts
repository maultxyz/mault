import { DEPLOY_STATUS_EVENT, type DeployNotice } from "@magic-vault/shared";
import type { SseWriter } from "./interfaces/sse";
import { getActiveAnnouncements } from "./public-announcements";

const writers = new Set<SseWriter>();

export function subscribeDeployNotice(writer: SseWriter): () => void {
  writers.add(writer);
  return () => {
    writers.delete(writer);
  };
}

export function emitDeployNotice(notice: DeployNotice | null) {
  for (const writer of writers) {
    try {
      writer(DEPLOY_STATUS_EVENT, notice);
    } catch {}
  }
}

export async function loadActiveDeployNotice(): Promise<DeployNotice | null> {
  const rows = await getActiveAnnouncements();
  const row = [...rows]
    .reverse()
    .find((announcement) => announcement.isDeploy && announcement.endsAt);
  return row?.guid ? { guid: row.guid, message: row.message } : null;
}
