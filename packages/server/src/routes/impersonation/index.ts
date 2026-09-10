import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { impersonationAuditRoute } from "./audit";
import { searchUsersRoute } from "./search-users";
import { startImpersonationRoute } from "./start";
import { stopImpersonationRoute } from "./stop";

const router = new Hono<AppEnv>()
  .route("/", searchUsersRoute)
  .route("/", stopImpersonationRoute)
  .route("/", startImpersonationRoute)
  .route("/", impersonationAuditRoute);

export const impersonationRouter = router;
