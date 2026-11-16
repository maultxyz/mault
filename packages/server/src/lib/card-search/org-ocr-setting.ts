import { eq } from "drizzle-orm";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
import {
  ORG_OCR_SETTING_CACHE_MAX_ENTRIES,
  ORG_OCR_SETTING_CACHE_TTL_MS,
} from "../constants/card-search";
import { createOrgReadCache } from "../org-read-cache";

const orgOcrEnabledCache = createOrgReadCache<{ ocrEnabled: boolean }>(
  ORG_OCR_SETTING_CACHE_TTL_MS,
  ORG_OCR_SETTING_CACHE_MAX_ENTRIES,
);

export async function isOcrEnabledForOrg(
  jwtClaims: string,
  orgId: string,
): Promise<boolean> {
  const { ocrEnabled } = await orgOcrEnabledCache.get(orgId, "ocrEnabled", async () => {
    const settings = await authQuery(jwtClaims, (tx) =>
      tx.query.orgSettings.findFirst({
        where: eq(orgSettings.orgId, orgId),
        columns: { ocrEnabled: true },
      }),
    );
    return { ocrEnabled: settings?.ocrEnabled === true };
  });
  return ocrEnabled;
}
