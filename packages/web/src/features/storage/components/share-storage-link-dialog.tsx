import { ShareLinkDialog } from "@/components/share-link-dialog";
import {
  buildStorageShareLinkUrl,
  createStorageShareLink,
  revokeStorageShareLinks,
} from "@/features/storage/api/storage-share-links";
import type { ShareStorageLinkDialogProps } from "@/lib/interfaces/share-links";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function ShareStorageLinkDialog({
  locationGuid,
  trigger,
}: ShareStorageLinkDialogProps) {
  const { t } = useTranslation("storage");

  const createLink = useCallback(
    async (expiresInDays: number, showPrices: boolean) => {
      const result = await createStorageShareLink(locationGuid, expiresInDays, showPrices);
      if (!result.success || !result.data) throw new Error(result.message);
      return {
        url: buildStorageShareLinkUrl(locationGuid, result.data.token),
        expiresAt: result.data.expiresAt,
      };
    },
    [locationGuid],
  );

  const revokeLinks = useCallback(async () => {
    const result = await revokeStorageShareLinks(locationGuid);
    if (!result.success) throw new Error(result.message);
  }, [locationGuid]);

  return (
    <ShareLinkDialog
      title={t("shareLink.title")}
      description={t("shareLink.description")}
      revokedMessage={t("shareLink.revoked")}
      createLink={createLink}
      revokeLinks={revokeLinks}
      trigger={trigger}
    />
  );
}
