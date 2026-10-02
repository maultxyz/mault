import { z } from "zod";

export const soundRulesDraftSchema = z.object({
  order: z.array(z.string()),
  enabled: z.record(z.string(), z.boolean()),
});

export type SoundRulesDraftValues = z.infer<typeof soundRulesDraftSchema>;
