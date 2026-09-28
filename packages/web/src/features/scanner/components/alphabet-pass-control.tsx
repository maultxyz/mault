import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAlphabetPass } from "@/features/bins/api/use-alphabet-pass";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { AlphabetPassDialog } from "@/features/bins/components/alphabet-pass-dialog";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import {
  ALPHABET_PREFIX_MAX_LENGTH,
  type AlphabetStep,
} from "@magic-vault/shared";
import {
  IconArrowRight,
  IconArrowUp,
  IconChevronDown,
  IconCornerDownRight,
  IconRefresh,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AlphabetPassControl() {
  const { t } = useTranslation("scanner");
  const { t: tBins } = useTranslation("bins");
  const { isPresetMutating } = useBinConfigs();
  const { isTimerActive } = useScannedCards();
  const {
    isActive,
    prefix,
    nextStep,
    pass,
    passCount,
    letters,
    from,
    to,
    isLastPass,
  } = useAlphabetPass();
  const [pending, setPending] = useState<AlphabetStep | null>(null);

  if (!isActive || passCount === 0) return null;

  const isDisabled = isPresetMutating || isTimerActive;
  const target = nextStep ?? { pass: 0, prefix: "" };
  const startsPile = target.prefix !== prefix;
  const passLabels = [...letters.values()];
  const canSortDeeper = prefix.length < ALPHABET_PREFIX_MAX_LENGTH;

  const controls = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {prefix && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isDisabled}
          onClick={() => setPending({ pass: 0, prefix: prefix.slice(0, -1) })}
        >
          <IconArrowUp /> {tBins("alphabetPanel.upLevel")}
        </Button>
      )}
      {canSortDeeper && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isDisabled}
              />
            }
          >
            <IconCornerDownRight />
            {tBins("alphabetPanel.sortDeeper")}
            <IconChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {passLabels.map((label) => (
              <DropdownMenuItem
                key={label}
                onClick={() => setPending({ pass: 0, prefix: label })}
              >
                {tBins("alphabetPanel.sortDeeperItem", { label })}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isDisabled || (isLastPass && passCount === 1 && prefix === "")}
        onClick={() => setPending(target)}
      >
        {isLastPass ? (
          <>
            <IconRefresh /> {tBins("alphabetPanel.startOver")}
          </>
        ) : (
          <>
            {startsPile
              ? tBins("alphabetPanel.nextPile", { prefix: target.prefix })
              : tBins("alphabetPanel.next")}{" "}
            <IconArrowRight />
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="rounded-lg border p-2 flex flex-col gap-2 flex-none">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium">
          {t("alphabetPassControl.range", { from, to })}
        </span>
        <span className="text-xs text-foreground/70">
          {tBins("alphabetPanel.passHeading", {
            current: pass + 1,
            total: passCount,
          })}
        </span>
      </div>
      {isTimerActive ? (
        <Tooltip>
          <TooltipTrigger render={<div />}>{controls}</TooltipTrigger>
          <TooltipContent>{t("alphabetPassControl.stopFirst")}</TooltipContent>
        </Tooltip>
      ) : (
        controls
      )}
      <AlphabetPassDialog
        pending={pending}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
