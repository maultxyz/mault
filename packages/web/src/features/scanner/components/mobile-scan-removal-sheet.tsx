import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { ScanRemovalBinSelect } from "@/features/scanner/components/scan-removal-bin-select";
import { ScanRemovalActions } from "@/features/scanner/components/scan-removal-actions";
import { ScanRemovalList } from "@/features/scanner/components/scan-removal-list";
import type { MobileScanRemovalSheetProps } from "@/lib/interfaces/scan-removal";
import { useTranslation } from "react-i18next";

export function MobileScanRemovalSheet({
  open,
  onOpenChange,
}: MobileScanRemovalSheetProps) {
  const { t } = useTranslation("scanner");
  const { activeCollection } = useCollections();
  const { isSorterConnected } = useScanRemoval();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div>
            <DrawerTitle className="font-heading text-base font-semibold text-foreground">
              {t("scanRemoval.title")}
            </DrawerTitle>
            <p className="text-sm text-foreground/70">
              {t("scanRemoval.description", {
                collection: activeCollection?.name ?? "",
              })}
            </p>
          </div>
          {isSorterConnected && <ScanRemovalBinSelect />}
          <ScanRemovalList />
          <ScanRemovalActions className="sticky bottom-0 bg-background pt-2" />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
