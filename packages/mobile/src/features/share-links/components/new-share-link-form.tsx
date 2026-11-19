import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  DEFAULT_SHARE_LINK_LENGTHS,
  DEFAULT_SHARE_LINK_PURPOSE,
  DEFAULT_SHARE_LINK_REQUIRES_GUEST_CONTACT,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  defaultMonitorLinkExpiryDays,
  HOURS_PER_DAY,
  longestMonitorLinkExpiryDays,
  shareLinkDurationOfHours,
  type ShareLinkPurpose,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SwitchRow } from "@/components/ui/switch-row";
import { createMonitorLink } from "@/features/collections/api/collection-cards";
import { billingQueryOptions } from "@/features/org/api/billing";
import { invalidateShareLinks, shareLinksQueryOptions } from "@/features/share-links/api/share-links";
import { createStorageShareLink } from "@/features/storage/api/storage-share-links";
import { useActiveOrgId } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";
import type { NewShareLinkFormProps } from "@/lib/interfaces/share-links";

export function NewShareLinkForm({ kind, subjectGuid, initialPurpose, onCreated, onBack }: NewShareLinkFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const [chosenExpiryDays, setChosenExpiryDays] = useState<number | null>(null);
  const [showsPrices, setShowsPrices] = useState(DEFAULT_SHARE_LINK_SHOWS_PRICES);
  const [requiresGuestContact, setRequiresGuestContact] = useState(DEFAULT_SHARE_LINK_REQUIRES_GUEST_CONTACT);
  const [purpose, setPurpose] = useState<ShareLinkPurpose>(initialPurpose ?? DEFAULT_SHARE_LINK_PURPOSE);
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const lengths = billing?.shareLinkLengths ?? DEFAULT_SHARE_LINK_LENGTHS;
  const expiresInDays = chosenExpiryDays ?? defaultMonitorLinkExpiryDays(lengths.monitorLinkExpiryDays);
  const isFixedLengthLink = purpose === "trade" || billing?.longShareLinks === false;
  const expiryLabel = (days: number) => t("shareLink.expiryOption", { count: days });
  const durationLabel = (hours: number) => {
    const duration = shareLinkDurationOfHours(hours);
    return duration.unit === "days"
      ? t("shareLink.durationDays", { count: duration.count })
      : t("shareLink.durationHours", { count: duration.count });
  };

  const create = useMutation({
    mutationFn: async () => {
      const created =
        kind === "storage"
          ? await createStorageShareLink(subjectGuid, expiresInDays, showsPrices, purpose, requiresGuestContact)
          : await createMonitorLink(subjectGuid, expiresInDays, showsPrices, purpose, requiresGuestContact);
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
          <Button variant="secondary" label={t("shareLinks.backToLinks")} onPress={onBack} />
        </>
      }
    >
      {create.isError ? <Callout tone="destructive" title={t("shareLink.createFailed")} /> : null}
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("shareLink.typeLabel")} />
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
      {isFixedLengthLink ? (
        <Callout
          tone="info"
          title={
            purpose === "trade"
              ? t("shareLink.tradeLengthNote", { duration: durationLabel(lengths.tradeLinkHours) })
              : t("shareLink.monitorShortLengthNote", {
                  duration: durationLabel(lengths.restrictedShareLinkHours),
                  longestDuration: durationLabel(
                    longestMonitorLinkExpiryDays(lengths.monitorLinkExpiryDays) * HOURS_PER_DAY,
                  ),
                })
          }
        />
      ) : (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("shareLink.expiryLabel")} />
          <SegmentedControl
            options={lengths.monitorLinkExpiryDays.map((days) => ({
              value: String(days),
              label: expiryLabel(days),
            }))}
            value={String(expiresInDays)}
            onChange={(value) => setChosenExpiryDays(Number(value))}
          />
        </View>
      )}
      <SwitchRow
        title={t("shareLink.showPrices")}
        description={t("shareLink.showPricesDescription")}
        value={showsPrices}
        onValueChange={setShowsPrices}
      />
      {purpose === "trade" ? (
        <SwitchRow
          title={t("shareLink.requireGuestContact")}
          description={t("shareLink.requireGuestContactDescription")}
          value={requiresGuestContact}
          onValueChange={setRequiresGuestContact}
        />
      ) : null}
    </PinnedActionsLayout>
  );
}
