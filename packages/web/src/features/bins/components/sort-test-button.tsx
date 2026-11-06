import { CardThumbnail } from "@/components/card-thumbnail";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { SortTestGroupCheckList } from "@/features/bins/components/sort-test-group-check-list";
import { getRandomSampleCards } from "@/features/cards/api/card-search";
import { useCollections } from "@/features/collections/api/use-collections";
import type { SortTestButtonProps } from "@/lib/interfaces/bins";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  explainSortTest,
  toRuleCard,
  type PlayingCard,
} from "@magic-vault/shared";
import {
  IconArrowRight,
  IconCards,
  IconCheck,
  IconChevronDown,
  IconRefresh,
  IconTestPipe,
  IconX,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function SortTestButton({ disabled }: SortTestButtonProps) {
  const { t } = useTranslation("bins");
  const { activeCollection } = useCollections();
  const { selectedSet, configs, ruleFieldDefinitions } = useBinConfigs();
  const [isOpen, setIsOpen] = useState(false);
  const [card, setCard] = useState<PlayingCard | null>(null);
  const [openBinNumbers, setOpenBinNumbers] = useState<number[] | null>(null);
  const gameKey = activeCollection?.game?.key;
  const lang = activeCollection?.lang ?? "en";

  const draw = useMutation({
    mutationFn: () => getRandomSampleCards(gameKey ?? "", lang, 1),
    onSuccess: (result) => {
      if (result.success && result.data) {
        setCard(result.data[0] ?? null);
        setOpenBinNumbers(null);
        return;
      }
      toast.error(result.message || t("sortTest.loadFailed"));
    },
    onError: () => toast.error(t("sortTest.loadFailed")),
  });

  const explanation = useMemo(
    () =>
      card
        ? explainSortTest({
            card: toRuleCard(card, { isFoil: false }),
            binSet: selectedSet,
            configs,
            fieldDefinitions: ruleFieldDefinitions,
          })
        : null,
    [card, selectedSet, configs, ruleFieldDefinitions],
  );

  const binLabel = (binNumber: number) =>
    configs.find((config) => config.binNumber === binNumber)?.isCatchAll
      ? t("sortTest.catchAllBin", { number: binNumber })
      : t("binLabel", { number: binNumber });

  const reasonText = () => {
    if (!explanation) return "";
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

  const expandedBinNumbers =
    openBinNumbers ??
    (explanation
      ? [explanation.matchedBinNumber ?? explanation.binNumber].filter(
          (binNumber): binNumber is number => binNumber != null,
        )
      : []);
  const toggleBin = (binNumber: number) =>
    setOpenBinNumbers(
      expandedBinNumbers.includes(binNumber)
        ? expandedBinNumbers.filter((open) => open !== binNumber)
        : [...expandedBinNumbers, binNumber],
    );

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={() => {
          setIsOpen(true);
          if (gameKey) draw.mutate();
        }}
      >
        <IconTestPipe />
        {t("sortTest.button")}
      </Button>
      <DynamicDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        className="sm:max-w-2xl md:max-h-[85dvh]"
        title={t("sortTest.title")}
        description={t("sortTest.description", { name: selectedSet?.name })}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("sortTest.close")}
            </Button>
            <Button
              disabled={!gameKey || draw.isPending}
              onClick={() => draw.mutate()}
            >
              <IconRefresh />
              {t("sortTest.nextCard")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p role="status" className="sr-only">
            {!draw.isPending && card && explanation
              ? t("sortTest.resultAnnouncement", {
                  name: card.name,
                  bin:
                    explanation.binNumber != null
                      ? binLabel(explanation.binNumber)
                      : t("sortTest.noBin"),
                })
              : ""}
          </p>
          {!gameKey ? (
            <EmptyState
              icon={IconCards}
              title={t("sortTest.noGameTitle")}
              description={t("sortTest.noGameDescription")}
            />
          ) : draw.isPending ? (
            <div className="flex gap-4">
              <Skeleton className="aspect-[2.5/3.5] w-36 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          ) : !card || !explanation ? (
            <EmptyState
              icon={IconCards}
              title={
                draw.isSuccess
                  ? t("sortTest.noCardsTitle")
                  : t("sortTest.loadFailed")
              }
              description={
                draw.isSuccess ? t("sortTest.noCardsDescription") : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
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
                        .join(" \u00b7 ")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 rounded-lg p-3 ring-1 ring-border">
                    <div className="flex items-center gap-2">
                      <IconArrowRight className="size-4 shrink-0" />
                      <span className="text-sm font-semibold">
                        {explanation.binNumber != null
                          ? binLabel(explanation.binNumber)
                          : t("sortTest.noBin")}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/70">{reasonText()}</p>
                  </div>
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
                              <Badge variant="outline">
                                {t("sortTest.override")}
                              </Badge>
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
          )}
        </div>
      </DynamicDialog>
    </>
  );
}
