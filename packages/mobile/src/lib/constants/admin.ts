import type { AdminSection } from "@/lib/interfaces/admin";

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { key: "cards", route: "/admin/cards", icon: "multiCard", requiresPlatformAdmin: false },
  { key: "users", route: "/admin/users", icon: "impersonate", requiresPlatformAdmin: false },
  { key: "plans", route: "/admin/plans", icon: "plans", requiresPlatformAdmin: true },
  { key: "discord", route: "/admin/discord", icon: "discord", requiresPlatformAdmin: false },
  { key: "sounds", route: "/admin/sounds", icon: "music", requiresPlatformAdmin: false },
  { key: "deleted", route: "/admin/deleted", icon: "restore", requiresPlatformAdmin: false },
];
