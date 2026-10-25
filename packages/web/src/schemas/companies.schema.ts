import { z } from "zod";

export const memberRolesSchema = z.object({
  roles: z.record(z.string(), z.enum(["owner", "admin", "member"])),
});

export type MemberRolesFormValues = z.infer<typeof memberRolesSchema>;
