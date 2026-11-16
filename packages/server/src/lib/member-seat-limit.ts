import { eq } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { orgBilling } from "../db/schema";
import { MEMBER_SEAT_CACHE_TTL_MS } from "./constants/timing";
import type { OrgMemberSeats } from "./interfaces/member-seat-limit";
import { invalidateOrgReadCaches } from "./org-read-cache";
import { planLimit } from "./plan-config";
import { currentPreviewPlan } from "./plan-preview";
import { isBillingEnabled } from "./stripe";

const seatCache = new Map<string, OrgMemberSeats>();
const seatLoadsInFlight = new Map<string, Promise<OrgMemberSeats>>();

export function memberLimitForPlan(plan: string | undefined): number | null {
  return planLimit(plan, "membersPerOrg");
}

async function readSeats(orgId: string): Promise<OrgMemberSeats> {
  const [billing, seatedUserIds] = await Promise.all([
    db.query.orgBilling.findFirst({
      where: eq(orgBilling.orgId, orgId),
      columns: { plan: true },
    }),
    authProvider.listOrgMemberUserIdsBySeat(orgId),
  ]);
  return {
    plan: billing?.plan ?? "free",
    seatedUserIds,
    cachedAt: Date.now(),
  };
}

function loadSeats(orgId: string): Promise<OrgMemberSeats> {
  const cached = seatCache.get(orgId);
  if (cached && Date.now() - cached.cachedAt < MEMBER_SEAT_CACHE_TTL_MS) {
    return Promise.resolve(cached);
  }
  const pending = seatLoadsInFlight.get(orgId);
  if (pending) return pending;
  const load = readSeats(orgId)
    .then((entry) => {
      if (seatLoadsInFlight.get(orgId) === load) seatCache.set(orgId, entry);
      return entry;
    })
    .finally(() => {
      if (seatLoadsInFlight.get(orgId) === load) seatLoadsInFlight.delete(orgId);
    });
  seatLoadsInFlight.set(orgId, load);
  return load;
}

export function invalidateMemberSeats(orgId: string): void {
  seatCache.delete(orgId);
  seatLoadsInFlight.delete(orgId);
  invalidateOrgReadCaches(orgId);
}

export async function findMemberSeatOverflow(
  orgId: string,
  userId: string,
  role: string,
): Promise<number | null> {
  if (role === "owner") return null;
  if (!isBillingEnabled() && !currentPreviewPlan()) return null;
  const { plan, seatedUserIds } = await loadSeats(orgId);
  const limit = memberLimitForPlan(plan);
  if (limit == null) return null;
  const seat = seatedUserIds.indexOf(userId);
  if (seat === -1 || seat < Math.max(limit, 1)) return null;
  return limit;
}

export function memberSeatLimitMessage(limit: number): string {
  return `This organization's plan allows ${limit} member${limit === 1 ? "" : "s"}. Ask the owner to upgrade the plan or remove members.`;
}
