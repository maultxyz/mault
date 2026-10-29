import { releaseScanLock } from "@/features/collections/api/collections";
import {
  buildMonitorLinkUrl,
  createMonitorLink,
} from "@/features/collections/api/monitor-links";
import { useCollections } from "@/features/collections/api/use-collections";
import { useCollectionLocks } from "@/lib/app-stream";
import { copyTextFromPromise } from "@/lib/clipboard";
import type { ActiveCollectionSessionActions } from "@/lib/interfaces/collections";
import { toast } from "@/lib/toast";
import { DEFAULT_MONITOR_LINK_EXPIRY_DAYS } from "@magic-vault/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

export function useActiveCollectionSessionActions(): ActiveCollectionSessionActions {
  const { t } = useTranslation("collections");
  const { activeCollection } = useCollections();
  const { locks, currentUserId } = useCollectionLocks();
  const [isReleasing, setIsReleasing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const isLockedByMe = !!(
    activeCollection &&
    locks[activeCollection.guid] &&
    locks[activeCollection.guid].userId === currentUserId
  );

  const releaseScanSession = useCallback(async () => {
    if (!activeCollection) return;
    setIsReleasing(true);
    try {
      await releaseScanLock(activeCollection.guid);
      toast.success(t("switcher.sessionReleased"));
    } catch {
      toast.error(t("switcher.releaseFailed"));
    } finally {
      setIsReleasing(false);
    }
  }, [activeCollection, t]);

  const copyMonitorLink = useCallback(async () => {
    if (!activeCollection) return;
    const collectionGuid = activeCollection.guid;
    const created: { url?: string } = {};
    const urlPromise = createMonitorLink(
      collectionGuid,
      DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
    ).then((result) => {
      if (!result.success || !result.data) {
        throw new Error(result.message);
      }
      created.url = buildMonitorLinkUrl(collectionGuid, result.data.token);
      return created.url;
    });
    setIsSharing(true);
    try {
      await copyTextFromPromise(urlPromise);
      toast.success(t("switcher.monitorLinkCopied"), {
        description: t("switcher.monitorLinkCopiedDescription", {
          count: DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
        }),
      });
    } catch {
      if (created.url) {
        toast.error(t("switcher.copyLinkFailed"), {
          description: created.url,
        });
      } else {
        toast.error(t("shareMonitorLink.createFailed"));
      }
    } finally {
      setIsSharing(false);
    }
  }, [activeCollection, t]);

  return {
    isLockedByMe,
    isSharing,
    isReleasing,
    copyMonitorLink,
    releaseScanSession,
  };
}
