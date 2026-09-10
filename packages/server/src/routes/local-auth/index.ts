import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { acceptInviteRoute } from "./invites-accept";
import { addApiKeyRoute } from "./api-keys-add";
import { addInviteRoute } from "./invites-add";
import { addOrganizationRoute } from "./organizations-add";
import { auditEventsRoute } from "./audit-events";
import { bootstrapRoute } from "./bootstrap";
import { deleteApiKeyRoute } from "./api-keys-delete";
import { deleteInviteRoute } from "./invites-delete";
import { forgotPasswordRoute } from "./forgot-password";
import { listApiKeysRoute } from "./api-keys-list";
import { listInvitesRoute } from "./invites-list";
import { listOrganizationsRoute } from "./organizations-list";
import { resetPasswordRoute } from "./reset-password";
import { sessionRoute } from "./session";
import { signInRoute } from "./sign-in";
import { signOutRoute } from "./sign-out";
import { signUpRoute } from "./sign-up";

// AUTH_PROVIDER=local only (see server index.ts's conditional mount).
//
// own-auth's own HTTP handler (own-auth/http) is cookie-oriented - the
// public session it returns never includes the raw session token, only a
// Set-Cookie header - and its organisation methods aren't part of that public
// contract at all (they're server-SDK-only, see own-auth.com/docs/organisations).
// This app's API is bearer-token-only everywhere else (never cookies, see
// CLAUDE.md), so each route here calls the OwnAuth engine's direct methods
// instead of mounting that handler, and returns the raw sessionToken the same
// way Neon mode's JWT is returned to the client for it to store and send back
// as `Authorization: Bearer <token>`.
const router = new Hono<AppEnv>()
  .route("/", signUpRoute)
  .route("/", signInRoute)
  .route("/", forgotPasswordRoute)
  .route("/", resetPasswordRoute)
  .route("/", signOutRoute)
  .route("/", sessionRoute)
  .route("/", listOrganizationsRoute)
  .route("/", addOrganizationRoute)
  .route("/", bootstrapRoute)
  .route("/", listApiKeysRoute)
  .route("/", addApiKeyRoute)
  .route("/", deleteApiKeyRoute)
  .route("/", auditEventsRoute)
  .route("/", addInviteRoute)
  .route("/", listInvitesRoute)
  .route("/", deleteInviteRoute)
  .route("/", acceptInviteRoute);

export const localAuthRouter = router;
