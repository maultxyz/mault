import { Hono } from "hono";
import { isBillingEnabled } from "../../lib/stripe";
import type { AppEnv } from "../../middleware/auth";
import { checkoutBillingRoute } from "./checkout";
import { getBillingRoute } from "./get";
import { portalBillingRoute } from "./portal";

const router = new Hono<AppEnv>();

router.use("*", async (c, next) => {
  if (!isBillingEnabled()) {
    return c.json({ success: false, message: "Billing is not enabled." }, 404);
  }
  await next();
});

router.route("/", getBillingRoute);
router.route("/", checkoutBillingRoute);
router.route("/", portalBillingRoute);

export { router as billingRouter };
