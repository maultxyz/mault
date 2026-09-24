import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { getDebugCards } from "@/features/scanner/lib/debug-cards";
import { useForceCpuVectorize } from "@/features/scanner/lib/force-cpu-vectorize";
import { useRole } from "@/hooks/use-role";
import { apiPost } from "@/lib/api/client";
import {
  IconAlertTriangle,
  IconBug,
  IconCards,
  IconCpu,
  IconPhotoOff,
  IconStack2,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

let mockCardIndex = 0;

export function ScannerDebug() {
  const { t } = useTranslation("scanner");
  const { isAdmin } = useRole();
  const { addCard, addUnmatchedCard } = useScannedCards();
  const { activeCollection } = useCollections();
  const [forceCpu, setForceCpu] = useForceCpuVectorize();

  if (!isAdmin) return null;

  const debugCards = getDebugCards(activeCollection?.game?.key);

  const handleSimulateScan = () => {
    const cards = debugCards.mockCards;
    const card = cards[mockCardIndex % cards.length];
    mockCardIndex++;
    addCard(card);
  };

  const handleSimulateMultiMatch = () => {
    const { card, imageUrl, alternates } = debugCards.multiMatch;
    addCard(card, imageUrl, alternates);
  };

  const handleSimulateNoMatch = () => {
    addUnmatchedCard(debugCards.multiMatch.imageUrl);
  };

  const handleForceError = () => {
    if (!activeCollection) return;
    apiPost(`/api/collections/${activeCollection.guid}/debug/error`, {}).catch(
      () => {},
    );
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("scannerDebug.heading")}
                >
                  <IconBug className="size-3.5" />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{t("scannerDebug.heading")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-mono">
            {t("scannerDebug.heading")}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleSimulateScan}>
            <IconCards className="size-3.5" />
            {t("scannerDebug.simulateScan")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSimulateMultiMatch}>
            <IconStack2 className="size-3.5" />
            {t("scannerDebug.simulateMultiMatch")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSimulateNoMatch}>
            <IconPhotoOff className="size-3.5" />
            {t("scannerDebug.simulateNoMatch")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={forceCpu}
            onCheckedChange={setForceCpu}
          >
            <IconCpu className="size-3.5" />
            {t("scannerDebug.forceCpu")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuItem
            onClick={handleForceError}
            disabled={!activeCollection}
            variant="destructive"
          >
            <IconAlertTriangle className="size-3.5" />
            {t("scannerDebug.forceError")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
