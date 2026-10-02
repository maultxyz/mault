import { z } from "zod";

export const organizationNameSchema = z.object({ name: z.string().min(1) });

export type OrganizationNameFormValues = z.infer<typeof organizationNameSchema>;

export const orgInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});

export type OrgInviteFormValues = z.infer<typeof orgInviteSchema>;

export const memberRolesSchema = z.object({
  roles: z.record(z.string(), z.enum(["owner", "admin", "member"])),
});

export type MemberRolesFormValues = z.infer<typeof memberRolesSchema>;
