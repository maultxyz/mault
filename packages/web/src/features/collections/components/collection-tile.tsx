import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { WatcherStack } from "@/components/ui/watcher-stack";
import { CollectionPreviewStack } from "@/features/collections/components/collection-preview-stack";
import { ReleaseSessionButton } from "@/features/collections/components/release-session-button";
import { ScanningPill } from "@/features/collections/components/scanning-pill";
import { CollectionChangeTrend } from "@/features/library/components/collection-change-trend";
import { useShiftClick } from "@/hooks/use-shift-click";
import {
  collectionViewPath,
  COLLECTION_TILE_ACTIVE_CLASS,
  COLLECTION_TILE_CLASS,
  COLLECTION_TILE_LIVE_CLASS,
  COLLECTION_TILE_SELECTED_CLASS,
  monitorCollectionPath,
} from "@/lib/constants/collections";
import { controlCardsPath } from "@/lib/constants/control-cards";
import type { CollectionTileProps } from "@/lib/interfaces/collections";
import { cn } from "@/lib/utils";
import {
  IconDots,
  IconEdit,
  IconEraser,
  IconHeartRateMonitor,
  IconPlayerPlay,
  IconQrcode,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { useOrg } from "@/features/companies/api/use-organization";
import { usePriceSource } from "@/hooks/use-price-source";
import { modifierClickSelectHandlers } from "@/lib/modifier-click-select";

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
  valueMode,
  change,
}: CollectionTileProps) {
  const { t } = useTranslation("collections");
  const { t: tScanner } = useTranslation("scanner");
  const { t: tHome } = useTranslation("home");
  const viewPath = isActive ? "/app" : collectionViewPath(collection.guid);
  const hasLiveInfo = (scannerLock && !isOwnSession) || watchers.length > 0;
  const { onMouseDown: onSelectMouseDown, consumeShift } = useShiftClick();
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const { format } = usePriceSource();
  const { data: overview } = useQuery(orgOverviewQueryOptions(activeOrg?.id));
  const value = overview?.collectionValues[collection.guid];

  return (
    <article
      {...modifierClickSelectHandlers(onToggleSelect)}
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
          {scannerLock ? (
            <ScanningPill isOwn={isOwnSession} />
          ) : (
            isActive && (
              <Badge variant="success" className="shadow-sm">
                <span className="size-1.5 rounded-full bg-success" />
                {t("page.activeBadge")}
              </Badge>
            )
          )}
        </div>
        <span
          role="presentation"
          className="pointer-events-auto flex size-6 items-center justify-center rounded-md bg-card/85 shadow-sm backdrop-blur-sm"
          onMouseDown={onSelectMouseDown}
          onClick={(e) => {
            e.preventDefault();
            onToggleSelect(consumeShift() || e.shiftKey);
          }}
        >
          <Checkbox
            checked={isSelected}
            aria-label={t("selection.select", { name: collection.name })}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={() => onToggleSelect(consumeShift())}
          />
        </span>
      </div>
      {hasLiveInfo && (
        <div className="absolute top-20 left-2 flex items-center gap-1.5 rounded-full bg-card/85 p-1 shadow-sm backdrop-blur-sm">
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

      <div className="flex flex-col gap-0.5 border-t px-3 py-2">
        <div className="flex items-center gap-2">
          <Link
            to={viewPath}
            className="min-w-0 flex-1 truncate rounded-sm text-sm font-semibold hover:underline"
          >
            {collection.name}
          </Link>
          {isOwnSession && <ReleaseSessionButton guid={collection.guid} />}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("page.actions", { name: collection.name })}
                  disabled={isMutating}
                  data-tour="edit-collection"
                >
                  <IconDots />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(monitorCollectionPath(collection.guid))}>
                <IconHeartRateMonitor />
                {t("page.liveView")}
              </DropdownMenuItem>
              {!isActive && (
                <DropdownMenuItem disabled={isActivating} onClick={onActivate}>
                  <IconPlayerPlay />
                  {t("page.setActiveCollection")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => navigate(controlCardsPath({ collectionGuid: collection.guid }))}
              >
                <IconQrcode />
                {t("page.printControlCard")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <IconEdit />
                {t("page.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-foreground/70 tabular-nums">
            {t("page.cardCount", { count: collection.cardCount })} ·{" "}
            {collection.game ? collection.game.name : t("page.noGame")}
          </p>
          {valueMode === "change" && change ? (
            <CollectionChangeTrend
              values={change.values}
              baseline={change.baseline}
              change={change.change}
              noChangeLabel={tHome("library.noChange")}
              label={change.label}
            />
          ) : (
            value != null && (
              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {format(value)}
              </p>
            )
          )}
        </div>
      </div>
    </article>
  );
}
