import { Callout } from "@/components/callout";
import { CardThumbnail } from "@/components/card-thumbnail";
import { Badge } from "@/components/ui/badge";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { SortTestGroupCheckList } from "@/features/bins/components/sort-test-group-check-list";
import type { SortTestResultProps } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";
import { explainSortTest, toRuleCard } from "@magic-vault/shared";
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function SortTestResult({
  card,
  isFoil,
  foilType,
  scannedBinNumber,
}: SortTestResultProps) {
  const { t } = useTranslation("bins");
  const { selectedSet, configs, ruleFieldDefinitions } = useBinConfigs();
  const [openBinNumbers, setOpenBinNumbers] = useState<number[] | null>(null);

  const explanation = useMemo(
    () =>
      explainSortTest({
        card: toRuleCard(card, { isFoil, foilType }),
        binSet: selectedSet,
        configs,
        fieldDefinitions: ruleFieldDefinitions,
      }),
    [card, isFoil, foilType, selectedSet, configs, ruleFieldDefinitions],
  );

  const binLabel = (binNumber: number) =>
    configs.find((config) => config.binNumber === binNumber)?.isCatchAll
      ? t("sortTest.catchAllBin", { number: binNumber })
      : t("binLabel", { number: binNumber });

  const reasonText = () => {
    const bin = explanation.binNumber ?? 0;
    switch (explanation.reason) {
      case "overflow":
        return t("sortTest.reasons.overflow", {
          matched: explanation.matchedBinNumber,
          bin,
        });
      case "pickList":
        return t("sortTest.reasons.pickList", {
          name: explanation.pickListEntryName,
          bin,
        });
      case "alphabet":
        return explanation.alphabetLetter
          ? t("sortTest.reasons.alphabet", {
              letter: explanation.alphabetLetter,
              bin,
            })
          : t("sortTest.reasons.alphabetCatchAll", { bin });
      default:
        return t(`sortTest.reasons.${explanation.reason}`, { bin });
    }
  };

  const testedBinLabel =
    explanation.binNumber != null
      ? binLabel(explanation.binNumber)
      : t("sortTest.noBin");

  const expandedBinNumbers =
    openBinNumbers ??
    [explanation.matchedBinNumber ?? explanation.binNumber].filter(
      (binNumber): binNumber is number => binNumber != null,
    );
  const toggleBin = (binNumber: number) =>
    setOpenBinNumbers(
      expandedBinNumbers.includes(binNumber)
        ? expandedBinNumbers.filter((open) => open !== binNumber)
        : [...expandedBinNumbers, binNumber],
    );

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {t("sortTest.resultAnnouncement", {
          name: card.name,
          bin: testedBinLabel,
        })}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <CardThumbnail
          image={card.image}
          className="w-36 self-center rounded-lg sm:self-start"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">{card.name}</span>
            <span className="text-xs text-foreground/70">
              {[card.setName, card.collectorNumber]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-lg p-3 ring-1 ring-border">
            <div className="flex items-center gap-2">
              <IconArrowRight className="size-4 shrink-0" />
              <span className="text-sm font-semibold">{testedBinLabel}</span>
            </div>
            <p className="text-xs text-foreground/70">{reasonText()}</p>
          </div>
          {scannedBinNumber != null &&
            (scannedBinNumber === explanation.binNumber ? (
              <p className="text-xs text-foreground/70">
                {t("sortTest.scannedTo", { bin: binLabel(scannedBinNumber) })}
              </p>
            ) : (
              <Callout variant="info" icon={IconInfoCircle}>
                {t("sortTest.scannedElsewhere", {
                  scanned: binLabel(scannedBinNumber),
                  tested: testedBinLabel,
                })}
              </Callout>
            ))}
        </div>
      </div>
      {explanation.binChecks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold">
            {t("sortTest.rulesChecked")}
          </h3>
          <div className="flex flex-col divide-y divide-border rounded-lg ring-1 ring-border">
            {explanation.binChecks.map((binCheck) => {
              const isExpanded = expandedBinNumbers.includes(
                binCheck.binNumber,
              );
              return (
                <div key={binCheck.binNumber} className="flex flex-col">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-left"
                    aria-expanded={isExpanded}
                    onClick={() => toggleBin(binCheck.binNumber)}
                  >
                    {binCheck.matched ? (
                      <IconCheck className="size-4 shrink-0 text-success-foreground" />
                    ) : (
                      <IconX className="size-4 shrink-0 text-destructive" />
                    )}
                    <span className="flex-1 text-sm">
                      {binLabel(binCheck.binNumber)}
                    </span>
                    {binCheck.isOverride && !binCheck.isCatchAll && (
                      <Badge variant="outline">{t("sortTest.override")}</Badge>
                    )}
                    <span className="text-xs text-foreground/70">
                      {binCheck.matched
                        ? t("sortTest.matched")
                        : t("sortTest.notMatched")}
                    </span>
                    <IconChevronDown
                      className={cn(
                        "size-4 shrink-0 text-foreground/70 transition-transform motion-reduce:transition-none",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <SortTestGroupCheckList check={binCheck.check} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
