import type { DiscordRoleLabelProps } from "@/lib/interfaces/integrations";
import { useTranslation } from "react-i18next";

export function DiscordRoleLabel({ role, roleId }: DiscordRoleLabelProps) {
  const { t } = useTranslation("integrations");
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        className="size-2.5 shrink-0 rounded-full bg-foreground/40"
        style={role?.color ? { backgroundColor: role.color } : undefined}
      />
      <span className="truncate font-medium">
        @{role?.name ?? t("roles.unknown", { id: roleId })}
      </span>
    </span>
  );
}
