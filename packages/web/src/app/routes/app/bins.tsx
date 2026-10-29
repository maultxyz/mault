import { MobilePageHeader } from "@/components/mobile-page-header";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  BinConfigsProvider,
  useBinConfigs,
} from "@/features/bins/api/use-bin-configs";
import { AlphabetPanel } from "@/features/bins/components/alphabet-panel";
import { AutoAssignPanel } from "@/features/bins/components/auto-assign-panel";
import { BinConfigPanel } from "@/features/bins/components/bin-config-panel";
import { BinList } from "@/features/bins/components/bin-list";
import { BinRulesMenu } from "@/features/bins/components/bin-rules-menu";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { NonEnglishRulesBanner } from "@/features/bins/components/non-english-rules-banner";
import { PresetSelector } from "@/features/bins/components/preset-selector";
import { RepackPanel } from "@/features/bins/components/repack-panel";
import { RepackTour } from "@/features/bins/components/repack-tour";
import { SortingRulesIntro } from "@/features/bins/components/sorting-rules-intro";
import { SortingRulesTour } from "@/features/bins/components/sorting-rules-tour";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
} from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { IconLayoutGrid } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

function BinsHelpTour({ className }: { className?: string }) {
  const { selectedSet } = useBinConfigs();
  return selectedSet?.isRepackMode ? (
    <RepackTour className={className} />
  ) : (
    <SortingRulesTour className={className} />
  );
}

function MobileBins() {
  const { t } = useTranslation("bins");
  const { selectedBin } = useBinConfigs();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MobilePageHeader
        title={t("page.title")}
        actions={<BinRulesMenu className="shrink-0" />}
      />
      <div
        className={cn(
          "@container min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className={cn(MOBILE_PAGE_BODY_CLASS, "gap-4 pb-20")}>
          <PresetSelector />
          <AutoAssignPanel />
          <RepackPanel />
          <AlphabetPanel />
          <BinConfigPanel />
        </div>
      </div>
      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="absolute bottom-[calc(var(--mobile-nav-space,0px)+1.25rem)] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full px-4 py-2 text-sm font-medium shadow-lg"
          >
            <IconLayoutGrid size={16} />
            {t("binLabel", { number: selectedBin })}
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="overflow-y-auto p-4 flex flex-col gap-4 max-h-[calc(80vh-2rem)]">
            <BinList />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default function BinsPage() {
  const isMobile = useIsMobile();

  const content = isMobile ? (
    <MobileBins />
  ) : (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <section className="col-span-4 lg:col-span-3 overflow-hidden flex flex-col h-full border-r p-2 gap-2 bg-sidebar/70">
        <AutoAssignPanel />
        <BinList />
      </section>
      <section className="col-span-8 lg:col-span-9 overflow-y-auto max-h-full @container p-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <SortingRulesIntro />
          <div className="flex shrink-0 items-center gap-2">
            <BinRulesMenu />
            <BinsHelpTour />
          </div>
        </div>
        <RepackPanel />
        <AlphabetPanel />
        <BinConfigPanel />
      </section>
    </div>
  );

  return (
    <BinConfigsProvider>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <NoGameBanner />
        <NonEnglishRulesBanner />
        {content}
      </div>
    </BinConfigsProvider>
  );
}
