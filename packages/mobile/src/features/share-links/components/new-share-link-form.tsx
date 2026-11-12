import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
  DEFAULT_SHARE_LINK_PURPOSE,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  MONITOR_LINK_EXPIRY_DAYS,
  type ShareLinkPurpose,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SwitchRow } from "@/components/ui/switch-row";
import { createMonitorLink } from "@/features/collections/api/collection-cards";
import { billingQueryOptions } from "@/features/org/api/billing";
import { invalidateShareLinks, shareLinksQueryOptions } from "@/features/share-links/api/share-links";
import { createStorageShareLink } from "@/features/storage/api/storage-share-links";
import { useActiveOrgId } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";
import type { NewShareLinkFormProps } from "@/lib/interfaces/share-links";

export function NewShareLinkForm({ kind, subjectGuid, onCreated, onBack }: NewShareLinkFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const [expiresInDays, setExpiresInDays] = useState<number>(DEFAULT_MONITOR_LINK_EXPIRY_DAYS);
  const [showsPrices, setShowsPrices] = useState(DEFAULT_SHARE_LINK_SHOWS_PRICES);
  const [purpose, setPurpose] = useState<ShareLinkPurpose>(DEFAULT_SHARE_LINK_PURPOSE);
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const isOneHourLink = purpose === "trade" || billing?.longShareLinks === false;

  const create = useMutation({
    mutationFn: async () => {
      const created =
        kind === "storage"
          ? await createStorageShareLink(subjectGuid, expiresInDays, showsPrices, purpose)
          : await createMonitorLink(subjectGuid, expiresInDays, showsPrices, purpose);
      invalidateShareLinks(queryClient);
      const links = await queryClient.fetchQuery({ ...shareLinksQueryOptions(orgId, subjectGuid), staleTime: 0 });
      return links.some((link) => link.guid === created.guid) ? created.guid : null;
    },
    onSuccess: (createdLinkGuid) => onCreated(createdLinkGuid),
  });

  return (
    <PinnedActionsLayout
      actions={
        <>
          <Button label={t("shareLink.create")} loading={create.isPending} onPress={() => create.mutate()} />
          <Button variant="secondary" icon="arrowLeft" label={t("shareLinks.backToLinks")} onPress={onBack} />
        </>
      }
    >
      {create.isError ? <Callout tone="destructive" title={t("shareLink.createFailed")} /> : null}
      <View style={{ gap: SPACING.sm }}>
        <AppText weight="semibold" accessibilityRole="header">
          {t("shareLink.typeLabel")}
        </AppText>
        <SegmentedControl
          options={[
            { value: "view", label: t("shareLink.monitorType") },
            { value: "trade", label: t("shareLink.tradeType") },
          ]}
          value={purpose}
          onChange={(value) => setPurpose(value as ShareLinkPurpose)}
        />
        <AppText size="xs" tone="secondary">
          {purpose === "trade" ? t("shareLink.tradeTypeDescription") : t("shareLink.monitorTypeDescription")}
        </AppText>
      </View>
      {isOneHourLink ? (
        <Callout
          tone="info"
          title={purpose === "trade" ? t("shareLink.tradeOneHourNote") : t("shareLink.monitorOneHourNote")}
        />
      ) : (
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
      )}
      <SwitchRow
        title={t("shareLink.showPrices")}
        description={t("shareLink.showPricesDescription")}
        value={showsPrices}
        onValueChange={setShowsPrices}
      />
    </PinnedActionsLayout>
  );
}
