import { z } from "zod";

export const apiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  allowWrite: z.boolean(),
});
