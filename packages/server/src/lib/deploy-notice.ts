import { DEPLOY_STATUS_EVENT, type DeployNotice } from "@magic-vault/shared";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { announcements } from "../db/schema";
import type { SseWriter } from "./interfaces/sse";

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
  const [row] = await db
    .select({ guid: announcements.guid, message: announcements.message })
    .from(announcements)
    .where(
      and(
        eq(announcements.isDeploy, true),
        eq(announcements.isDeleted, false),
        eq(announcements.isActive, true),
        gt(announcements.endsAt, new Date()),
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(1);
  return row?.guid ? { guid: row.guid, message: row.message } : null;
}
