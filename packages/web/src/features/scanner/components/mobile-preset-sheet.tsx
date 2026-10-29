import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { MobileListRow } from "@/components/mobile-list-row";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { MobilePresetSheetProps } from "@/lib/interfaces/scanner";
import { IconListDetails } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobilePresetSheet({ open, onOpenChange }: MobilePresetSheetProps) {
  const { t } = useTranslation("scanner");
  const { sets, selectedSet, activateSet, isActivating } = useBinConfigs();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerTitle className="font-heading text-base font-semibold text-foreground">
            {t("mobileScan.choosePreset")}
          </DrawerTitle>
          <div className={MOBILE_LIST_CLASS}>
            {sets.map((set) => (
              <MobileListRow
                key={set.guid}
                label={set.name}
                selected={set.guid === selectedSet?.guid}
                disabled={isActivating}
                leading={
                  <MobileIconBadge>
                    <IconListDetails />
                  </MobileIconBadge>
                }
                onClick={() => {
                  if (set.guid !== selectedSet?.guid) {
                    void activateSet(set.guid);
                  }
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
