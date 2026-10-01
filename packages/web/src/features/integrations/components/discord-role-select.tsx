import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DiscordRoleLabel } from "@/features/integrations/components/discord-role-label";
import { NO_DISCORD_ROLE } from "@/lib/constants/integrations";
import type { DiscordRoleSelectProps } from "@/lib/interfaces/integrations";
import { useTranslation } from "react-i18next";

export function DiscordRoleSelect({
  value,
  roles,
  onChange,
}: DiscordRoleSelectProps) {
  const { t } = useTranslation("integrations");
  return (
    <Select
      value={value ?? NO_DISCORD_ROLE}
      onValueChange={(next) =>
        onChange(!next || next === NO_DISCORD_ROLE ? null : next)
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          {value ? (
            <DiscordRoleLabel
              role={roles.find((r) => r.id === value) ?? null}
              roleId={value}
            />
          ) : (
            t("roles.none")
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_DISCORD_ROLE}>{t("roles.none")}</SelectItem>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id} disabled={!role.canPing}>
            <DiscordRoleLabel role={role} roleId={role.id} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
