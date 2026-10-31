import { authProvider } from "../auth";
import { planLimit } from "./plan-config";

export function organizationLimitForPlan(
  plan: string | undefined,
): number | null {
  return planLimit(plan, "organizations");
}

export async function countOwnedOrganizations(userId: string): Promise<number> {
  const organizations = await authProvider.listUserOrganisations(userId);
  return organizations.filter((organization) => organization.role === "owner")
    .length;
}
