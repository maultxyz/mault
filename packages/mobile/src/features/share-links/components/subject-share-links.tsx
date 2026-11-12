import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { revokeMonitorLinks } from "@/features/collections/api/collection-cards";
import { invalidateShareLinks, shareLinksQueryOptions } from "@/features/share-links/api/share-links";
import { useRevokeShareLink } from "@/features/share-links/api/use-revoke-share-link";
import { ShareLinkList } from "@/features/share-links/components/share-link-list";
import { revokeStorageShareLinks } from "@/features/storage/api/storage-share-links";
import { useActiveOrgId } from "@/hooks/use-org";
import { SHARE_LINK_LIST_MAX_HEIGHT } from "@/lib/constants/share-links";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { SubjectShareLinksProps } from "@/lib/interfaces/share-links";

export function SubjectShareLinks({ kind, subjectGuid, onSelect, onNew }: SubjectShareLinksProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const links = useQuery(shareLinksQueryOptions(orgId, subjectGuid));
  const revokeOne = useRevokeShareLink();
  const revokeAll = useMutation({
    mutationFn: () => (kind === "storage" ? revokeStorageShareLinks(subjectGuid) : revokeMonitorLinks(subjectGuid)),
    onSuccess: () => AccessibilityInfo.announceForAccessibility(t("shareLink.revoked")),
    onError: () => AccessibilityInfo.announceForAccessibility(t("shareLink.revokeFailed")),
    onSettled: () => invalidateShareLinks(queryClient),
  });
  const hasLinks = !!links.data?.length;

  const confirmRevokeAll = () =>
    Alert.alert(
      t("shareLink.revokeTitle"),
      kind === "storage" ? t("shareLink.storageRevokeDescription") : t("shareLink.collectionRevokeDescription"),
      [
        { text: t("shareLink.cancel"), style: "cancel" },
        { text: t("shareLink.revokeAll"), style: "destructive", onPress: () => revokeAll.mutate() },
      ],
    );

  return (
    <View style={{ gap: SPACING.xl }}>
      {links.isError ? <Callout tone="destructive" title={t("shareLinks.loadFailed")} /> : null}
      {revokeOne.isError ? <Callout tone="destructive" title={t("shareLinks.revokeFailed")} /> : null}
      {revokeAll.isError ? <Callout tone="destructive" title={t("shareLink.revokeFailed")} /> : null}
      {revokeAll.isSuccess && !hasLinks ? <Callout tone="success" title={t("shareLink.revoked")} /> : null}
      {links.isLoading ? (
        <ListSkeleton rows={2} />
      ) : hasLinks ? (
        <ScrollView
          style={{ maxHeight: SHARE_LINK_LIST_MAX_HEIGHT, marginHorizontal: -SCREEN_GUTTER }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER }}
          nestedScrollEnabled
        >
          <ShareLinkList
            links={links.data ?? []}
              onSelect={(link) => onSelect(link.guid)}
            onRevoke={(link) => revokeOne.mutate(link.guid)}
          />
        </ScrollView>
      ) : links.data ? (
        <EmptyState
          icon="share"
          title={t("shareLinks.subjectEmptyTitle")}
          description={t("shareLinks.subjectEmptyDescription")}
        />
      ) : null}
      <View style={{ gap: SPACING.sm }}>
        <Button icon="plus" label={t("shareLinks.newLink")} onPress={onNew} />
        {hasLinks ? (
          <Button
            variant="destructive"
            label={t("shareLink.revokeAll")}
            loading={revokeAll.isPending}
            onPress={confirmRevokeAll}
          />
        ) : null}
      </View>
    </View>
  );
}
