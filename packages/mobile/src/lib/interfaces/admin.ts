import type { ReactNode } from "react";
import type { IconName } from "@/lib/interfaces/ui";

export interface PlatformRole {
  role: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
}

export interface AdminSection {
  key: "cards" | "users" | "plans" | "discord" | "sounds" | "deleted";
  route: "/admin/cards" | "/admin/users" | "/admin/plans" | "/admin/discord" | "/admin/sounds" | "/admin/deleted";
  icon: IconName;
  requiresPlatformAdmin: boolean;
}

export interface AdminGateProps {
  requiresPlatformAdmin?: boolean;
  children: ReactNode;
}
