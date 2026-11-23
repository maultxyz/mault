import { ORG_SETTINGS_MANAGER_ROLES } from "./constants/org-settings.constant";
import type { OrgRole } from "./interfaces/organization.interface";

export function canManageOrgSettings(orgRole: OrgRole | null | undefined): boolean {
  return !!orgRole && ORG_SETTINGS_MANAGER_ROLES.includes(orgRole);
}
