import { MenuSearchField } from "@/components/menu-search-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useMenuSearch } from "@/hooks/use-menu-search";
import { sortingRulesPresetPath } from "@/lib/constants/bins";
import { MENU_SCROLL_LIST_CLASS } from "@/lib/constants/ui";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function EditingPresetMenu() {
  const { t } = useTranslation("bins");
  const navigate = useNavigate();
  const { sets, selectedSet } = useBinConfigs();
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
  const matchingSets = sets.filter((preset) => matchesSearch(preset.name));
  const editPreset = (presetGuid: string) => {
    closeMenu();
    if (presetGuid !== selectedSet?.guid) {
      navigate(sortingRulesPresetPath(presetGuid));
    }
  };

  return (
    <DropdownMenu
      open={isMenuOpen}
      onOpenChange={handleMenuOpenChange}
      onOpenChangeComplete={handleMenuOpenChangeComplete}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            aria-label={t("presetSelector.presetToEdit")}
            disabled={sets.length === 0}
            className="min-w-0 flex-1 justify-start gap-1.5 px-1"
          >
            <span className="truncate font-semibold text-foreground">
              {selectedSet?.name ?? t("presetSelector.selectSetPlaceholder")}
            </span>
            {selectedSet?.isActive && (
              <Badge variant="outline" className="shrink-0">
                {t("presetSelector.activeBadge")}
              </Badge>
            )}
            <IconSelector className="ml-auto size-3.5 shrink-0 text-foreground/70" />
          </Button>
        }
      />
      <DropdownMenuContent side="bottom" align="start" sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("presetSelector.presetToEdit")}</DropdownMenuLabel>
          <MenuSearchField
            inputRef={searchInputRef}
            value={searchQuery}
            onValueChange={setSearchQuery}
            onSubmit={() => matchingSets[0] && editPreset(matchingSets[0].guid)}
            placeholder={t("presetSelector.searchPlaceholder")}
          />
          {matchingSets.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-foreground/70">
              {t("presetSelector.noMatchingSets")}
            </p>
          )}
          <ScrollArea className={MENU_SCROLL_LIST_CLASS}>
            {matchingSets.map((preset) => {
              const isEditing = preset.guid === selectedSet?.guid;
              return (
                <DropdownMenuItem
                  key={preset.guid}
                  aria-current={isEditing || undefined}
                  onClick={() => editPreset(preset.guid)}
                >
                  <span className="flex-1 truncate">{preset.name}</span>
                  {preset.isActive && (
                    <Badge variant="outline" className="shrink-0">
                      {t("presetSelector.activeBadge")}
                    </Badge>
                  )}
                  <IconCheck
                    className={isEditing ? "shrink-0 text-primary" : "invisible shrink-0"}
                  />
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
