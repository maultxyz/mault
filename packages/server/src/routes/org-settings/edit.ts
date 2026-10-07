import {
  isPriceSource,
  toCorrectionAutoCloseSeconds,
  toPriceSource,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const editOrgSettingsRoute = new Hono<AppEnv>().put(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.json<{
      primaryColor?: string | null;
      scannerLayout?: string | null;
      discordNotifyOnScan?: boolean;
      discordScanUseThreads?: boolean;
      sessionWrappedEnabled?: boolean;
      ocrEnabled?: boolean;
      correctionBinPrompt?: boolean;
      correctionAutoCloseSeconds?: number | null;
      priceSource?: string;
    }>();
    if (
      body.correctionAutoCloseSeconds != null &&
      toCorrectionAutoCloseSeconds(body.correctionAutoCloseSeconds) == null
    ) {
      return c.json(
        { success: false, message: "Invalid auto-close time." },
        400,
      );
    }
    if ("priceSource" in body && !isPriceSource(body.priceSource)) {
      return c.json(
        { success: false, message: "Invalid price source." },
        400,
      );
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const existing = await tx.query.orgSettings.findFirst({
          where: eq(orgSettings.orgId, orgId),
        });

        const merged = {
          primaryColor:
            "primaryColor" in body
              ? (body.primaryColor ?? null)
              : (existing?.primaryColor ?? null),
          scannerLayout:
            "scannerLayout" in body
              ? (body.scannerLayout ?? null)
              : (existing?.scannerLayout ?? null),
          discordNotifyOnScan:
            "discordNotifyOnScan" in body
              ? (body.discordNotifyOnScan ?? false)
              : (existing?.discordNotifyOnScan ?? false),
          discordScanUseThreads:
            "discordScanUseThreads" in body
              ? (body.discordScanUseThreads ?? true)
              : (existing?.discordScanUseThreads ?? true),
          sessionWrappedEnabled:
            "sessionWrappedEnabled" in body
              ? (body.sessionWrappedEnabled ?? true)
              : (existing?.sessionWrappedEnabled ?? true),
          ocrEnabled:
            "ocrEnabled" in body
              ? (body.ocrEnabled ?? false)
              : (existing?.ocrEnabled ?? false),
          correctionBinPrompt:
            "correctionBinPrompt" in body
              ? (body.correctionBinPrompt ?? true)
              : (existing?.correctionBinPrompt ?? true),
          correctionAutoCloseSeconds: toCorrectionAutoCloseSeconds(
            "correctionAutoCloseSeconds" in body
              ? body.correctionAutoCloseSeconds
              : existing?.correctionAutoCloseSeconds,
          ),
          priceSource: toPriceSource(
            "priceSource" in body ? body.priceSource : existing?.priceSource,
          ),
        };
        await tx
          .insert(orgSettings)
          .values({ orgId, ...merged })
          .onConflictDoUpdate({
            target: [orgSettings.orgId],
            set: { ...merged, updatedAt: new Date() },
          });

        return {
          success: true,
          message: "Saved.",
          data: {
            primaryColor: merged.primaryColor,
            scannerLayout:
              (merged.scannerLayout as "horizontal" | "vertical") ??
              "horizontal",
            discordNotifyOnScan: merged.discordNotifyOnScan,
            discordScanUseThreads: merged.discordScanUseThreads,
            sessionWrappedEnabled: merged.sessionWrappedEnabled,
            ocrEnabled: merged.ocrEnabled,
            correctionBinPrompt: merged.correctionBinPrompt,
            correctionAutoCloseSeconds: merged.correctionAutoCloseSeconds,
            priceSource: merged.priceSource,
            discordGuildId: existing?.discordGuildId ?? null,
          },
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
