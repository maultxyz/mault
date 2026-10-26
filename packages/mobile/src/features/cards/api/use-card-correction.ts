import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import {
  matchScanBin,
  resolveScanBin,
  toRuleCard,
  type PlayingCard,
  type ScanRoutingContext,
  type ScannedCard,
} from "@magic-vault/shared";
import { invalidateCollectionCards, updateCollectionCard } from "@/features/collections/api/collection-cards";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useActiveOrgId } from "@/hooks/use-org";
import type { CardCorrection } from "@/lib/interfaces/cards";

export function useCardCorrection(guid: string): CardCorrection {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const rules = useRulesData();
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(useActiveOrgId()));
  const promptEnabled = orgSettings?.correctionBinPrompt ?? true;

  const moveTo = useMutation({
    mutationFn: ({ scanId, binNumber }: { scanId: string; binNumber: number }) =>
      updateCollectionCard(guid, scanId, { binNumber }),
    onSettled: () => invalidateCollectionCards(queryClient, guid),
  });

  const correction = useMutation({
    mutationFn: ({ entry, card }: { entry: ScannedCard; card: PlayingCard }) =>
      updateCollectionCard(guid, entry.scanId, {
        card: { ...card, distance: 0, confidence: 1 },
        binNumber: entry.binNumber,
      }),
    onSettled: () => invalidateCollectionCards(queryClient, guid),
  });

  const promptMove = (entry: ScannedCard, card: PlayingCard) => {
    const currentBin = entry.binNumber;
    if (!promptEnabled || currentBin == null || rules.collection?.guid !== guid) return;
    const stays =
      !!rules.activeSet?.isChaosMode &&
      rules.bins.some((bin) => bin.binNumber === currentBin && !bin.isCatchAll && !bin.isDisabled);
    const ruleCard = toRuleCard(
      { ...card, distance: 0, confidence: 1 },
      { isFoil: !!entry.isFoil, foilType: entry.foilType ?? null },
    );
    const routingContext: ScanRoutingContext = {
      binSet: rules.activeSet,
      configs: rules.bins,
      fieldDefinitions: rules.fieldDefinitions,
      binContents: [],
      countCardsInBin: () => 0,
      isBinFull: () => false,
      binRoom: () => Number.POSITIVE_INFINITY,
      createRuleId: () => "",
    };
    const decision = resolveScanBin(ruleCard, routingContext);
    const pickListBin = decision.action === "route" ? decision.pickListMatch?.bin : undefined;
    const target = stays ? currentBin : (pickListBin ?? matchScanBin(ruleCard, routingContext))?.binNumber;

    if (target == null) {
      Alert.alert(t("binCorrection.noBin.title", { name: card.name }), t("binCorrection.noBin.description"), [
        { text: t("binCorrection.ok") },
      ]);
      return;
    }
    if (target === currentBin) {
      Alert.alert(
        t("binCorrection.staysIn.title", { name: card.name, bin: target }),
        t("binCorrection.staysIn.description"),
        [{ text: t("binCorrection.ok") }],
      );
      return;
    }
    Alert.alert(
      t("binCorrection.move.title", { name: card.name, to: target }),
      t("binCorrection.move.description", { from: currentBin, to: target }),
      [
        { text: t("binCorrection.leave", { bin: currentBin }), style: "cancel" },
        { text: t("binCorrection.moved", { bin: target }), onPress: () => moveTo.mutate({ scanId: entry.scanId, binNumber: target }) },
      ],
    );
  };

  return {
    correct: async (entry, card) => {
      await correction.mutateAsync({ entry, card });
      promptMove(entry, card);
    },
    isPending: correction.isPending,
  };
}
