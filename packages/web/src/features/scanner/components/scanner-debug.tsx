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
import { useUnmatchedRateToast } from "@/features/scanner/api/use-unmatched-rate-toast";
import { getDebugCards } from "@/features/scanner/lib/debug-cards";
import { useForceCpuVectorize } from "@/features/scanner/lib/force-cpu-vectorize";
import { useIgnoreIrSensors } from "@/features/scanner/lib/ignore-ir-sensors";
import { showScanGiftReveal } from "@/features/scanner/lib/scan-gift-reveal-store";
import { collectionCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePriceSource } from "@/hooks/use-price-source";
import { useRole } from "@/hooks/use-role";
import { SCAN_GIFT_REVEAL_DEBUG_PRICE } from "@/lib/constants/scan-gift-reveal";
import { PRICE_SOURCE_FIELDS } from "@magic-vault/shared";
import { apiPost } from "@/lib/api/client";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBug,
  IconCards,
  IconCpu,
  IconEyeOff,
  IconGift,
  IconPhotoOff,
  IconStack2,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

let mockCardIndex = 0;
let giftRevealDebugIndex = 0;

export function ScannerDebug() {
  const { t } = useTranslation("scanner");
  const { isAdmin } = useRole();
  const { addCard, addUnmatchedCard } = useScannedCards();
  const { activeCollection } = useCollections();
  const [forceCpu, setForceCpu] = useForceCpuVectorize();
  const [ignoreIrSensors, setIgnoreIrSensors] = useIgnoreIrSensors();
  const { showToast: showUnmatchedRateToast } = useUnmatchedRateToast();
  const { source: priceSource } = usePriceSource();
  const queryClient = useQueryClient();

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

  const handleSimulateGiftReveal = async () => {
    const latestCardsPage = activeCollection
      ? await queryClient
          .fetchQuery(collectionCardsPageQueryOptions(activeCollection.guid, ALL_CARDS_QUERY, 0))
          .catch(() => null)
      : null;
    const scannedCards = latestCardsPage?.items ?? [];
    if (scannedCards.length === 0) {
      toast.info(t("scannerDebug.giftRevealNeedsCard"));
      return;
    }
    const scannedCard = scannedCards[giftRevealDebugIndex % scannedCards.length];
    giftRevealDebugIndex++;
    showScanGiftReveal({
      scanId: scannedCard.scanId,
      collectionGuid: activeCollection?.guid ?? null,
      cardName: scannedCard.card.name,
      setName: scannedCard.card.setName ?? null,
      image: scannedCard.card.image,
      isFoil: !!scannedCard.isFoil,
      price: SCAN_GIFT_REVEAL_DEBUG_PRICE,
      currency: PRICE_SOURCE_FIELDS[priceSource].currency,
    });
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
                  <IconBug />
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
          <DropdownMenuItem onClick={() => void handleSimulateGiftReveal()}>
            <IconGift className="size-3.5" />
            {t("scannerDebug.simulateGiftReveal")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={showUnmatchedRateToast}>
            <IconAlertCircle className="size-3.5" />
            {t("scannerDebug.showUnmatchedRateToast")}
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
          <DropdownMenuCheckboxItem
            checked={ignoreIrSensors}
            onCheckedChange={setIgnoreIrSensors}
          >
            <IconEyeOff className="size-3.5" />
            {t("scannerDebug.ignoreIrSensors")}
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
