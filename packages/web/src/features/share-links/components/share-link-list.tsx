import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useShareLinks } from "@/features/share-links/api/use-share-links";
import { ShareLinkRow } from "@/features/share-links/components/share-link-row";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import { SHARE_LINK_LIST_MAX_HEIGHT_CLASS } from "@/lib/constants/share-links";
import { cn } from "@/lib/utils";
import type { ShareLinkListProps } from "@/lib/interfaces/share-links";
import { IconLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ShareLinkList({
  subjectGuid,
  onShowQr,
  emptyAction,
}: ShareLinkListProps) {
  const { t } = useTranslation("share-links");
  const isMobile = useIsMobile();
  const { links, isLoading, isError, revoke } = useShareLinks(subjectGuid);

  if (isError) return <Callout variant="error">{t("loadFailed")}</Callout>;
  if (isLoading) return <Skeleton className="h-14 w-full" />;
  if (links.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconLink}
        title={t("dialogEmpty")}
        action={emptyAction}
      />
    );
  }

  return (
    <div
      className={cn(
        isMobile
          ? MOBILE_LIST_CLASS
          : "flex flex-col divide-y divide-border rounded-lg border",
        SHARE_LINK_LIST_MAX_HEIGHT_CLASS,
      )}
    >
      {links.map((link) => (
        <ShareLinkRow
          key={link.guid}
          link={link}
          isRevoking={revoke.isPending && revoke.variables === link.guid}
          onShowQr={onShowQr}
          onRevoke={() => revoke.mutate(link.guid)}
        />
      ))}
    </div>
  );
}
