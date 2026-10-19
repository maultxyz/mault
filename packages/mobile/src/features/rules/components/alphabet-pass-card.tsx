import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import {
  ALPHABET_PREFIX_MAX_LENGTH,
  clampAlphabetPass,
  getAlphabetPassCount,
  getAlphabetPassLetters,
  getCatchAllBin,
  getNextAlphabetStep,
  getPreviousAlphabetStep,
  type AlphabetStep,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SectionHeader } from "@/components/ui/section-header";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { setAlphabetConfig } from "@/features/rules/api/bin-sets";
import { useActiveOrgId } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";
import type { AlphabetPassCardProps } from "@/lib/interfaces/rules";

export function AlphabetPassCard({ set, bins }: AlphabetPassCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const [deeperOpen, setDeeperOpen] = useState(false);
  const passCount = getAlphabetPassCount(bins);
  const pass = clampAlphabetPass(bins, set.alphabetPass ?? 0);
  const prefix = set.alphabetPrefix ?? "";
  const step = { pass, prefix };
  const letters = getAlphabetPassLetters(bins, pass, prefix);
  const labels = [...letters.values()];
  const nextStep = getNextAlphabetStep(bins, step);
  const previousStep = getPreviousAlphabetStep(bins, step);
  const catchAll = getCatchAllBin(bins);

  const move = useMutation({
    mutationFn: (target: AlphabetStep) => setAlphabetConfig(set.guid, { isAlphabetMode: true, ...target }),
    onSuccess: (next) => queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next),
  });

  const confirm = (target: AlphabetStep) => {
    const startsPile = target.prefix !== "" && target.prefix !== prefix;
    Alert.alert(
      startsPile ? t("rules.alphabet.confirmPileTitle", { prefix: target.prefix }) : t("rules.alphabet.confirmTitle"),
      startsPile ? t("rules.alphabet.confirmPileDescription", { prefix: target.prefix }) : t("rules.alphabet.confirmDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("rules.alphabet.confirm"), onPress: () => move.mutate(target) },
      ],
    );
  };

  if (passCount === 0) return <Callout tone="info" title={t("rules.alphabet.needBins")} />;

  const hint = nextStep
    ? nextStep.prefix !== prefix
      ? t("rules.alphabet.nextPileHint", { prefix: nextStep.prefix })
      : t("rules.alphabet.nextPassHint")
    : prefix
      ? t("rules.alphabet.pileDoneHint", { prefix })
      : t("rules.alphabet.lastPassHint");

  return (
    <View style={{ gap: SPACING.md }}>
      <View style={{ gap: 2 }}>
        <SectionHeader title={t("rules.alphabet.passHeading", { current: pass + 1, total: passCount })} />
        <AppText size="sm" tone="secondary">
          {prefix
            ? t("rules.alphabet.prefixRange", { prefix, from: labels[0], to: labels[labels.length - 1] })
            : t("rules.alphabet.passRange", { from: labels[0], to: labels[labels.length - 1] })}
        </AppText>
      </View>
      <ListGroup>
        {bins.map((bin) => (
          <ListRow
            key={bin.binNumber}
            title={t("rules.bin", { number: bin.binNumber })}
            value={
              bin.binNumber === catchAll?.binNumber
                ? t("rules.catchAll")
                : (letters.get(bin.binNumber) ?? t("rules.alphabet.unusedBin"))
            }
          />
        ))}
      </ListGroup>
      {move.isError ? <Callout tone="destructive" title={t("rules.mode.saveFailed")} /> : null}
      <Callout tone="info" title={hint} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        <Button
          variant="secondary"
          icon="arrowLeft"
          label={t("rules.alphabet.previous")}
          disabled={move.isPending || !previousStep}
          onPress={() => previousStep && confirm(previousStep)}
        />
        <Button
          variant="primary"
          icon={nextStep ? "arrowRight" : "refresh"}
          label={nextStep ? t("rules.alphabet.next") : t("rules.alphabet.startOver")}
          loading={move.isPending}
          onPress={() => confirm(nextStep ?? { pass: 0, prefix: "" })}
        />
        {prefix.length < ALPHABET_PREFIX_MAX_LENGTH ? (
          <Button
            variant="secondary"
            label={t("rules.alphabet.sortDeeper")}
            disabled={move.isPending}
            onPress={() => setDeeperOpen(true)}
          />
        ) : null}
        {prefix ? (
          <Button
            variant="secondary"
            icon="arrowUp"
            label={t("rules.alphabet.upLevel")}
            disabled={move.isPending}
            onPress={() => confirm({ pass: 0, prefix: prefix.slice(0, -1) })}
          />
        ) : null}
      </View>
      <OptionSheet
        visible={deeperOpen}
        title={t("rules.alphabet.sortDeeper")}
        options={labels.map((label) => ({ value: label, label: t("rules.alphabet.sortDeeperItem", { label }) }))}
        selected={[]}
        onSelect={(label) => {
          setDeeperOpen(false);
          confirm({ pass: 0, prefix: label });
        }}
        onClose={() => setDeeperOpen(false)}
      />
    </View>
  );
}
