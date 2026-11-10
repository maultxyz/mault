import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  MOBILE_COUNT_BUTTON_CLASS,
  MOBILE_ICON_BUTTON_CLASS,
} from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { CardHoldsButton } from "@/features/card-holds/components/card-holds-button";
import { ShareMonitorLinkDialog } from "@/features/collections/components/share-monitor-link-dialog";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { SessionMonitorView } from "@/features/scanner/components/session-monitor-view";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { computeBinCount } from "@magic-vault/shared";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useCollectionLocks } from "@/lib/app-stream";

export default function MonitorPage() {
  const { t } = useTranslation(["scanner", "common"]);
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const session = useSessionMonitor(collectionGuid);
  const cardsSource = useMemo(
    () => ({ collectionGuid: collectionGuid ?? "" }),
    [collectionGuid],
  );
  const { locks, currentUserId } = useCollectionLocks();
  const moduleCount = useModuleCount();
  const isMobile = useIsMobile();
  const { collections, activeCollection, activateCollection, isActivating } =
    useCollections();
  const monitoredCollectionName = collections.find(
    (collection) => collection.guid === collectionGuid,
  )?.name;
  const isActive =
    !!collectionGuid && activeCollection?.guid === collectionGuid;

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
    <>
      {!isMobile && (
        <h1 className="sr-only">
          {monitoredCollectionName ?? t("common:nav.collections")}
        </h1>
      )}
      <SessionMonitorView
        session={session}
        cardsSource={cardsSource}
        header={header}
        toolbarLeading={
          collectionGuid ? (
            <>
              {isMobile && !isActive && (
                <Button
                  variant="outline"
                  disabled={isActivating}
                  onClick={() => activateCollection(collectionGuid)}
                >
                  <IconPlayerPlay />
                  {t("monitorPage.setActive")}
                </Button>
              )}
              <CardHoldsButton
                scope={{ kind: "collection", guid: collectionGuid }}
                className={
                  isMobile
                    ? cn(MOBILE_ICON_BUTTON_CLASS, MOBILE_COUNT_BUTTON_CLASS)
                    : undefined
                }
              />
              <ShareMonitorLinkDialog collectionGuid={collectionGuid} />
            </>
          ) : undefined
        }
        binCount={computeBinCount(moduleCount)}
        showBinLocation
        backHref={isMobile ? "/app/monitor" : COLLECTIONS_PATH}
        canEditCards={isActive}
      />
    </>
  );
}
