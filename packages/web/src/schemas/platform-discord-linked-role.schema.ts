import { z } from "zod";

export const platformDiscordLinkedRoleSchema = z.object({
  guildId: z.string().nullable(),
  roleId: z.string().nullable(),
});

export type PlatformDiscordLinkedRoleFormValues = z.infer<
  typeof platformDiscordLinkedRoleSchema
>;
