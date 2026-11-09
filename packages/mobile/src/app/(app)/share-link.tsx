import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, ScrollView, Share, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { QrCode } from "@/components/ui/qr-code";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SwitchRow } from "@/components/ui/switch-row";
import {
  buildMonitorLinkUrl,
  createMonitorLink,
  revokeMonitorLinks,
} from "@/features/collections/api/collection-cards";
import {
  buildStorageShareLinkUrl,
  createStorageShareLink,
  revokeStorageShareLinks,
} from "@/features/storage/api/storage-share-links";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { useTheme } from "@/hooks/use-theme";
import { formatDateTime } from "@/lib/dates";
import { QR_CODE_MAX_SIZE } from "@/lib/constants/share-links";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { CreatedShareLink, ShareLinkKind } from "@/lib/interfaces/share-links";
import {
  DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  MONITOR_LINK_EXPIRY_DAYS,
} from "@magic-vault/shared";

export default function ShareLinkScreen() {
  const { kind, guid } = useLocalSearchParams<{ kind: ShareLinkKind; guid: string }>();
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const panelWidth = usePanelWidth();
  const isStorage = kind === "storage";
  const [expiresInDays, setExpiresInDays] = useState<number>(DEFAULT_MONITOR_LINK_EXPIRY_DAYS);
  const [showsPrices, setShowsPrices] = useState(DEFAULT_SHARE_LINK_SHOWS_PRICES);
  const [link, setLink] = useState<CreatedShareLink | null>(null);

  const create = useMutation({
    mutationFn: async (): Promise<CreatedShareLink> => {
      if (isStorage) {
        const created = await createStorageShareLink(guid, expiresInDays, showsPrices);
        return { url: buildStorageShareLinkUrl(guid, created.token), expiresAt: created.expiresAt };
      }
      const created = await createMonitorLink(guid, expiresInDays, showsPrices);
      return { url: buildMonitorLinkUrl(guid, created.token), expiresAt: created.expiresAt };
    },
    onSuccess: (created) => {
      setLink(created);
      AccessibilityInfo.announceForAccessibility(t("shareLink.created"));
    },
  });
  const revoke = useMutation({
    mutationFn: () => (isStorage ? revokeStorageShareLinks(guid) : revokeMonitorLinks(guid)),
    onSuccess: () => {
      setLink(null);
      AccessibilityInfo.announceForAccessibility(t("shareLink.revoked"));
    },
  });

  const confirmRevoke = () =>
    Alert.alert(
      t("shareLink.revokeTitle"),
      isStorage ? t("shareLink.storageRevokeDescription") : t("shareLink.collectionRevokeDescription"),
      [
        { text: t("shareLink.cancel"), style: "cancel" },
        { text: t("shareLink.revokeAll"), style: "destructive", onPress: () => revoke.mutate() },
      ],
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={isStorage ? t("shareLink.storageTitle") : t("shareLink.collectionTitle")}
        subtitle={isStorage ? t("shareLink.storageDescription") : t("shareLink.collectionDescription")}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, gap: SPACING.xl }}>
        {create.isError ? <Callout tone="destructive" title={t("shareLink.createFailed")} /> : null}
        {revoke.isError ? <Callout tone="destructive" title={t("shareLink.revokeFailed")} /> : null}
        {revoke.isSuccess && !link ? <Callout tone="success" title={t("shareLink.revoked")} /> : null}
        <View style={{ gap: SPACING.sm }}>
          <AppText weight="semibold" accessibilityRole="header">
            {t("shareLink.expiryLabel")}
          </AppText>
          <SegmentedControl
            options={MONITOR_LINK_EXPIRY_DAYS.map((days) => ({
              value: String(days),
              label: t("shareLink.expiryOption", { count: days }),
            }))}
            value={String(expiresInDays)}
            onChange={(value) => setExpiresInDays(Number(value))}
          />
        </View>
        <SwitchRow
          title={t("shareLink.showPrices")}
          description={t("shareLink.showPricesDescription")}
          value={showsPrices}
          onValueChange={setShowsPrices}
        />
        {link ? (
          <View style={{ alignItems: "center", gap: SPACING.md }}>
            <QrCode
              value={link.url}
              size={Math.min(panelWidth - SCREEN_GUTTER * 2, QR_CODE_MAX_SIZE)}
              accessibilityLabel={t("shareLink.qrLabel")}
            />
            <AppText size="xs" tone="secondary">
              {t("shareLink.qrHint")}
            </AppText>
            <AppText selectable size="sm" style={{ textAlign: "center" }}>
              {link.url}
            </AppText>
            <AppText size="xs" tone="secondary">
              {t("shareLink.expiresAt", { date: formatDateTime(link.expiresAt, i18n.language) })}
            </AppText>
            <Button
              size="lg"
              icon="share"
              label={t("shareLink.share")}
              style={{ alignSelf: "stretch" }}
              onPress={() => void Share.share({ message: link.url, url: link.url })}
            />
          </View>
        ) : null}
        <Button
          size="lg"
          variant={link ? "secondary" : "primary"}
          label={link ? t("shareLink.createAnother") : t("shareLink.create")}
          loading={create.isPending}
          onPress={() => create.mutate()}
        />
        <Button variant="destructive" label={t("shareLink.revokeAll")} loading={revoke.isPending} onPress={confirmRevoke} />
      </ScrollView>
    </View>
  );
}
