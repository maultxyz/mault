import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { platformDiscordGuildQueryOptions } from "@/features/admin/api/discord-channels";
import { channelLabel } from "@/features/integrations/lib/discord-settings";
import { SPACING } from "@/lib/constants/theme";
import type { DiscordGuildTargetFieldsProps } from "@/lib/interfaces/admin-discord";

export function DiscordGuildTargetFields({
  targetKind,
  guilds,
  botReachable,
  guildId,
  targetId,
  onGuildChange,
  onTargetChange,
}: DiscordGuildTargetFieldsProps) {
  const { t } = useTranslation();
  const [openPicker, setOpenPicker] = useState<"guild" | "target" | null>(null);
  const guildQuery = useQuery(platformDiscordGuildQueryOptions(guildId));
  const guild = guildQuery.data ?? null;
  const isGuildLoading = guildQuery.isFetching;
  const channels = guild?.channels ?? [];
  const roles = guild?.roles ?? [];

  const guildName = guildId ? (guilds.find((candidate) => candidate.id === guildId)?.name ?? guildId) : null;
  const emptyTargetLabel =
    targetKind === "channel" ? t("admin.discord.noChannel") : t("admin.discord.linkedRole.noRole");
  const targetLabel = (() => {
    if (!targetId) return null;
    if (targetKind === "channel") return channelLabel(channels, targetId, t, emptyTargetLabel);
    const role = roles.find((candidate) => candidate.id === targetId);
    return role ? `@${role.name}` : t("settings.discord.roles.unknown", { id: targetId });
  })();
  const targetFieldLabel = targetKind === "channel" ? t("admin.discord.channel") : t("admin.discord.linkedRole.role");

  const targetOptions =
    targetKind === "channel"
      ? channels
          .filter((channel) => channel.missingPermissions.length === 0 || channel.id === targetId)
          .map((channel) => ({ value: channel.id, label: channelLabel(channels, channel.id, t, emptyTargetLabel) }))
      : roles
          .filter((role) => role.canAssign || role.id === targetId)
          .map((role) => ({ value: role.id, label: `@${role.name}` }));

  const pickerConfig =
    openPicker === "guild"
      ? {
          title: t("admin.discord.server"),
          options: [
            { value: "", label: t("admin.discord.noServer") },
            ...guilds.map((candidate) => ({ value: candidate.id, label: candidate.name })),
          ],
          selected: [guildId ?? ""],
        }
      : openPicker === "target"
        ? {
            title: targetFieldLabel,
            options: [{ value: "", label: emptyTargetLabel }, ...targetOptions],
            selected: [targetId ?? ""],
          }
        : null;

  const selectOption = (value: string) => {
    const picker = openPicker;
    setOpenPicker(null);
    const nextValue = value || null;
    if (picker === "guild") {
      if (nextValue === guildId) return;
      onGuildChange(nextValue);
      onTargetChange(null);
    } else if (picker === "target") {
      onTargetChange(nextValue);
    }
  };

  return (
    <View style={{ gap: SPACING.md }}>
      <SelectField
        label={t("admin.discord.server")}
        value={guildName}
        placeholder={t("admin.discord.noServer")}
        disabled={!botReachable}
        onPress={() => setOpenPicker("guild")}
      />
      <SelectField
        label={targetFieldLabel}
        value={targetLabel}
        placeholder={isGuildLoading ? t("admin.discord.loadingGuild") : emptyTargetLabel}
        disabled={!guild || isGuildLoading}
        onPress={() => setOpenPicker("target")}
      />
      <OptionSheet
        visible={!!pickerConfig}
        title={pickerConfig?.title ?? ""}
        options={pickerConfig?.options ?? []}
        selected={pickerConfig?.selected ?? []}
        onSelect={selectOption}
        onClose={() => setOpenPicker(null)}
      />
    </View>
  );
}
