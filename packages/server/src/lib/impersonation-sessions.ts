import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { impersonationAudit } from "../db/schema";
import {
  IMPERSONATION_SESSION_CACHE_MAX_ENTRIES,
  IMPERSONATION_SESSION_CACHE_TTL_MS,
} from "./constants/auth";
import type { ImpersonationSession } from "./interfaces/auth";
import { createKeyedCache } from "./keyed-cache";

const openSessionCache = createKeyedCache<ImpersonationSession | null>(
  "auth.impersonationSessions",
  IMPERSONATION_SESSION_CACHE_TTL_MS,
  IMPERSONATION_SESSION_CACHE_MAX_ENTRIES,
);

export function findOpenImpersonationSession(
  sessionGuid: string,
): Promise<ImpersonationSession | null> {
  return openSessionCache.get(sessionGuid, async () => {
    const [session] = await db
      .select({
        adminUserId: impersonationAudit.adminUserId,
        targetUserId: impersonationAudit.targetUserId,
      })
      .from(impersonationAudit)
      .where(and(eq(impersonationAudit.guid, sessionGuid), isNull(impersonationAudit.endedAt)))
      .limit(1);
    return session ?? null;
  });
}

export async function startImpersonationSession(session: {
  adminUserId: string;
  adminEmail: string | null;
  targetUserId: string;
  targetEmail: string | null;
}): Promise<string> {
  const [created] = await db
    .insert(impersonationAudit)
    .values(session)
    .returning({ guid: impersonationAudit.guid });
  if (!created?.guid) throw new Error("The impersonation session was not recorded.");
  return created.guid;
}

export async function endImpersonationSessions(
  adminUserId: string,
  targetUserId: string,
): Promise<void> {
  await db
    .update(impersonationAudit)
    .set({ endedAt: new Date() })
    .where(
      and(
        eq(impersonationAudit.adminUserId, adminUserId),
        eq(impersonationAudit.targetUserId, targetUserId),
        isNull(impersonationAudit.endedAt),
      ),
    );
  openSessionCache.clear();
}
