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
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { ForcedSetPicker } from "@/features/scanner/components/forced-set-picker";
import { ScannerDebug } from "@/features/scanner/components/scanner-debug";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type {
  ScannerControlButtonProps,
  ScannerControlsProps,
} from "@/lib/interfaces/scanner";
import {
  IconArrowBarToDown,
  IconBolt,
  IconFocus2,
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
  IconRotate2,
  IconSparkles,
  IconStackPop,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
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
  isResettingDevice,
  onForceScan,
  onPause,
  onResume,
  onFeed,
  onClearDevice,
  onResetDevice,
  sessionFeed = false,
  sessionLive = false,
  onStop,
  onAutoFeedChange,
}: ScannerControlsProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const { autoFeed, setAutoFeed, forceFoilType, setForceFoilType } =
    useScannedCards();
  const { totalCount } = useCollectionCardsSummary();
  const foilOptions = useFoilOptions();
  const canForceScan =
    status === "no-match" || status === "scanning" || status === "captured";
  const isFirstFeed = totalCount === 0;
  const foilTooltip = t("scannerControls.foilTooltip", {
    type: forceFoilType ?? tCards("foilNone"),
  });
  const { isActive } = useStation();
  const { panelsDocked } = useStations();
  const isMobile = useIsMobile();
  const canFeed = (sessionFeed || (isConnected && isReady)) && !isFeeding;
  const canClearDevice =
    !sessionLive && isConnected && isReady && !isClearingDevice;

  const [setPickerOpen, setSetPickerOpen] = useState(false);

  const cycleFoilType = () => {
    const options = [null, ...foilOptions];
    const next = (options.indexOf(forceFoilType) + 1) % options.length;
    setForceFoilType(options[next]);
  };
  const toggleAutoFeed = () => {
    const next = !autoFeed;
    if (onAutoFeedChange) onAutoFeedChange(next);
    else setAutoFeed(next);
  };

  useHotkeys(
    {
      scanPauseResume: status === "paused" ? onResume : onPause,
      scanNow: canForceScan && !sessionFeed ? onForceScan : undefined,
      scanFeed: canFeed ? onFeed : undefined,
      scanToggleAutoFeed:
        isConnected || sessionLive ? toggleAutoFeed : undefined,
      scanCycleFoil: cycleFoilType,
      scanPickSet: () => setSetPickerOpen(true),
      scanClearDevice: sessionLive
        ? onStop
        : canClearDevice
          ? onClearDevice
          : undefined,
    },
    isActive && panelsDocked && !isMobile,
  );

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        orientation === "vertical"
          ? "flex-col content-start"
          : "flex-row items-center",
      )}
    >
      <ButtonGroup orientation={orientation}>
        {status === "paused" ? (
          <ScannerControlButton
            tooltip={t("scannerControls.resume")}
            hotkey="scanPauseResume"
            onClick={onResume}
          >
            <IconPlayerPlay />
          </ScannerControlButton>
        ) : (
          <ScannerControlButton
            tooltip={t("scannerControls.pause")}
            hotkey="scanPauseResume"
            onClick={onPause}
          >
            <IconPlayerPause />
          </ScannerControlButton>
        )}
        <ScannerControlButton
          tooltip={
            status === "no-match"
              ? t("scannerControls.scanAgain")
              : t("scannerControls.scanNow")
          }
          hotkey="scanNow"
          onClick={onForceScan}
          disabled={!canForceScan || sessionLive}
        >
          <IconFocus2 />
        </ScannerControlButton>
      </ButtonGroup>
      {(isConnected || sessionFeed) && (
        <ButtonGroup orientation={orientation}>
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
            disabled={(!isReady && !sessionFeed) || isFeeding}
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
            onClick={toggleAutoFeed}
            selected={autoFeed}
          >
            <IconBolt />
          </ScannerControlButton>
          <ScannerControlButton
            tooltip={
              sessionLive
                ? t("scannerControls.stopPiScan")
                : t("scannerControls.clearDeviceTooltip")
            }
            hotkey={sessionLive ? undefined : "scanClearDevice"}
            onClick={sessionLive ? (onStop ?? onClearDevice) : onClearDevice}
            disabled={sessionLive ? false : !isReady || isClearingDevice}
          >
            <IconArrowBarToDown />
          </ScannerControlButton>
          <ScannerControlButton
            tooltip={t("scannerControls.resetToNeutralTooltip")}
            onClick={onResetDevice}
            disabled={!isReady || isResettingDevice || sessionLive}
          >
            {isResettingDevice ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconRotate2 />
            )}
          </ScannerControlButton>
        </ButtonGroup>
      )}
      <ButtonGroup orientation={orientation}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant={forceFoilType ? "outline-selected" : "outline"}
                      size="icon"
                      aria-label={foilTooltip}
                    >
                      <IconSparkles />
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
        <ForcedSetPicker open={setPickerOpen} onOpenChange={setSetPickerOpen} />
      </ButtonGroup>
      <ScannerDebug />
    </div>
  );
}
