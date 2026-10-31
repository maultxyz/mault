import { eq } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { orgBilling } from "../db/schema";
import { MEMBER_SEAT_CACHE_TTL_MS } from "./constants/timing";
import { planLimit } from "./plan-config";
import { isBillingEnabled } from "./stripe";

const seatCache = new Map<
  string,
  { limit: number | null; seatedUserIds: string[]; cachedAt: number }
>();

export function memberLimitForPlan(plan: string | undefined): number | null {
  return planLimit(plan, "membersPerOrg");
}

async function loadSeats(orgId: string) {
  const cached = seatCache.get(orgId);
  if (cached && Date.now() - cached.cachedAt < MEMBER_SEAT_CACHE_TTL_MS) {
    return cached;
  }
  const billing = await db.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  const limit = memberLimitForPlan(billing?.plan ?? "free");
  const seatedUserIds =
    limit == null
      ? []
      : await authProvider.listOrgMemberUserIdsBySeat(orgId);
  const entry = { limit, seatedUserIds, cachedAt: Date.now() };
  seatCache.set(orgId, entry);
  return entry;
}

export function invalidateMemberSeats(orgId: string): void {
  seatCache.delete(orgId);
}

export async function findMemberSeatOverflow(
  orgId: string,
  userId: string,
  role: string,
): Promise<number | null> {
  if (!isBillingEnabled() || role === "owner") return null;
  const { limit, seatedUserIds } = await loadSeats(orgId);
  if (limit == null) return null;
  const seat = seatedUserIds.indexOf(userId);
  if (seat === -1 || seat < Math.max(limit, 1)) return null;
  return limit;
}

export function memberSeatLimitMessage(limit: number): string {
  return `This organization's plan allows ${limit} member${limit === 1 ? "" : "s"}. Ask the owner to upgrade the plan or remove members.`;
}
