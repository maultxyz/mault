import {
  canManageOrgSettings,
  orgProfileFormSchema,
  type OrgProfileSaveErrorCode,
  type OrgProfileSaveResult,
  type Result,
  type OrgProfileSettings,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { authQuery } from "../../db";
import {
  ORG_PROFILE_FORBIDDEN_MESSAGE,
  ORG_PROFILE_HANDLE_TAKEN_MESSAGE,
  ORG_PROFILE_INVALID_MESSAGE,
  ORG_PROFILE_SOURCES_INVALID_MESSAGE,
} from "../../lib/constants/org-profiles";
import {
  findOrgProfileRow,
  forgetOrgProfile,
  isHandleClaimedByOtherOrg,
  isHandleFreeInShortener,
  loadOrgProfileSettings,
  resolveShopCatalogIds,
  resolveShowcaseCollectionCardIds,
  saveOrgProfileRow,
  syncOrgProfileShortLink,
  toOrgProfile,
} from "../../lib/org-profiles";
import {
  rejectAccountChangesWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";

function saveFailure(
  c: Context<AppEnv>,
  errorCode: OrgProfileSaveErrorCode,
  message: string,
) {
  const result: OrgProfileSaveResult = { success: false, message, errorCode };
  return c.json(result);
}

async function readJsonBody(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

export const orgProfileRouter = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      loadOrgProfileSettings(tx, c.get("orgId"), canManageOrgSettings(c.get("orgRole"))),
    );
    const result: Result<OrgProfileSettings> = { success: true, message: "Loaded.", data };
    return c.json(result);
  })
  .put("/", requireAuth, rejectAccountChangesWhileImpersonating, requireOrg, async (c) => {
    if (!canManageOrgSettings(c.get("orgRole"))) {
      return saveFailure(c, "forbidden", ORG_PROFILE_FORBIDDEN_MESSAGE);
    }
    const input = orgProfileFormSchema.safeParse(await readJsonBody(c));
    if (!input.success) return saveFailure(c, "invalid", ORG_PROFILE_INVALID_MESSAGE);
    const orgId = c.get("orgId");
    const jwtClaims = c.get("jwtClaims");
    const previous = await authQuery(jwtClaims, (tx) => findOrgProfileRow(tx, orgId));
    const claimsNewShortCode =
      input.data.isPublished && (!previous?.isPublished || previous.handle !== input.data.handle);
    if (claimsNewShortCode && !(await isHandleFreeInShortener(input.data.handle))) {
      return saveFailure(c, "handleTaken", ORG_PROFILE_HANDLE_TAKEN_MESSAGE);
    }
    const outcome = await authQuery(jwtClaims, async (tx) => {
      if (await isHandleClaimedByOtherOrg(tx, orgId, input.data.handle)) {
        return { errorCode: "handleTaken" as const };
      }
      const showcaseCollectionCardIds = await resolveShowcaseCollectionCardIds(
        tx,
        orgId,
        input.data.showcaseScanIds,
      );
      const shopCatalogIds = await resolveShopCatalogIds(tx, orgId, input.data.shopCatalogGuids);
      if (!showcaseCollectionCardIds || !shopCatalogIds) {
        return { errorCode: "sourcesInvalid" as const };
      }
      const saved = await saveOrgProfileRow(tx, orgId, input.data, {
        showcaseCollectionCardIds,
        shopCatalogIds,
      });
      await syncOrgProfileShortLink({ previous: previous ?? null, next: saved });
      return { profile: await toOrgProfile(tx, saved) };
    });
    if (previous) forgetOrgProfile(previous.handle);
    forgetOrgProfile(input.data.handle);
    if (outcome.errorCode === "handleTaken") {
      return saveFailure(c, "handleTaken", ORG_PROFILE_HANDLE_TAKEN_MESSAGE);
    }
    if (outcome.errorCode === "sourcesInvalid") {
      return saveFailure(c, "sourcesInvalid", ORG_PROFILE_SOURCES_INVALID_MESSAGE);
    }
    const result: OrgProfileSaveResult = {
      success: true,
      message: "Saved.",
      data: outcome.profile,
    };
    return c.json(result);
  });
