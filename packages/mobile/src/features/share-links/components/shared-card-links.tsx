import { useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import type { SharedCardLink } from "@magic-vault/shared";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { sharedCardLinksQueryOptions } from "@/features/share-links/api/card-share-links";
import { orgShareLinkUrl } from "@/features/share-links/api/share-links";
import { useConfirmRevokeShareLink } from "@/features/share-links/api/use-confirm-revoke-share-link";
import { useRevokeShareLink } from "@/features/share-links/api/use-revoke-share-link";
import { useActiveOrgId } from "@/hooks/use-org";
import { formatShortDate } from "@/lib/dates";
import type { SharedCardLinksProps } from "@/lib/interfaces/share-links";

export function SharedCardLinks({ collectionGuid }: SharedCardLinksProps) {
  const { t, i18n } = useTranslation();
  const orgId = useActiveOrgId();
  const links = useQuery(sharedCardLinksQueryOptions(orgId, collectionGuid));
  const revoke = useRevokeShareLink();
  const confirmRevoke = useConfirmRevokeShareLink();
  const copy = useMutation({
    mutationFn: (link: SharedCardLink) => Clipboard.setStringAsync(orgShareLinkUrl(link)),
    onSuccess: () => AccessibilityInfo.announceForAccessibility(t("shareLinks.cardLinkCopied")),
    onError: () => AccessibilityInfo.announceForAccessibility(t("shareLinks.cardLinkCopyFailed")),
  });

  return (
    <PinnedActionsLayout>
      {copy.isSuccess ? <Callout tone="success" title={t("shareLinks.cardLinkCopied")} /> : null}
      {copy.isError ? <Callout tone="destructive" title={t("shareLinks.cardLinkCopyFailed")} /> : null}
      {revoke.isError ? <Callout tone="destructive" title={t("shareLinks.revokeFailed")} /> : null}
      {links.isLoading ? (
        <ListSkeleton rows={2} />
      ) : links.isError ? (
        <Callout tone="destructive" title={t("shareLinks.loadFailed")} />
      ) : links.data?.length ? (
        <ListGroup>
          {links.data.map((link) => (
            <ListRow
              key={link.guid}
              icon="copy"
              title={link.cardName}
              subtitle={[
                link.setCode?.toUpperCase(),
                t("shareLinks.created", { date: formatShortDate(link.createdAt, i18n.language) }),
              ]
                .filter(Boolean)
                .join(" · ")}
              accessibilityHint={t("shareLinks.cardLinkCopyHint")}
              onPress={() => copy.mutate(link)}
              onLongPress={() => confirmRevoke(() => revoke.mutate(link.guid))}
              longPressLabel={t("shareLinks.revoke")}
            />
          ))}
        </ListGroup>
      ) : (
        <EmptyState
          icon="multiCard"
          title={t("shareLinks.sharedCardsEmpty")}
          description={t("shareLinks.sharedCardsEmptyDescription")}
        />
      )}
    </PinnedActionsLayout>
  );
}
