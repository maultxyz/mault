import { Button } from "@/components/ui/button";
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
import { useCollections } from "@/features/collections/api/use-collections";
import { useCollectionCardsSummary } from "@/features/collections/api/use-collection-cards";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { ScannerDebug } from "@/features/scanner/components/scanner-debug";
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
  IconSparkles,
  IconStackPop,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function ScannerControlButton({
  tooltip,
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
      <TooltipContent>{tooltip}</TooltipContent>
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
  const { autoFeed, setAutoFeed, forceFoilType, setForceFoilType } =
    useScannedCards();
  const { totalCount } = useCollectionCardsSummary();
  const { activeCollection } = useCollections();
  const foilOptions = activeCollection?.game?.foilTypes?.length
    ? activeCollection.game.foilTypes
    : [tCards("foil")];
  const canForceScan =
    status === "no-match" || status === "scanning" || status === "captured";
  const isFirstFeed = totalCount === 0;
  const foilTooltip = t("scannerControls.foilTooltip", {
    type: forceFoilType ?? tCards("foilNone"),
  });

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        orientation === "vertical"
          ? "flex-col content-start"
          : "flex-row items-center",
      )}
    >
      <ScannerControlButton
        tooltip={
          status === "no-match"
            ? t("scannerControls.scanAgain")
            : t("scannerControls.scanNow")
        }
        onClick={onForceScan}
        disabled={!canForceScan}
      >
        <IconFocus2 />
      </ScannerControlButton>
      {status === "paused" ? (
        <ScannerControlButton
          tooltip={t("scannerControls.resume")}
          onClick={onResume}
        >
          <IconPlayerPlay />
        </ScannerControlButton>
      ) : (
        <ScannerControlButton
          tooltip={t("scannerControls.pause")}
          onClick={onPause}
        >
          <IconPlayerPause />
        </ScannerControlButton>
      )}
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
          <TooltipContent>{foilTooltip}</TooltipContent>
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
            onClick={() => setAutoFeed(!autoFeed)}
            selected={autoFeed}
          >
            <IconBolt />
          </ScannerControlButton>
          <ScannerControlButton
            tooltip={t("scannerControls.clearDeviceTooltip")}
            onClick={onClearDevice}
            disabled={!isReady || isClearingDevice}
          >
            <IconArrowBarToDown />
          </ScannerControlButton>
        </>
      )}
      <ScannerDebug />
    </div>
  );
}
