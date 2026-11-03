import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { MobilePresetList } from "@/features/bins/components/mobile-preset-list";
import type { MobilePresetSheetProps } from "@/lib/interfaces/scanner";
import { useTranslation } from "react-i18next";

export function MobilePresetSheet({ open, onOpenChange }: MobilePresetSheetProps) {
  const { t } = useTranslation("scanner");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerTitle className="font-heading text-base font-semibold text-foreground">
            {t("mobileScan.choosePreset")}
          </DrawerTitle>
          <MobilePresetList onPresetChosen={() => onOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
