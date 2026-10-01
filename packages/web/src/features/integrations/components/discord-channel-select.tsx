import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DiscordChannelLabel } from "@/features/integrations/components/discord-channel-label";
import { NO_DISCORD_CHANNEL } from "@/lib/constants/integrations";
import type { DiscordChannelSelectProps } from "@/lib/interfaces/integrations";

export function DiscordChannelSelect({
  value,
  channels,
  emptyLabel,
  disabled,
  onChange,
}: DiscordChannelSelectProps) {
  return (
    <Select
      value={value ?? NO_DISCORD_CHANNEL}
      disabled={disabled}
      onValueChange={(next) =>
        onChange(!next || next === NO_DISCORD_CHANNEL ? null : next)
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          {value ? (
            <DiscordChannelLabel
              channel={channels.find((c) => c.id === value) ?? null}
              channelId={value}
            />
          ) : (
            emptyLabel
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_DISCORD_CHANNEL}>{emptyLabel}</SelectItem>
        {channels.map((channel) => (
          <SelectItem
            key={channel.id}
            value={channel.id}
            disabled={channel.missingPermissions.length > 0}
          >
            <DiscordChannelLabel channel={channel} channelId={channel.id} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
