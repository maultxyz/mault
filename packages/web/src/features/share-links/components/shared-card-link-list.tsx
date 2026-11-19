import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { Skeleton } from "@/components/ui/skeleton";
import { sharedCardLinksQueryOptions } from "@/features/cards/api/card-share-links";
import { useOrg } from "@/features/companies/api/use-organization";
import { useShareLinks } from "@/features/share-links/api/use-share-links";
import { SharedCardLinkRow } from "@/features/share-links/components/shared-card-link-row";
import { shareLinkUrl } from "@/features/share-links/lib/share-link-paths";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { copyWithToast } from "@/lib/clipboard";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import { SHARE_LINK_LIST_MAX_HEIGHT_CLASS } from "@/lib/constants/share-links";
import type { SharedCardLinkListProps } from "@/lib/interfaces/share-links";
import { cn } from "@/lib/utils";
import { IconCards } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function SharedCardLinkList({ collectionGuid }: SharedCardLinkListProps) {
  const { t } = useTranslation("share-links");
  const { t: tCommon } = useTranslation("common");
  const isMobile = useIsMobile();
  const { activeOrg } = useOrg();
  const { data: links, isLoading, isError, refetch } = useQuery(
    sharedCardLinksQueryOptions(activeOrg?.id, collectionGuid),
  );
  const { revoke } = useShareLinks(collectionGuid);

  if (isError) {
    return <LoadErrorCallout message={t("loadFailed")} onRetry={() => void refetch()} />;
  }
  if (isLoading || !links) return <Skeleton className="h-14 w-full" />;
  if (links.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconCards}
        title={t("sharedCardsEmpty")}
        description={t("sharedCardsEmptyDescription")}
      />
    );
  }

  return (
    <div
      className={cn(
        isMobile
          ? MOBILE_LIST_CLASS
          : "flex flex-col divide-y divide-border rounded-lg bg-foreground/6",
        SHARE_LINK_LIST_MAX_HEIGHT_CLASS,
      )}
    >
      {links.map((link) => (
        <SharedCardLinkRow
          key={link.guid}
          link={link}
          isRevoking={revoke.isPending && revoke.variables === link.guid}
          onCopy={(copied) =>
            void copyWithToast(
              shareLinkUrl(copied),
              tCommon("shareLink.copied"),
              tCommon("shareLink.copyFailed"),
            )
          }
          onRevoke={(revoked) => revoke.mutate(revoked.guid)}
        />
      ))}
    </div>
  );
}
