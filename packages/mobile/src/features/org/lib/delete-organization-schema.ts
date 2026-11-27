import { z } from "zod";

export const deleteOrganizationConfirmationSchema = (organizationName: string) =>
  z.object({
    confirmationName: z.string().refine((typedName) => typedName.trim() === organizationName.trim()),
  });
