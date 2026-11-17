import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import * as Crypto from "expo-crypto";
import {
  releasedPickListNameAfterCorrection,
  resolveCorrectedScanBin,
  toRuleCard,
  type AutoAssignTarget,
  type BinConfig,
  type PlayingCard,
  type ScanRoutingContext,
  type ScannedCard,
} from "@magic-vault/shared";
import { invalidateCollectionCards, updateCollectionCard } from "@/features/collections/api/collection-cards";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { markPickListFound, saveBinConfig } from "@/features/rules/api/bin-sets";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { binSaveInputWithRules } from "@/features/rules/lib/bin-rule-transfer";
import { useActiveOrgId } from "@/hooks/use-org";
import type { CardCorrection } from "@/lib/interfaces/cards";

export function useCardCorrection(guid: string): CardCorrection {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const rules = useRulesData();
  const orgId = useActiveOrgId();
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(orgId));
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

  const refreshBinSets = () => queryClient.invalidateQueries({ queryKey: binSetsQueryOptions(orgId).queryKey });

  const saveAutoAssign = (bin: BinConfig, target: AutoAssignTarget) => {
    void saveBinConfig(binSaveInputWithRules(bin, target.rules, rules.gameGuid))
      .then(refreshBinSets)
      .catch((error: unknown) => console.warn("Saving the learned auto-assign rule failed", error));
  };

  const recordPickListMove = (binNumber: number, name: string | undefined, delta: number) => {
    const binGuid = rules.bins.find((bin) => bin.binNumber === binNumber)?.guid;
    if (!name || !binGuid) return;
    void markPickListFound(binGuid, { name, delta })
      .then(refreshBinSets)
      .catch((error: unknown) => console.warn("Updating the pick list failed", error));
  };

  const promptMove = (entry: ScannedCard, card: PlayingCard) => {
    const currentBin = entry.binNumber;
    if (!promptEnabled || currentBin == null || rules.collection?.guid !== guid) return;
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
      createRuleId: () => Crypto.randomUUID(),
    };
    const corrected = resolveCorrectedScanBin(ruleCard, currentBin, routingContext);
    if (corrected.bin && corrected.autoAssignTarget) saveAutoAssign(corrected.bin, corrected.autoAssignTarget);
    const target = corrected.bin?.binNumber;
    const releasedPickListName = releasedPickListNameAfterCorrection(
      entry.card.name,
      currentBin,
      corrected,
      rules.bins,
    );

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
        {
          text: t("binCorrection.moved", { bin: target }),
          onPress: () => {
            recordPickListMove(currentBin, releasedPickListName, -1);
            recordPickListMove(target, corrected.pickListName, 1);
            moveTo.mutate({ scanId: entry.scanId, binNumber: target });
          },
        },
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
