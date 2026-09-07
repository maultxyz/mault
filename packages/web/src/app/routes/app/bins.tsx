import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  BinConfigsProvider,
  useBinConfigs,
} from "@/features/bins/api/use-bin-configs";
import { BinConfigPanel } from "@/features/bins/components/bin-config-panel";
import { BinList } from "@/features/bins/components/bin-list";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { NonEnglishRulesBanner } from "@/features/bins/components/non-english-rules-banner";
import { PresetSelector } from "@/features/bins/components/preset-selector";
import { SortingRulesTour } from "@/features/bins/components/sorting-rules-tour";
import { useCollections } from "@/features/collections/api/use-collections";
import { CollectionSwitcher } from "@/features/collections/components/collection-switcher";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { IconLayoutGrid } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

function MobileBins() {
  const { t } = useTranslation("bins");
  const { selectedBin } = useBinConfigs();

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div className="size-full overflow-y-auto @container p-4">
        <BinConfigPanel />
      </div>
      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full px-4 py-2 text-sm font-medium shadow-lg"
          >
            <IconLayoutGrid size={16} />
            {t("binsPage.binLabel", { number: selectedBin })}
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="overflow-y-auto p-4 flex flex-col gap-4 max-h-[calc(80vh-2rem)]">
            <CollectionSwitcher />
            <PresetSelector />
            <BinList />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default function BinsPage() {
  const isMobile = useIsMobile();
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const { activeCollection } = useCollections();
  const navigate = useNavigate();

  const seenGuid = useRef(activeCollection?.guid);
  useEffect(() => {
    if (
      activeCollection &&
      activeCollection.guid !== seenGuid.current &&
      activeCollection.guid !== collectionGuid
    ) {
      navigate(`/app/collections/${activeCollection.guid}/bins`, {
        replace: true,
      });
    }
    seenGuid.current = activeCollection?.guid;
  }, [activeCollection, collectionGuid, navigate]);

  const content = isMobile ? (
    <MobileBins />
  ) : (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <section className="col-span-4 lg:col-span-3 overflow-hidden flex flex-col h-full border-r p-2 gap-2 bg-sidebar/70">
        <CollectionSwitcher />
        <PresetSelector />
        <BinList />
      </section>
      <section className="relative col-span-8 lg:col-span-9 overflow-y-auto max-h-full @container p-4">
        <SortingRulesTour className="absolute top-2 right-2 z-10" />
        <BinConfigPanel />
      </section>
    </div>
  );

  return (
    <BinConfigsProvider collectionGuid={collectionGuid}>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <NoGameBanner />
        <NonEnglishRulesBanner />
        {content}
      </div>
    </BinConfigsProvider>
  );
}
