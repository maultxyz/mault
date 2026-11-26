import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFoilOptions } from "@/features/cards/api/use-foil-options";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { ForcedSetSubmenu } from "@/features/scanner/components/forced-set-submenu";
import { ScanOptionsSubmenuTrigger } from "@/features/scanner/components/scan-options-submenu-trigger";
import { forcedSetSummary } from "@/features/scanner/lib/forced-set-summary";
import { FOIL_NONE_VALUE } from "@/lib/constants/scanner";
import type { ScanOptionsMenuProps } from "@/lib/interfaces/scanner";
import {
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  isCardCondition,
} from "@magic-vault/shared";
import {
  IconAdjustmentsHorizontal,
  IconRosette,
  IconSparkles,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScanOptionsMenu({
  open,
  onOpenChange,
  setSubmenuOpen,
  onSetSubmenuOpenChange,
}: ScanOptionsMenuProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const {
    forceFoilType,
    setForceFoilType,
    scanCondition,
    setScanCondition,
    forceSetCodes,
  } = useScannedCards();
  const foilOptions = useFoilOptions();

  const foilValue = forceFoilType ?? tCards("foilNone");
  const setValue = forcedSetSummary(forceSetCodes, t);
  const changedValues = [
    scanCondition === DEFAULT_CARD_CONDITION ? null : scanCondition,
    forceFoilType,
    forceSetCodes.length > 0 ? setValue : null,
  ].filter((value) => value !== null);
  const buttonLabel =
    changedValues.length > 0
      ? changedValues.join(" · ")
      : t("scannerControls.scanOptions");
  const accessibleLabel = t("scannerControls.scanOptionsLabel", {
    condition: tCards(`condition.names.${scanCondition}`),
    foil: foilValue,
    set: setValue,
  });

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) onSetSubmenuOpenChange(false);
    onOpenChange(nextOpen);
  };

  return (
    <DropdownMenu open={open} onOpenChange={changeOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant={
                    changedValues.length > 0 ? "outline-selected" : "outline"
                  }
                  aria-label={accessibleLabel}
                >
                  <IconAdjustmentsHorizontal />
                  <span className="max-w-40 truncate">{buttonLabel}</span>
                </Button>
              }
            />
          }
        />
        <TooltipContent>
          {accessibleLabel}
          <HotkeyHint id="scanPickSet" />
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        <DropdownMenuSub>
          <ScanOptionsSubmenuTrigger
            icon={<IconRosette />}
            label={t("scannerControls.conditionMenu")}
            value={scanCondition}
          />
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={scanCondition}
              onValueChange={(value: string) => {
                if (isCardCondition(value)) setScanCondition(value);
              }}
            >
              {CARD_CONDITIONS.map((condition) => (
                <DropdownMenuRadioItem key={condition} value={condition}>
                  {tCards(`condition.names.${condition}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <ScanOptionsSubmenuTrigger
            icon={<IconSparkles />}
            label={t("scannerControls.foilMenu")}
            value={foilValue}
          />
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={forceFoilType ?? FOIL_NONE_VALUE}
              onValueChange={(value: string) =>
                setForceFoilType(value === FOIL_NONE_VALUE ? null : value)
              }
            >
              <DropdownMenuRadioItem value={FOIL_NONE_VALUE}>
                {tCards("foilNone")}
              </DropdownMenuRadioItem>
              {foilOptions.map((type) => (
                <DropdownMenuRadioItem key={type} value={type}>
                  {type}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <ForcedSetSubmenu
          open={setSubmenuOpen}
          onOpenChange={onSetSubmenuOpenChange}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
