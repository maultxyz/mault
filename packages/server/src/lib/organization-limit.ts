import { authProvider } from "../auth";

export async function countOwnedOrganizations(userId: string): Promise<number> {
  const organizations = await authProvider.listUserOrganisations(userId);
  return organizations.filter((organization) => organization.role === "owner")
    .length;
}
