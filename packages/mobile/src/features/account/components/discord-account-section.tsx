import { STATUS_MESSAGE_SETTINGS_QUERY_KEY } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  discordAccountLinkQueryOptions,
  generateDiscordAccountLinkCode,
  unlinkDiscordAccount,
} from "@/features/account/api/discord-account";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { DISCORD_ACCOUNT_LINK_POLL_MS, DISCORD_LINK_CODE_CLOCK_TICK_MS } from "@/lib/constants/account";
import { SPACING } from "@/lib/constants/theme";
import type { DiscordAccountSectionProps, PendingDiscordLinkCode } from "@/lib/interfaces/auth";

export function DiscordAccountSection({ onMessage }: DiscordAccountSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const [pending, setPending] = useState<PendingDiscordLinkCode | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const isWaitingForLink = !!pending && isFocused;
  const link = useQuery({
    ...discordAccountLinkQueryOptions(),
    refetchInterval: isWaitingForLink ? DISCORD_ACCOUNT_LINK_POLL_MS : false,
  });

  useEffect(() => {
    if (!isWaitingForLink) return;
    const interval = setInterval(() => setNow(Date.now()), DISCORD_LINK_CODE_CLOCK_TICK_MS);
    return () => clearInterval(interval);
  }, [isWaitingForLink]);

  useEffect(() => {
    if (!pending) return;
    if (link.data) {
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: [STATUS_MESSAGE_SETTINGS_QUERY_KEY] });
      const message = link.data.discordUsername
        ? t("account.profile.discord.linkedAs", { username: link.data.discordUsername })
        : t("account.profile.discord.linked");
      AccessibilityInfo.announceForAccessibility(message);
    } else if (now >= pending.expiresAt) {
      setPending(null);
    }
  }, [pending, now, link.data, queryClient, t]);

  const generate = useMutation({
    mutationFn: generateDiscordAccountLinkCode,
    onSuccess: (code) => {
      setNow(Date.now());
      setPending({ code: code.code, expiresAt: new Date(code.expiresAt).getTime() });
    },
    onError: () => onMessage({ tone: "destructive", text: t("account.profile.discord.generateFailed") }),
  });

  const unlink = useMutation({
    mutationFn: unlinkDiscordAccount,
    onSuccess: () => {
      queryClient.setQueryData(discordAccountLinkQueryOptions().queryKey, null);
      void queryClient.invalidateQueries({ queryKey: [STATUS_MESSAGE_SETTINGS_QUERY_KEY] });
      onMessage({ tone: "success", text: t("account.profile.discord.unlinked") });
    },
    onError: () => onMessage({ tone: "destructive", text: t("account.profile.discord.unlinkFailed") }),
  });

  const confirmUnlink = () =>
    Alert.alert(t("account.profile.discord.unlinkConfirmTitle"), t("account.profile.discord.unlinkConfirmDescription"), [
      { text: t("account.profile.discord.cancel"), style: "cancel" },
      { text: t("account.profile.discord.unlink"), style: "destructive", onPress: () => unlink.mutate() },
    ]);

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    AccessibilityInfo.announceForAccessibility(t("account.profile.discord.copied"));
  };

  const secondsLeft = pending ? Math.max(0, Math.ceil((pending.expiresAt - now) / 1000)) : 0;

  return (
    <SettingsSection title={t("account.profile.discord.heading")} description={t("account.profile.discord.description")}>
      {link.isError && !link.data ? <Callout tone="destructive" title={t("account.profile.discord.loadFailed")} /> : null}
      {link.isPending ? (
        <ListSkeleton rows={1} />
      ) : link.data ? (
        <ListGroup>
          <ListRow
            icon="discord"
            title={
              link.data.discordUsername
                ? t("account.profile.discord.linkedAs", { username: link.data.discordUsername })
                : t("account.profile.discord.linked")
            }
          />
          <ListRow
            icon="logout"
            tone="destructive"
            title={t("account.profile.discord.unlink")}
            disabled={unlink.isPending}
            onPress={confirmUnlink}
          />
        </ListGroup>
      ) : pending ? (
        <ListGroup>
          <View style={{ gap: SPACING.sm, padding: SPACING.lg }}>
            <AppText size="sm" tone="secondary">
              {t("account.profile.discord.codeInstructions")}
            </AppText>
            <AppText
              size="2xl"
              weight="semibold"
              mono
              selectable
              accessibilityLabel={t("account.profile.discord.codeLabel", { code: pending.code.split("").join(" ") })}
            >
              {pending.code}
            </AppText>
            <AppText size="xs" tone="secondary">
              {t("account.profile.discord.expiresIn", { seconds: secondsLeft })}
            </AppText>
          </View>
          <ListRow icon="copy" title={t("account.profile.discord.copyCode")} onPress={() => void copyCode(pending.code)} />
        </ListGroup>
      ) : (
        <ListGroup>
          <ListRow
            icon="discord"
            title={t("account.profile.discord.generate")}
            disabled={generate.isPending}
            onPress={() => generate.mutate()}
          />
        </ListGroup>
      )}
    </SettingsSection>
  );
}
