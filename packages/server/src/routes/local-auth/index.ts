import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { addApiKeyRoute } from "./api-keys-add";
import { deleteApiKeyRoute } from "./api-keys-delete";
import { listApiKeysRoute } from "./api-keys-list";
import { auditEventsRoute } from "./audit-events";
import { bootstrapRoute } from "./bootstrap";
import { forgotPasswordRoute } from "./forgot-password";
import { acceptInviteRoute } from "./invites-accept";
import { addInviteRoute } from "./invites-add";
import { deleteInviteRoute } from "./invites-delete";
import { listInvitesRoute } from "./invites-list";
import { addOrganizationRoute } from "./organizations-add";
import { deleteOrganizationRoute } from "./organizations-delete";
import { listOrganizationsRoute } from "./organizations-list";
import { resetPasswordRoute } from "./reset-password";
import { sessionRoute } from "./session";
import { signInRoute } from "./sign-in";
import { signOutRoute } from "./sign-out";
import { signUpRoute } from "./sign-up";

const router = new Hono<AppEnv>()
  .route("/", signUpRoute)
  .route("/", signInRoute)
  .route("/", forgotPasswordRoute)
  .route("/", resetPasswordRoute)
  .route("/", signOutRoute)
  .route("/", sessionRoute)
  .route("/", listOrganizationsRoute)
  .route("/", addOrganizationRoute)
  .route("/", deleteOrganizationRoute)
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
