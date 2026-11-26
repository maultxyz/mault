import { ORG_PROFILE_HANDLE_PARAM, isValidOrgProfileHandle } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { createMiddleware } from "hono/factory";
import { ORG_PROFILE_RATE_LIMIT_KEY_PREFIX } from "../../lib/constants/org-profiles";
import type { PublishedOrgProfile } from "../../lib/interfaces/org-profiles";
import { loadPublishedOrgProfile, orgProfileReadsCache } from "../../lib/org-profiles";
import { rejectWhenShareLinkRateLimited } from "../../lib/share-link-rate-limit";
import { orgProfileScope } from "../../lib/share-link-scopes";
import type { AppEnv } from "../../middleware/auth";
import { createPublicCardBrowseRoute } from "./card-browse";

function requestedHandle(c: Context<AppEnv>): string | null {
  const handle = (c.req.query(ORG_PROFILE_HANDLE_PARAM) ?? "").toLowerCase();
  return isValidOrgProfileHandle(handle) ? handle : null;
}

function profileFor(c: Context<AppEnv>): Promise<PublishedOrgProfile | null> {
  const handle = requestedHandle(c);
  return handle ? loadPublishedOrgProfile(handle) : Promise.resolve(null);
}

const orgProfileRateLimit = createMiddleware<AppEnv>(async (c, next) => {
  const handle = requestedHandle(c);
  if (handle) {
    const rejection = rejectWhenShareLinkRateLimited(c, `${ORG_PROFILE_RATE_LIMIT_KEY_PREFIX}${handle}`);
    if (rejection) return rejection;
  }
  await next();
});

const orgProfileBrowseRoute = createPublicCardBrowseRoute({
  readsCache: orgProfileReadsCache,
  resolveScope: async (c) => {
    const profile = await profileFor(c);
    return profile ? orgProfileScope(profile) : null;
  },
  infoExtras: async (c) => {
    const profile = await profileFor(c);
    return profile
      ? {
          handle: profile.handle,
          displayName: profile.displayName,
          bio: profile.bio,
          links: profile.links,
          shopCatalogs: profile.shopCatalogs,
        }
      : {};
  },
});

export const publicOrgProfileRoute = new Hono<AppEnv>()
  .use("/org-profile", orgProfileRateLimit)
  .use("/org-profile/*", orgProfileRateLimit)
  .route("/org-profile", orgProfileBrowseRoute);
