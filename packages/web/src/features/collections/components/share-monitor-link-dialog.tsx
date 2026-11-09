import { ShareLinkDialog } from "@/components/share-link-dialog";
import { Button } from "@/components/ui/button";
import {
  buildMonitorLinkUrl,
  createMonitorLink,
  revokeMonitorLinks,
} from "@/features/collections/api/monitor-links";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { ShareMonitorLinkDialogProps } from "@/lib/interfaces/collections";
import { MOBILE_ICON_BUTTON_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { IconShare } from "@tabler/icons-react";
import type { ShareLinkOptions } from "@/lib/interfaces/share-links";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function ShareMonitorLinkDialog({
  collectionGuid,
}: ShareMonitorLinkDialogProps) {
  const { t } = useTranslation("collections");
  const isMobile = useIsMobile();

  const createLink = useCallback(
    async ({ expiresInDays, showPrices, holdMinutes }: ShareLinkOptions) => {
      const result = await createMonitorLink(
        collectionGuid,
        expiresInDays,
        showPrices,
        holdMinutes,
      );
      if (!result.success || !result.data) throw new Error(result.message);
      return {
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
      title={t("shareMonitorLink.title")}
      description={t("shareMonitorLink.description")}
      revokedMessage={t("shareMonitorLink.revoked")}
      createLink={createLink}
      revokeLinks={revokeLinks}
      trigger={
        <Button
          variant="outline"
          size="icon"
          className={cn("shrink-0", isMobile && MOBILE_ICON_BUTTON_CLASS)}
          title={t("shareMonitorLink.trigger")}
          aria-label={t("shareMonitorLink.trigger")}
        >
          <IconShare className="size-4" />
        </Button>
      }
    />
  );
}
