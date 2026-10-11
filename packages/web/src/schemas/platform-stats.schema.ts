import { PLATFORM_STAT_KEYS } from "@magic-vault/shared";
import { z } from "zod";

export const platformStatsSchema = z.object({
  guildId: z.string().nullable(),
  channelId: z.string().nullable(),
  stats: z.array(z.enum(PLATFORM_STAT_KEYS)),
});

export type PlatformStatsFormValues = z.infer<typeof platformStatsSchema>;
