import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WatcherStack } from "@/components/ui/watcher-stack";
import { CollectionPreviewStack } from "@/features/collections/components/collection-preview-stack";
import { ReleaseSessionButton } from "@/features/collections/components/release-session-button";
import { ScanningPill } from "@/features/collections/components/scanning-pill";
import { useShiftClick } from "@/hooks/use-shift-click";
import {
  collectionViewPath,
  COLLECTION_TILE_ACTIVE_CLASS,
  COLLECTION_TILE_CLASS,
  COLLECTION_TILE_LIVE_CLASS,
  COLLECTION_TILE_SELECTED_CLASS,
  monitorCollectionPath,
} from "@/lib/constants/collections";
import type { CollectionTileProps } from "@/lib/interfaces/collections";
import { cn } from "@/lib/utils";
import {
  IconEdit,
  IconEraser,
  IconHeartRateMonitor,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function CollectionTile({
  collection,
  isActive,
  isActivating,
  isMutating,
  scannerLock,
  isOwnSession,
  watchers,
  isSelected,
  onToggleSelect,
  onActivate,
  onEdit,
  onEmpty,
  onDelete,
}: CollectionTileProps) {
  const { t } = useTranslation("collections");
  const { t: tScanner } = useTranslation("scanner");
  const viewPath = isActive ? "/app" : collectionViewPath(collection.guid);
  const hasLiveInfo = (scannerLock && !isOwnSession) || watchers.length > 0;
  const { onMouseDown: onSelectMouseDown, consumeShift } = useShiftClick();

  return (
    <article
      className={cn(
        COLLECTION_TILE_CLASS,
        isSelected
          ? COLLECTION_TILE_SELECTED_CLASS
          : scannerLock
            ? COLLECTION_TILE_LIVE_CLASS
            : isActive && COLLECTION_TILE_ACTIVE_CLASS,
      )}
    >
      <Link to={viewPath} aria-label={collection.name} className="block">
        <CollectionPreviewStack images={collection.previewImages} />
      </Link>
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="pointer-events-auto flex size-6 items-center justify-center rounded-md bg-background/80 shadow-sm backdrop-blur-sm"
            onMouseDown={onSelectMouseDown}
            onClick={(e) => {
              e.preventDefault();
              consumeShift();
              onToggleSelect(e.shiftKey);
            }}
          >
            <Checkbox
              checked={isSelected}
              aria-label={t("selection.select", { name: collection.name })}
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={() => onToggleSelect(consumeShift())}
            />
          </span>
          {isActive && (
            <Badge variant="success" className="shadow-sm">
              <span className="size-1.5 rounded-full bg-success" />
              {t("page.activeBadge")}
            </Badge>
          )}
          {scannerLock && <ScanningPill isOwn={isOwnSession} />}
        </div>
        <Badge
          variant="outline"
          className="max-w-1/2 truncate bg-background/80 backdrop-blur-sm"
        >
          {collection.game ? collection.game.name : t("page.noGame")}
        </Badge>
      </div>
      {hasLiveInfo && (
        <div className="absolute top-28 left-2 flex items-center gap-1.5 rounded-full bg-background/80 p-1 shadow-sm backdrop-blur-sm">
          {scannerLock && !isOwnSession && (
            <InitialsAvatar
              name={scannerLock.displayName}
              variant="scanner"
              size="sm"
              tooltip={tScanner("isScanningTooltip", {
                name: scannerLock.displayName,
              })}
            />
          )}
          {watchers.length > 0 && <WatcherStack watchers={watchers} />}
        </div>
      )}

      <div className="flex items-center gap-3 border-t p-3">
        <div className="min-w-0 flex-1">
          <Link
            to={viewPath}
            className="block truncate rounded-sm text-sm font-semibold hover:underline"
          >
            {collection.name}
          </Link>
          <p className="truncate text-xs tabular-nums text-foreground/70">
            {t("page.cardCount", { count: collection.cardCount })} ·{" "}
            {new Date(collection.createdAt).toLocaleDateString()}
          </p>
        </div>

        {isOwnSession && <ReleaseSessionButton guid={collection.guid} />}
        <ButtonGroup className="shrink-0">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("page.liveView")}
                  render={
                    <Link to={monitorCollectionPath(collection.guid)}>
                      <IconHeartRateMonitor />
                    </Link>
                  }
                />
              }
            ></TooltipTrigger>
            <TooltipContent>{t("page.liveView")}</TooltipContent>
          </Tooltip>
          {!isActive && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("page.setActiveCollection")}
                    disabled={isActivating}
                    onClick={onActivate}
                  >
                    <IconPlayerPlay />
                  </Button>
                }
              ></TooltipTrigger>
              <TooltipContent>{t("page.setActiveCollection")}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("page.edit")}
                  disabled={isMutating}
                  data-tour="edit-collection"
                  onClick={onEdit}
                >
                  <IconEdit />
                </Button>
              }
            ></TooltipTrigger>
            <TooltipContent>{t("page.edit")}</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline-destructive"
                  size="icon"
                  aria-label={t("deleteCollection")}
                  disabled={isMutating}
                >
                  <IconTrash />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEmpty}>
                <IconEraser />
                {t("emptyCollection")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <IconTrash />
                {t("deleteCollection")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div>
    </article>
  );
}
