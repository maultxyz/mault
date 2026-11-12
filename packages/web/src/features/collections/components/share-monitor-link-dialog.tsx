import { ShareLinkDialog } from "@/components/share-link-dialog";
import { ShareLinkTriggerButton } from "@/components/share-link-trigger-button";
import {
  buildMonitorLinkUrl,
  createMonitorLink,
  revokeMonitorLinks,
} from "@/features/collections/api/monitor-links";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { ShareMonitorLinkDialogProps } from "@/lib/interfaces/collections";
import { MOBILE_ICON_BUTTON_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import type { ShareLinkOptions } from "@/lib/interfaces/share-links";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function ShareMonitorLinkDialog({
  collectionGuid,
}: ShareMonitorLinkDialogProps) {
  const { t } = useTranslation("collections");
  const isMobile = useIsMobile();

  const createLink = useCallback(
    async ({ purpose, expiresInDays, showPrices }: ShareLinkOptions) => {
      const result = await createMonitorLink(
        collectionGuid,
        expiresInDays,
        showPrices,
        purpose,
      );
      if (!result.success || !result.data) throw new Error(result.message);
      return {
        guid: result.data.guid,
        url: buildMonitorLinkUrl(collectionGuid, result.data.token),
        expiresAt: result.data.expiresAt,
      };
    },
    [collectionGuid],
  );

  const revokeLinks = useCallback(async () => {
    const result = await revokeMonitorLinks(collectionGuid);
    if (!result.success) throw new Error(result.message);
  }, [collectionGuid]);

  return (
    <ShareLinkDialog
      subjectGuid={collectionGuid}
      title={t("shareMonitorLink.title")}
      description={t("shareMonitorLink.description")}
      revokedMessage={t("shareMonitorLink.revoked")}
      createLink={createLink}
      revokeLinks={revokeLinks}
      renderTrigger={(activeLinkCount) => (
        <ShareLinkTriggerButton
          variant="outline"
          size="icon"
          className={cn("shrink-0", isMobile && MOBILE_ICON_BUTTON_CLASS)}
          label={t("shareMonitorLink.trigger")}
          activeLinkCount={activeLinkCount}
          showsTitle
        />
      )}
    />
  );
}
