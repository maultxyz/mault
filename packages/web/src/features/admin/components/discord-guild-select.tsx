import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NO_DISCORD_GUILD } from "@/lib/constants/admin";
import type { DiscordGuildSelectProps } from "@/lib/interfaces/admin";

export function DiscordGuildSelect({
  value,
  guilds,
  emptyLabel,
  disabled,
  onChange,
}: DiscordGuildSelectProps) {
  const label = (guildId: string) => {
    const guild = guilds.find((g) => g.id === guildId);
    return (
      <span className="flex min-w-0 items-center gap-2">
        {guild?.iconUrl && (
          <img src={guild.iconUrl} alt="" className="size-4 rounded-full" />
        )}
        <span className="truncate">{guild?.name ?? guildId}</span>
      </span>
    );
  };

  return (
    <Select
      value={value ?? NO_DISCORD_GUILD}
      disabled={disabled}
      onValueChange={(next) =>
        onChange(!next || next === NO_DISCORD_GUILD ? null : next)
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{value ? label(value) : emptyLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_DISCORD_GUILD}>{emptyLabel}</SelectItem>
        {guilds.map((guild) => (
          <SelectItem key={guild.id} value={guild.id}>
            {label(guild.id)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
