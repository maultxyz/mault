import {
  BinConfigsProvider,
  useBinConfigs,
} from "@/features/bins/api/use-bin-configs";
import { AlphabetPanel } from "@/features/bins/components/alphabet-panel";
import { AutoAssignPanel } from "@/features/bins/components/auto-assign-panel";
import { BinConfigPanel } from "@/features/bins/components/bin-config-panel";
import { BinList } from "@/features/bins/components/bin-list";
import { MobileBins } from "@/features/bins/components/mobile-bins";
import { BinRulesMenu } from "@/features/bins/components/bin-rules-menu";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { NonEnglishRulesBanner } from "@/features/bins/components/non-english-rules-banner";
import { RepackPanel } from "@/features/bins/components/repack-panel";
import { RepackTour } from "@/features/bins/components/repack-tour";
import { SortingRulesIntro } from "@/features/bins/components/sorting-rules-intro";
import { SortingRulesTour } from "@/features/bins/components/sorting-rules-tour";
import { useIsMobile } from "@/hooks/use-is-mobile";

function BinsHelpTour({ className }: { className?: string }) {
  const { selectedSet } = useBinConfigs();
  return selectedSet?.isRepackMode ? (
    <RepackTour className={className} />
  ) : (
    <SortingRulesTour className={className} />
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
