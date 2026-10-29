import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { MobileListRow } from "@/components/mobile-list-row";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { PresetActionDialogs } from "@/features/bins/components/preset-action-dialogs";
import { useOrg } from "@/features/companies/api/use-organization";
import { controlCardsPath } from "@/lib/constants/control-cards";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { PresetDialog } from "@/lib/interfaces/bins";
import { binSetMode } from "@magic-vault/shared";
import {
  IconArrowsSplit2,
  IconClockHour3,
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

export function MobilePresetSelector() {
  const { t } = useTranslation("bins");
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const { sets, activateSet, selectedSet, isActivating, isPresetMutating } =
    useBinConfigs();
  const { isLoading } = useQuery({ ...binsQueryOptions, enabled: !!activeOrg });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState<PresetDialog | null>(null);

  if (isLoading) {
    return <Skeleton className="h-14 w-full rounded-lg" />;
  }

  const selectedMode = binSetMode(selectedSet);
  const openPresetDialog = (dialog: PresetDialog) => {
    setSheetOpen(false);
    setOpenDialog(dialog);
  };

  return (
    <>
      <button
        type="button"
        disabled={isActivating}
        onClick={() => setSheetOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-lg bg-card px-3 py-2 text-left ring-1 ring-border transition-colors active:bg-muted disabled:opacity-50"
      >
        <MobileIconBadge tone="primary">
          {isActivating ? (
            <IconLoader2 className="animate-spin" />
          ) : (
            <IconArrowsSplit2 />
          )}
        </MobileIconBadge>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-foreground/70">
            {t("presetSelector.sortingLogic")}
          </span>
          <span className="block truncate text-sm font-medium text-foreground">
            {selectedSet?.name ?? t("presetSelector.selectSetPlaceholder")}
          </span>
        </span>
        {selectedMode !== "rules" && (
          <Badge variant="outline" className="shrink-0">
            {t(`presetSelector.modeBadges.${selectedMode}`)}
          </Badge>
        )}
        <IconSelector className="size-4 shrink-0 text-foreground/70" />
      </button>
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <DrawerTitle className="font-heading text-base font-semibold text-foreground">
              {t("presetSelector.sortingLogic")}
            </DrawerTitle>
            <div className={MOBILE_LIST_CLASS}>
              {sets.map((set) => {
                const mode = binSetMode(set);
                return (
                  <MobileListRow
                    key={set.guid}
                    label={set.name}
                    selected={set.guid === selectedSet?.guid}
                    disabled={isActivating}
                    value={
                      mode !== "rules" ? (
                        <Badge variant="outline">
                          {t(`presetSelector.modeBadges.${mode}`)}
                        </Badge>
                      ) : undefined
                    }
                    onClick={() => {
                      if (set.guid !== selectedSet?.guid) {
                        void activateSet(set.guid);
                      }
                      setSheetOpen(false);
                    }}
                  />
                );
              })}
            </div>
            <div className={MOBILE_LIST_CLASS}>
              <MobileListRow
                icon={<IconPlus />}
                label={t("presetSelector.newSetTitle")}
                disabled={isPresetMutating}
                onClick={() => openPresetDialog("create")}
              />
              <MobileListRow
                icon={<IconPencil />}
                label={t("presetSelector.renameSetTitle")}
                disabled={!selectedSet || isPresetMutating}
                onClick={() => openPresetDialog("rename")}
              />
              <MobileListRow
                icon={<IconClockHour3 />}
                label={t("presetSelector.viewHistory")}
                disabled={!selectedSet}
                onClick={() => openPresetDialog("history")}
              />
              <MobileListRow
                icon={<IconQrcode />}
                label={t("presetSelector.printControlCard")}
                disabled={!selectedSet}
                onClick={() => {
                  setSheetOpen(false);
                  navigate(controlCardsPath({ presetGuid: selectedSet?.guid }));
                }}
              />
              {!!selectedSet?.autoAssignField && (
                <MobileListRow
                  icon={<IconRefresh />}
                  label={t("presetSelector.resetAutoAssign")}
                  disabled={isPresetMutating}
                  onClick={() => openPresetDialog("resetAutoAssign")}
                />
              )}
              <MobileListRow
                icon={<IconTrash />}
                label={t("presetSelector.deleteSetTitle")}
                destructive
                disabled={!selectedSet || isPresetMutating || sets.length <= 1}
                onClick={() => openPresetDialog("delete")}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <PresetActionDialogs
        openDialog={openDialog}
        onOpenDialogChange={setOpenDialog}
      />
    </>
  );
}
