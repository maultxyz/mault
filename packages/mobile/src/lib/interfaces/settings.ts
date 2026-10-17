import type { ReactNode } from "react";
import type { IconName } from "@/lib/interfaces/ui";
import type { Control } from "react-hook-form";
import type { OrgSettingsDraftValues } from "@/lib/interfaces/forms";

export interface OrgSettingsDraft {
  control: Control<OrgSettingsDraftValues>;
  savedPrimaryColor: string | null;
  isLoading: boolean;
  isDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  save: () => void;
  discard: () => void;
}

export interface ThemeColorOption {
  name: string;
  value: string;
  fg: string;
}

export interface SettingsSectionLink {
  path:
    | "/settings/general"
    | "/settings/scanning"
    | "/settings/pricing"
    | "/settings/organization"
    | "/settings/billing"
    | "/settings/integrations";
  key: string;
  icon: IconName;
}

export interface SettingsPageProps {
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  onSave: () => void;
  onDiscard: () => void;
  children: ReactNode;
}

export type OrgRole = "owner" | "admin" | "member";

export interface OrgMember {
  id: string;
  userId: string;
  role: OrgRole;
  name: string;
  email: string;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: OrgRole;
  status: string;
}

export interface OrgDetails {
  name: string;
  members: OrgMember[];
  invitations: OrgInvitation[];
  canManageMembers: boolean;
  canRename: boolean;
}

export interface NeonFullOrganization {
  name: string;
  members?: { id: string; userId: string; role: OrgRole; user?: { name?: string; email?: string } }[];
  invitations?: { id: string; email: string; role: OrgRole; status: string }[];
}
