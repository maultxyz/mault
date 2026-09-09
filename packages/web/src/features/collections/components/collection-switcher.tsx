import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroupAddon } from "@/components/ui/input-group";
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
import type { Collection } from "@magic-vault/shared";
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
    <Field data-tour="collection-switcher">
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
        <Combobox
          items={collections}
          value={activeCollection ?? null}
          onValueChange={(c) => c && activateCollection(c.guid)}
          itemToStringLabel={(c: Collection) => c.name}
          isItemEqualToValue={(a: Collection, b: Collection) =>
            a?.guid === b?.guid
          }
        >
          <ComboboxInput
            className="flex-1 overflow-hidden"
            placeholder={t("switcher.noCollectionSelected")}
            disabled={isActivating}
          >
            {(isActivating ||
              (activeCollection && isLockedByOther(activeCollection.guid))) && (
              <InputGroupAddon align="inline-start">
                {isActivating ? (
                  <IconLoader2 className="size-3 animate-spin text-muted-foreground" />
                ) : (
                  <IconLock
                    size={11}
                    className="text-amber-800 dark:text-amber-400"
                  />
                )}
              </InputGroupAddon>
            )}
          </ComboboxInput>
          <ComboboxContent>
            <ComboboxEmpty>
              {collections.length === 0
                ? t("switcher.noCollectionsYet")
                : t("switcher.noMatches")}
            </ComboboxEmpty>
            <ComboboxList>
              {(c: Collection) => {
                const lockedByOther = isLockedByOther(c.guid);
                return (
                  <ComboboxItem key={c.guid} value={c} disabled={lockedByOther}>
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
                  </ComboboxItem>
                );
              }}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

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
