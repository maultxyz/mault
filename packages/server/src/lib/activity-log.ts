import type { Transaction } from "../db";
import { orgActivityLog } from "../db/schema";
import type { ActivityLogInput } from "./interfaces/business";

export async function logActivity(
  tx: Transaction,
  input: ActivityLogInput,
): Promise<void> {
  await tx.insert(orgActivityLog).values({
    orgId: input.orgId,
    userId: input.userId,
    action: input.action,
    summary: input.summary ?? null,
    details: input.details ?? null,
  });
}
