import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { ShareMonitorLinkDialog } from "@/features/collections/components/share-monitor-link-dialog";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { SessionMonitorView } from "@/features/scanner/components/session-monitor-view";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { computeBinCount } from "@magic-vault/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export default function MonitorPage() {
  const { t } = useTranslation("scanner");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const session = useSessionMonitor(collectionGuid);
  const cardsSource = useMemo(
    () => ({ collectionGuid: collectionGuid ?? "" }),
    [collectionGuid],
  );
  const { locks, currentUserId } = useCollectionLocks();
  const moduleCount = useModuleCount();

  const lock = collectionGuid ? locks[collectionGuid] : undefined;
  const otherViewers = session.viewers.filter(
    (v) => v.userId !== lock?.userId && v.userId !== currentUserId,
  );

  const header = (lock || otherViewers.length > 0) && (
    <div className="flex items-center gap-1 px-1 flex-wrap">
      {lock && (
        <InitialsAvatar
          name={lock.displayName}
          variant="scanner"
          tooltip={t("isScanningTooltip", { name: lock.displayName })}
        />
      )}
      {otherViewers.map((v) => (
        <InitialsAvatar
          key={v.userId}
          name={v.displayName}
          variant="neutral"
          tooltip={t("monitorPage.isWatchingTooltip", { name: v.displayName })}
        />
      ))}
    </div>
  );

  return (
    <SessionMonitorView
      session={session}
      cardsSource={cardsSource}
      header={header}
      toolbarLeading={
        collectionGuid ? (
          <ShareMonitorLinkDialog collectionGuid={collectionGuid} />
        ) : undefined
      }
      binCount={computeBinCount(moduleCount)}
      showBinLocation
    />
  );
}
