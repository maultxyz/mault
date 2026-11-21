import { Callout } from "@/components/callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlphabetPass } from "@/features/bins/api/use-alphabet-pass";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { AlphabetPassDialog } from "@/features/bins/components/alphabet-pass-dialog";
import {
  ALPHABET_PREFIX_MAX_LENGTH,
  getCatchAllBin,
  type AlphabetStep,
} from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconChevronDown,
  IconCornerDownRight,
  IconRefresh,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AlphabetPanel() {
  const { t } = useTranslation("bins");
  const { configs, isPresetMutating } = useBinConfigs();
  const {
    isActive,
    prefix,
    nextStep,
    previousStep,
    pass,
    passCount,
    labels,
    singleLetterLabels,
    sortsOneLetterPerBin,
    from,
    to,
    nextPile,
    isLastPass,
  } = useAlphabetPass();
  const [pending, setPending] = useState<AlphabetStep | null>(null);

  if (!isActive) return null;

  if (passCount === 0) {
    return (
      <Callout>
        {t("alphabetPanel.needBins")}
      </Callout>
    );
  }

  const catchAll = getCatchAllBin(configs);
  const canSortDeeper =
    prefix.length < ALPHABET_PREFIX_MAX_LENGTH && singleLetterLabels.length > 0;

  const hint = nextPile
    ? t("alphabetPanel.nextPileHint", { pile: nextPile })
    : prefix
      ? t("alphabetPanel.pileDoneHint", { prefix })
      : t("alphabetPanel.lastPassHint");

  return (
    <div className="flex flex-col gap-4 md:gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-sm font-semibold">
            {t("alphabetPanel.passHeading", {
              current: pass + 1,
              total: passCount,
            })}
          </h2>
          <p className="text-sm text-foreground/70">
            {sortsOneLetterPerBin
              ? t("alphabetPanel.passRange", { from, to })
              : t("alphabetPanel.rangePassRange", { from, to })}
          </p>
        </div>
        {prefix && (
          <Button
            type="button"
            variant="outline"
            disabled={isPresetMutating}
            onClick={() => setPending({ pass: 0, prefix: prefix.slice(0, -1) })}
          >
            <IconArrowUp /> {t("alphabetPanel.upLevel")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-4 gap-2">
        {configs.map((config) => (
          <div
            key={config.binNumber}
            className="flex items-center justify-between gap-2 rounded-card bg-card p-3 md:p-2.5"
          >
            <span className="text-sm font-medium">
              {t("binLabel", { number: config.binNumber })}
            </span>
            {config.binNumber === catchAll?.binNumber ? (
              <Badge variant="default">{t("catchAll")}</Badge>
            ) : labels.has(config.binNumber) ? (
              <span className="text-lg font-semibold font-heading">
                {labels.get(config.binNumber)}
              </span>
            ) : (
              <span className="text-sm text-foreground/70">
                {t("alphabetPanel.unusedBin")}
              </span>
            )}
          </div>
        ))}
      </div>

      <Callout>{hint}</Callout>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          disabled={isPresetMutating || !previousStep}
          onClick={() => previousStep && setPending(previousStep)}
        >
          <IconArrowLeft /> {t("alphabetPanel.previous")}
        </Button>
        {canSortDeeper && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPresetMutating}
                />
              }
            >
              <IconCornerDownRight />
              {t("alphabetPanel.sortDeeper")}
              <IconChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {singleLetterLabels.map((label) => (
                <DropdownMenuItem
                  key={label}
                  onClick={() => setPending({ pass: 0, prefix: label })}
                >
                  {t("alphabetPanel.sortDeeperItem", { label })}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isLastPass ? (
          <Button
            type="button"
            disabled={isPresetMutating || (passCount === 1 && !prefix)}
            onClick={() => setPending({ pass: 0, prefix: "" })}
          >
            <IconRefresh /> {t("alphabetPanel.startOver")}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={isPresetMutating}
            onClick={() => nextStep && setPending(nextStep)}
          >
            {t("alphabetPanel.nextPile", { pile: nextPile })}{" "}
            <IconArrowRight />
          </Button>
        )}
      </div>

      <AlphabetPassDialog pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}
