import { LIBRARY_PATH } from "@/lib/constants/nav";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/features/collections/api/use-collections";
import { MobileCollectionActionsMenu } from "@/features/collections/components/mobile-collection-actions-menu";
import { ShareMonitorLinkDialog } from "@/features/collections/components/share-monitor-link-dialog";
import { useMonitorCards } from "@/features/scanner/api/use-monitor-cards";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { MobileSessionMonitor } from "@/features/scanner/components/mobile-session-monitor";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import type { MobileCollectionViewProps } from "@/lib/interfaces/collections";
import { RarityGameKeyContext } from "@/lib/rarity-game-key-context";
import { computeBinCount } from "@magic-vault/shared";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function MobileCollectionView({
  collectionGuid,
}: MobileCollectionViewProps) {
  const { t } = useTranslation("scanner");
  const session = useSessionMonitor(collectionGuid);
  const cardsSource = useMemo(() => ({ collectionGuid }), [collectionGuid]);
  const moduleCount = useModuleCount();
  const { activeCollection, activateCollection, isActivating } =
    useCollections();
  const isActive = activeCollection?.guid === collectionGuid;
  const cards = useMonitorCards(session, cardsSource, isActive, true);

  return (
    <RarityGameKeyContext value={session.collection?.game?.key ?? null}>
      <MobileSessionMonitor
        session={session}
        cards={cards}
        collectionGuid={collectionGuid}
        toolbarLeading={
          <>
            {!isActive && (
              <Button
                variant="outline"
                disabled={isActivating}
                onClick={() => activateCollection(collectionGuid)}
              >
                <IconPlayerPlay />
                {t("monitorPage.setActive")}
              </Button>
            )}
            <ShareMonitorLinkDialog collectionGuid={collectionGuid} />
            <MobileCollectionActionsMenu collectionGuid={collectionGuid} />
          </>
        }
        binCount={computeBinCount(moduleCount)}
        canEditCards={isActive}
        backHref={LIBRARY_PATH}
      />
    </RarityGameKeyContext>
  );
}
