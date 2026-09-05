import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  collectionsQueryOptions,
  releaseScanLock,
} from "@/features/collections/api/collections";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { CreateCollectionDialog } from "@/features/collections/components/create-collection-dialog";
import { useOrg } from "@/features/companies/api/use-organization";
import { LANGUAGE_LABELS } from "@/lib/languages";
import {
  IconEdit,
  IconLoader2,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconShare,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function CollectionSwitcher() {
  const { t } = useTranslation("collections");
  const { collections, activeCollection, isActivating, activateCollection } =
    useCollections();
  const { activeOrg } = useOrg();
  const { isLoading } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });
  const { locks, currentUserId, isLockedByOther } = useCollectionLocks();
  const [releasing, setReleasing] = useState(false);

  const isLockedByMe = !!(
    activeCollection &&
    locks[activeCollection.guid] &&
    locks[activeCollection.guid].userId === currentUserId
  );

  const handleReleaseLock = useCallback(async () => {
    if (!activeCollection) return;
    setReleasing(true);
    try {
      await releaseScanLock(activeCollection.guid);
      toast.success(t("switcher.sessionReleased"));
    } catch {
      toast.error(t("switcher.releaseFailed"));
    } finally {
      setReleasing(false);
    }
  }, [activeCollection, t]);

  const handleShare = useCallback(() => {
    if (!activeCollection) return;
    const url = `${window.location.origin}/app/monitor/${activeCollection.guid}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success(t("switcher.monitorLinkCopied"), {
          description: t("switcher.monitorLinkCopiedDescription"),
        });
      })
      .catch(() => {
        toast.error(t("switcher.copyLinkFailed"), { description: url });
      });
  }, [activeCollection, t]);

  if (isLoading) {
    return (
      <ButtonGroup className="w-full">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="size-9 shrink-0" />
        <Skeleton className="size-9 shrink-0" />
      </ButtonGroup>
    );
  }

  return (
    <Field>
      <span className="flex items-center gap-1.5">
        <FieldLabel>{t("switcher.label")}</FieldLabel>
        {activeCollection?.game && (
          <Badge variant="outline" className="shrink-0">
            {activeCollection.game.name}
          </Badge>
        )}
        {activeCollection && (
          <Badge variant="outline" className="shrink-0">
            {LANGUAGE_LABELS[activeCollection.lang] ?? activeCollection.lang}
          </Badge>
        )}
      </span>
      <ButtonGroup className="w-full">
        <Select
          key={activeCollection?.guid ?? ""}
          value={activeCollection?.guid ?? ""}
          onValueChange={(guid) => activateCollection(guid!)}
        >
          <SelectTrigger
            className="flex-1 overflow-hidden"
            disabled={isActivating}
          >
            <SelectValue placeholder={t("switcher.noCollectionSelected")}>
              <span className="flex items-center gap-1.5 min-w-0">
                {isActivating && (
                  <IconLoader2 className="size-3 animate-spin shrink-0 text-muted-foreground" />
                )}
                {activeCollection && isLockedByOther(activeCollection.guid) && (
                  <IconLock
                    size={11}
                    className="shrink-0 text-amber-800 dark:text-amber-400"
                  />
                )}
                <span className="truncate">
                  {activeCollection?.name ?? t("switcher.noCollection")}
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {collections.map((c) => {
              const lockedByOther = isLockedByOther(c.guid);
              return (
                <SelectItem
                  key={c.guid}
                  value={c.guid}
                  disabled={lockedByOther}
                >
                  <span className="truncate">{c.name}</span>
                  {lockedByOther && (
                    <IconLock
                      size={11}
                      className="ml-1 shrink-0 text-muted-foreground"
                    />
                  )}
                  <span className="ml-auto pl-2 pr-6 pt-0.5 text-xs text-muted-foreground tabular-nums">
                    {c.cardCount}
                  </span>
                </SelectItem>
              );
            })}
            {collections.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                {t("switcher.noCollectionsYet")}
              </div>
            )}
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button nativeButton={false} variant="outline" size="icon">
                <Link to="/app/collections">
                  <IconEdit />
                </Link>
              </Button>
            }
          />
          <TooltipContent>{t("switcher.manageCollections")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                disabled={!activeCollection}
                onClick={handleShare}
              >
                <IconShare />
              </Button>
            }
          />
          <TooltipContent>{t("switcher.copyMonitorLink")}</TooltipContent>
        </Tooltip>

        {isLockedByMe && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  disabled={releasing}
                  onClick={handleReleaseLock}
                  className="text-amber-800 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                >
                  {releasing ? (
                    <IconLoader2 className="animate-spin" />
                  ) : (
                    <IconLockOpen />
                  )}
                </Button>
              }
            />
            <TooltipContent>{t("switcher.giveUpSession")}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <CreateCollectionDialog
            trigger={({ disabled, noGames }) => (
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={disabled}
                    title={noGames ? t("switcher.noGamesHint") : undefined}
                  >
                    <IconPlus />
                  </Button>
                }
              />
            )}
          />
          <TooltipContent>{t("switcher.newCollection")}</TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </Field>
  );
}
