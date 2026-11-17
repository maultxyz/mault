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
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { PresetActionDialogs } from "@/features/bins/components/preset-action-dialogs";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { useMenuSearch } from "@/hooks/use-menu-search";
import { SORTING_RULES_PATH } from "@/lib/constants/bins";
import { controlCardsPath } from "@/lib/constants/control-cards";
import { MENU_SCROLL_LIST_CLASS } from "@/lib/constants/ui";
import type { PresetDialog } from "@/lib/interfaces/bins";
import {
  IconArrowsSplit2,
  IconCheck,
  IconClockHour3,
  IconEdit,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconQrcode,
  IconRefresh,
  IconSelector,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { binSetMode } from "@magic-vault/shared";
import { useActivePresetWorkflow } from "@/features/bins/api/use-active-preset-workflow";
import { usePresetPicker } from "@/features/bins/api/use-preset-picker";
import { PresetPickerBadge } from "@/features/bins/components/preset-picker-badge";

export function PresetMenu() {
  const { t } = useTranslation("bins");
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const { activeCollection } = useCollections();
  const { sets, selectedSet, isPresetMutating } = useBinConfigs();
  const picker = usePresetPicker();
  const activeWorkflow = useActivePresetWorkflow().workflow;
  const isActivating = picker.isChoosing;
  const { isLoading } = useQuery({ ...binsQueryOptions, enabled: !!activeOrg });
  const [openDialog, setOpenDialog] = useState<PresetDialog | null>(null);
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
    return <Skeleton className="h-6 w-36 rounded-md" />;
  }

  const matchingItems = picker.items.filter((item) => matchesSearch(item.name));
  const hasItems = picker.items.length > 0;
  const selectedMode = binSetMode(selectedSet);
  const activateFirstMatch = () => {
    const firstMatch = matchingItems[0];
    if (!firstMatch || isActivating) return;
    picker.choose(firstMatch);
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
              data-tour="create-sorting-rule"
              className="max-w-64 min-w-0 shrink gap-1.5 px-1 hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent"
            >
              <span className="grid size-4.5 shrink-0 place-items-center rounded-sm bg-foreground text-background">
                {isActivating ? (
                  <IconLoader2 className="size-3 animate-spin" />
                ) : (
                  <IconArrowsSplit2 className="size-3" />
                )}
              </span>
              <span className="truncate font-semibold text-foreground">
                {picker.activeLabel ??
                  t("presetSelector.selectSetPlaceholder")}
              </span>
              {activeWorkflow ? (
                <Badge variant="outline" className="shrink-0">
                  {t("presetWorkflows.badge")}
                </Badge>
              ) : selectedMode !== "rules" && (
                <Badge variant="outline" className="shrink-0">
                  {t(`presetSelector.modeBadges.${selectedMode}`)}
                </Badge>
              )}
              <IconSelector className="size-3.5 text-foreground/70" />
            </Button>
          }
        />
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-64"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {t("presetSelector.sortingLogic")}
            </DropdownMenuLabel>
            {hasItems && (
              <MenuSearchField
                inputRef={searchInputRef}
                value={searchQuery}
                onValueChange={setSearchQuery}
                onSubmit={activateFirstMatch}
                placeholder={t("presetSelector.searchPlaceholder")}
              />
            )}
            {hasItems && matchingItems.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-foreground/70">
                {t("presetSelector.noMatchingSets")}
              </p>
            )}
            <ScrollArea className={MENU_SCROLL_LIST_CLASS}>
              {matchingItems.map((item) => (
                <DropdownMenuItem
                  key={item.guid}
                  disabled={isActivating}
                  aria-current={picker.isSelected(item) || undefined}
                  onClick={() => picker.choose(item)}
                >
                  <span className="flex-1 truncate">{item.name}</span>
                  <PresetPickerBadge item={item} />
                  <IconCheck
                    size={14}
                    className={
                      picker.isSelected(item)
                        ? "shrink-0 text-primary"
                        : "invisible shrink-0"
                    }
                  />
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!activeCollection}
            onClick={() => navigate(SORTING_RULES_PATH)}
          >
            <IconEdit size={14} />
            {t("presetSelector.editSortingLogic")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!selectedSet || isPresetMutating}
            onClick={() => setOpenDialog("rename")}
          >
            <IconPencil size={14} />
            {t("presetSelector.renameSetTitle")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!selectedSet}
            onClick={() => setOpenDialog("history")}
          >
            <IconClockHour3 size={14} />
            {t("presetSelector.viewHistory")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!selectedSet}
            onClick={() =>
              navigate(controlCardsPath({ presetGuid: selectedSet?.guid }))
            }
          >
            <IconQrcode size={14} />
            {t("presetSelector.printControlCard")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPresetMutating}
            onClick={() => setOpenDialog("create")}
          >
            <IconPlus size={14} />
            {t("presetSelector.newSetTitle")}
          </DropdownMenuItem>
          {!!selectedSet?.autoAssignField && (
            <DropdownMenuItem
              disabled={isPresetMutating}
              onClick={() => setOpenDialog("resetAutoAssign")}
            >
              <IconRefresh size={14} />
              {t("presetSelector.resetAutoAssign")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!selectedSet || isPresetMutating || sets.length <= 1}
            onClick={() => setOpenDialog("delete")}
          >
            <IconTrash size={14} />
            {t("presetSelector.deleteSetTitle")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PresetActionDialogs
        openDialog={openDialog}
        onOpenDialogChange={setOpenDialog}
      />
    </>
  );
}
