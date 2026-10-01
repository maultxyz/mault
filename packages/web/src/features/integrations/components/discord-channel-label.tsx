import type { DiscordChannelLabelProps } from "@/lib/interfaces/integrations";
import { IconHash, IconSpeakerphone } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DiscordChannelLabel({
  channel,
  channelId,
}: DiscordChannelLabelProps) {
  const { t } = useTranslation("integrations");
  const Icon = channel?.type === "announcement" ? IconSpeakerphone : IconHash;
  return (
    <span className="flex min-w-0 items-center gap-1">
      <Icon size={16} className="shrink-0 text-foreground/70" />
      <span className="truncate font-medium">
        {channel?.name ?? t("channels.unknown", { id: channelId })}
      </span>
      {channel?.categoryName && (
        <span className="truncate text-foreground/70">
          {t("channels.inCategory", { category: channel.categoryName })}
        </span>
      )}
    </span>
  );
}
