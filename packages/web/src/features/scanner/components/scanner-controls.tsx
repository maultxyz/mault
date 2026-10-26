import { useState } from "react";
import { useFoilOptions } from "@/features/cards/api/use-foil-options";
import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCollectionCardsSummary } from "@/features/collections/api/use-collection-cards";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { ForcedSetPicker } from "@/features/scanner/components/forced-set-picker";
import { ScanModeSwitch } from "@/features/scanner/components/scan-mode-switch";
import { ScanRemovalBinSelect } from "@/features/scanner/components/scan-removal-bin-select";
import { ScannerDebug } from "@/features/scanner/components/scanner-debug";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type {
  ScannerControlButtonProps,
  ScannerControlsProps,
} from "@/lib/interfaces/scanner";
import {
  IconBolt,
  IconFocus2,
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
  IconRosette,
  IconSparkles,
  IconStackPop,
} from "@tabler/icons-react";
import { formatElapsed } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  isCardCondition,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function ScannerControlButton({
  tooltip,
  hotkey,
  onClick,
  disabled,
  selected,
  children,
}: ScannerControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={selected ? "outline-selected" : "outline"}
            size="icon"
            onClick={onClick}
            disabled={disabled}
            aria-label={tooltip}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>
        {tooltip}
        {hotkey && <HotkeyHint id={hotkey} />}
      </TooltipContent>
    </Tooltip>
  );
}

export function ScannerControls({
  status,
  orientation = "horizontal",
  isConnected,
  isReady,
  isFeeding,
  isClearingDevice,
  onForceScan,
  onPause,
  onResume,
  onFeed,
  onClearDevice,
}: ScannerControlsProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const {
    autoFeed,
    setAutoFeed,
    forceFoilType,
    setForceFoilType,
    scanCondition,
    setScanCondition,
    sessionScanCount,
    elapsedMs,
  } = useScannedCards();
  const { totalCount } = useCollectionCardsSummary();
  const { isRemoveModeActive, isRemoveModeEnabled, isSorterConnected } =
    useScanRemoval();
  const foilOptions = useFoilOptions();
  const canForceScan =
    status === "no-match" || status === "scanning" || status === "captured";
  const isFirstFeed = totalCount === 0;
  const isPaused = status === "paused";
  const foilTooltip = t("scannerControls.foilTooltip", {
    type: forceFoilType ?? tCards("foilNone"),
  });
  const conditionTooltip = t("scannerControls.conditionTooltip", {
    condition: tCards(`condition.names.${scanCondition}`),
  });
  const { isActive } = useStation();
  const { panelsDocked } = useStations();
  const isMobile = useIsMobile();
  const canFeed = isConnected && isReady && !isFeeding;
  const canClearDevice = isConnected && isReady && !isClearingDevice;
  const isVertical = orientation === "vertical";

  const [setPickerOpen, setSetPickerOpen] = useState(false);

  const cycleFoilType = () => {
    const options = [null, ...foilOptions];
    const next = (options.indexOf(forceFoilType) + 1) % options.length;
    setForceFoilType(options[next]);
  };

  useHotkeys(
    {
      scanPauseResume: isPaused ? onResume : onPause,
      scanNow: canForceScan ? onForceScan : undefined,
      scanFeed: canFeed ? onFeed : undefined,
      scanToggleAutoFeed: isConnected
        ? () => setAutoFeed(!autoFeed)
        : undefined,
      scanCycleFoil: cycleFoilType,
      scanPickSet: () => setSetPickerOpen(true),
      scanClearDevice: canClearDevice ? onClearDevice : undefined,
    },
    isActive && panelsDocked && !isMobile,
  );

  const primaryLabel = !isPaused
    ? t("scannerControls.pause")
    : isRemoveModeActive
      ? t("scannerControls.startRemoving")
      : sessionScanCount === 0
        ? t("scannerControls.start")
        : t("scannerControls.resume");
  const primaryVariant = !isPaused
    ? isRemoveModeActive
      ? "outline-destructive"
      : "outline"
    : isRemoveModeActive
      ? "destructive"
      : "default";

  return (
    <div className={cn("flex flex-col gap-2", isVertical ? "w-44" : "w-full")}>
      <div className={cn("flex gap-2", isVertical ? "flex-col" : "flex-row")}>
        <ScanModeSwitch className="shrink-0" />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={primaryVariant}
                className={cn(!isVertical && "flex-1")}
                onClick={isPaused ? onResume : onPause}
              >
                {isPaused ? <IconPlayerPlay /> : <IconPlayerPause />}
                {primaryLabel}
              </Button>
            }
          />
          <TooltipContent>
            {primaryLabel}
            <HotkeyHint id="scanPauseResume" />
          </TooltipContent>
        </Tooltip>
        <div className="flex gap-2">
          <ButtonGroup>
            <ScannerControlButton
              tooltip={
                status === "no-match"
                  ? t("scannerControls.scanAgain")
                  : t("scannerControls.scanNow")
              }
              hotkey="scanNow"
              onClick={onForceScan}
              disabled={!canForceScan}
            >
              <IconFocus2 />
            </ScannerControlButton>
            {isConnected && (
              <>
                <ScannerControlButton
                  tooltip={
                    isFeeding
                      ? t("scannerControls.feeding")
                      : isFirstFeed
                        ? t("scannerControls.startTooltip")
                        : t("scannerControls.feedTooltip")
                  }
                  hotkey="scanFeed"
                  onClick={onFeed}
                  disabled={!isReady || isFeeding}
                >
                  {isFeeding ? (
                    <IconLoader2 className="animate-spin" />
                  ) : (
                    <IconStackPop />
                  )}
                </ScannerControlButton>
                <ScannerControlButton
                  tooltip={
                    autoFeed
                      ? t("scannerControls.autoFeedOnTooltip")
                      : t("scannerControls.autoFeedOffTooltip")
                  }
                  hotkey="scanToggleAutoFeed"
                  onClick={() => setAutoFeed(!autoFeed)}
                  selected={autoFeed}
                >
                  <IconBolt />
                </ScannerControlButton>
              </>
            )}
          </ButtonGroup>
          <ScannerDebug />
        </div>
      </div>
      {isRemoveModeEnabled && isSorterConnected && <ScanRemovalBinSelect />}
      <div
        className={cn("flex gap-1.5", isVertical ? "flex-col" : "flex-wrap")}
      >
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant={forceFoilType ? "outline-selected" : "outline"}
                      size="sm"
                      aria-label={foilTooltip}
                    >
                      <IconSparkles />
                      {forceFoilType ?? tCards("foilNone")}
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>
              {foilTooltip}
              <HotkeyHint id="scanCycleFoil" />
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={forceFoilType ?? "none"}
              onValueChange={(value: string) =>
                setForceFoilType(value === "none" ? null : value)
              }
            >
              <DropdownMenuRadioItem value="none">
                {tCards("foilNone")}
              </DropdownMenuRadioItem>
              {foilOptions.map((type) => (
                <DropdownMenuRadioItem key={type} value={type}>
                  {type}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant={
                        scanCondition === DEFAULT_CARD_CONDITION
                          ? "outline"
                          : "outline-selected"
                      }
                      size="sm"
                      aria-label={conditionTooltip}
                    >
                      <IconRosette />
                      {scanCondition}
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>{conditionTooltip}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
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
          </DropdownMenuContent>
        </DropdownMenu>
        <ForcedSetPicker open={setPickerOpen} onOpenChange={setSetPickerOpen} />
      </div>
      {(sessionScanCount > 0 || elapsedMs > 0) && (
        <p className="text-xs tabular-nums text-foreground/70">
          {t("scannerControls.sessionSummary", {
            count: sessionScanCount,
            time: formatElapsed(elapsedMs),
          })}
        </p>
      )}
    </div>
  );
}
