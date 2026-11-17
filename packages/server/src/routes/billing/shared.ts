import {
  BILLING_INTERVALS,
  DEFAULT_BILLING_INTERVAL,
  DEFAULT_PAID_PLAN,
  PAID_PLAN_KEYS,
} from "@magic-vault/shared";
import { z } from "zod";

export { getWebUrl as webUrl } from "../../lib/constants/urls";

export const checkoutInputSchema = z.object({
  plan: z.enum(PAID_PLAN_KEYS).default(DEFAULT_PAID_PLAN),
  interval: z.enum(BILLING_INTERVALS).default(DEFAULT_BILLING_INTERVAL),
});
