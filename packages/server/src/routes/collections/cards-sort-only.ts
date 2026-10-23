import type { SortOnlyScanRequest } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  acquireDeviceLease,
  UNIDENTIFIED_SORTER_LEASE_KEY,
} from "../../lib/device-leases";
import { recordDeviceSorted } from "../../lib/device-alerts";
import { recordMatchedScan } from "../../lib/scan-stats";
import {
  consumeDailyScan,
  dailyScanLimitForPlan,
  dailyScanLimitMessage,
  getScansToday,
} from "../../lib/scan-usage";
import {
  sorterLimitForPlan,
  sorterLimitMessage,
} from "../../lib/sorter-limit";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadOrgPlan } from "./scan-limit";

export const sortOnlyScanRoute = new Hono<AppEnv>().post(
  "/:guid/cards/sorted",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const {
      scanId,
      card,
      scannedAt,
      hasAlternatives,
      vectorizedOn,
      deviceGuid,
    } = await c.req.json<SortOnlyScanRequest>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const plan = await loadOrgPlan(tx, orgId);
        const dailyLimit = dailyScanLimitForPlan(plan);
        const scanLimitReached = {
          success: false as const,
          message: dailyScanLimitMessage(dailyLimit),
          scanLimitReached: true,
        };
        if (
          dailyLimit != null &&
          (await getScansToday(tx, orgId)) >= dailyLimit
        ) {
          return scanLimitReached;
        }
        const sorterLimit = sorterLimitForPlan(plan);
        if (
          !acquireDeviceLease(
            orgId,
            deviceGuid ?? UNIDENTIFIED_SORTER_LEASE_KEY,
            sorterLimit,
          )
        ) {
          return {
            success: false as const,
            message: sorterLimitMessage(sorterLimit),
            sorterLimitReached: true,
          };
        }
        if (!(await consumeDailyScan(orgId, plan))) return scanLimitReached;
        return { success: true as const };
      });
      if (!result.success) return c.json(result, 402);
      void recordMatchedScan(
        orgId,
        scanId,
        card,
        hasAlternatives,
        scannedAt,
        vectorizedOn,
        c.get("userId"),
      );
      void recordDeviceSorted(orgId, deviceGuid);
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
