import { Badge } from "@/components/ui/badge";
import { DiscordChannelLabel } from "@/features/integrations/components/discord-channel-label";
import { buildChannelUsageRows } from "@/features/integrations/lib/channel-usage";
import type {
  DiscordChannelListProps,
  DiscordChannelUsage,
} from "@/lib/interfaces/integrations";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DiscordChannelList({ integration }: DiscordChannelListProps) {
  const { t } = useTranslation("integrations");
  const rows = buildChannelUsageRows(integration);

  const usageLabel = (usage: DiscordChannelUsage) => {
    switch (usage.kind) {
      case "scans":
        return usage.paused
          ? t("channels.usage.scansPaused")
          : t("channels.usage.scans");
      case "errors":
        return t("channels.usage.errors");
      case "collectionScans":
        return t("channels.usage.collectionScans", {
          collection: usage.collection,
        });
      case "collectionErrors":
        return t("channels.usage.collectionErrors", {
          collection: usage.collection,
        });
      case "rule":
        return t("channels.usage.rule", { rule: usage.rule, game: usage.game });
    }
  };

  const isMuted = (usage: DiscordChannelUsage) =>
    (usage.kind === "scans" && usage.paused) ||
    (usage.kind === "rule" && !usage.isEnabled);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold">{t("channels.heading")}</h3>
        <p className="text-sm text-foreground/70">
          {t("channels.description")}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {t("channels.empty")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {rows.map((row) => {
            const problem = !row.channel
              ? t("channels.missing")
              : row.channel.missingPermissions.length
                ? t("channels.missingPermissions", {
                    permissions: row.channel.missingPermissions.join(", "),
                  })
                : null;
            return (
              <li
                key={row.channelId}
                className="flex flex-col gap-1.5 px-3 py-2 text-sm"
              >
                <DiscordChannelLabel
                  channel={row.channel}
                  channelId={row.channelId}
                />
                <div className="flex flex-wrap gap-1.5">
                  {row.usages.map((usage, index) => (
                    <Badge
                      key={index}
                      variant={isMuted(usage) ? "outline" : "secondary"}
                    >
                      {usageLabel(usage)}
                    </Badge>
                  ))}
                </div>
                {problem && integration.botReachable && (
                  <p className="flex items-center gap-1.5 text-destructive">
                    <IconAlertTriangle size={16} className="shrink-0" />
                    {problem}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
