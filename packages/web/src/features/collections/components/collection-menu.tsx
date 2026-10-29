import { MenuSearchField } from "@/components/menu-search-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useActiveCollectionSessionActions } from "@/features/collections/api/use-active-collection-session-actions";
import { useCollections } from "@/features/collections/api/use-collections";
import { CreateCollectionDialog } from "@/features/collections/components/create-collection-dialog";
import { useOrg } from "@/features/companies/api/use-organization";
import { gamesQueryOptions } from "@/features/games/api/games";
import { useCollectionLocks } from "@/lib/app-stream";
import { useMenuSearch } from "@/hooks/use-menu-search";
import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import { MENU_SCROLL_LIST_CLASS } from "@/lib/constants/ui";
import {
  IconAlbum,
  IconCheck,
  IconEdit,
  IconLoader2,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconSelector,
  IconShare,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { gameAbbreviation } from "@magic-vault/shared";

export function CollectionMenu() {
  const { t } = useTranslation(["collections", "common"]);
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const {
    collections,
    activeCollection,
    isActivating,
    isMutating,
    activateCollection,
  } = useCollections();
  const { isLoading } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });
  const { data: games = [] } = useQuery(gamesQueryOptions);
  const hasActiveGames = games.some((game) => game.isActive);
  const { isLockedByOther } = useCollectionLocks();
  const {
    isLockedByMe,
    isSharing,
    isReleasing,
    copyMonitorLink,
    releaseScanSession,
  } = useActiveCollectionSessionActions();
  const [createOpen, setCreateOpen] = useState(false);
  const {
    isMenuOpen,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    handleMenuOpenChange,
    handleMenuOpenChangeComplete,
    closeMenu,
    matchesSearch,
  } = useMenuSearch();

  if (isLoading) {
    return <Skeleton className="h-6 w-40 rounded-md" />;
  }

  const activeIsLockedByOther =
    !!activeCollection && isLockedByOther(activeCollection.guid);
  const matchingCollections = collections.filter((collection) =>
    matchesSearch(collection.name),
  );
  const activateFirstMatch = () => {
    const firstAvailable = matchingCollections.find(
      (collection) => !isLockedByOther(collection.guid),
    );
    if (!firstAvailable || isActivating) return;
    activateCollection(firstAvailable.guid);
    closeMenu();
  };

  return (
    <>
      <DropdownMenu
        open={isMenuOpen}
        onOpenChange={handleMenuOpenChange}
        onOpenChangeComplete={handleMenuOpenChangeComplete}
      >
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              data-tour="collection-switcher"
              className="max-w-64 min-w-0 shrink gap-1.5 px-1 hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent"
            >
              <span className="grid size-4.5 shrink-0 place-items-center rounded-sm bg-foreground text-2xs font-bold text-background">
                {isActivating ? (
                  <IconLoader2 className="size-3 animate-spin" />
                ) : activeCollection ? (
                  activeCollection.name[0].toUpperCase()
                ) : (
                  <IconAlbum className="size-3" />
                )}
              </span>
              <span className="truncate font-semibold text-foreground">
                {activeCollection?.name ?? t("switcher.noCollectionSelected")}
              </span>
              {activeCollection && (
                <Badge variant="outline" className="shrink-0 tabular-nums">
                  {activeCollection.game
                    ? `${gameAbbreviation(activeCollection.game.key)} · ${activeCollection.lang.toUpperCase()}`
                    : activeCollection.lang.toUpperCase()}
                </Badge>
              )}
              {activeIsLockedByOther && (
                <IconLock className="size-3 shrink-0 text-warning-foreground" />
              )}
              <IconSelector className="size-3.5 text-foreground/70" />
            </Button>
          }
        />
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-72"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("common:nav.collections")}</DropdownMenuLabel>
            {collections.length > 0 && (
              <MenuSearchField
                inputRef={searchInputRef}
                value={searchQuery}
                onValueChange={setSearchQuery}
                onSubmit={activateFirstMatch}
                placeholder={t("page.searchPlaceholder")}
              />
            )}
            {matchingCollections.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-foreground/70">
                {collections.length === 0
                  ? t("noCollectionsYet")
                  : t("noMatchingCollections")}
              </p>
            )}
            <ScrollArea className={MENU_SCROLL_LIST_CLASS}>
              {matchingCollections.map((collection) => {
                const lockedByOther = isLockedByOther(collection.guid);
                return (
                  <DropdownMenuItem
                    key={collection.guid}
                    disabled={lockedByOther || isActivating}
                    onClick={() => activateCollection(collection.guid)}
                  >
                    <span className="flex-1 truncate">{collection.name}</span>
                    {lockedByOther && (
                      <IconLock
                        size={12}
                        className="shrink-0 text-foreground/70"
                      />
                    )}
                    <span className="shrink-0 text-2xs text-foreground/70 tabular-nums">
                      {collection.cardCount}
                    </span>
                    <IconCheck
                      size={14}
                      className={
                        collection.guid === activeCollection?.guid
                          ? "shrink-0 text-primary"
                          : "invisible shrink-0"
                      }
                    />
                  </DropdownMenuItem>
                );
              })}
            </ScrollArea>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!activeCollection || isSharing}
            onClick={copyMonitorLink}
          >
            {isSharing ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconShare size={14} />
            )}
            {t("switcher.copyMonitorLink")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(COLLECTIONS_PATH)}>
            <IconEdit size={14} />
            {t("switcher.manageCollections")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasActiveGames || isMutating}
            title={hasActiveGames ? undefined : t("switcher.noGamesHint")}
            onClick={() => setCreateOpen(true)}
          >
            <IconPlus size={14} />
            {t("newCollection")}
          </DropdownMenuItem>
          {isLockedByMe && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isReleasing}
                onClick={releaseScanSession}
                className="text-warning-foreground focus:text-warning-foreground"
              >
                {isReleasing ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconLockOpen size={14} />
                )}
                {t("switcher.giveUpSession")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
