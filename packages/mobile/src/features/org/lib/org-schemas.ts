import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member"]),
});

export const renameOrgSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
