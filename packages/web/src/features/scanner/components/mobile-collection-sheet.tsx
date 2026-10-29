import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { MobileListRow } from "@/components/mobile-list-row";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useCollections } from "@/features/collections/api/use-collections";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { MobileCollectionSheetProps } from "@/lib/interfaces/scanner";
import { IconAlbum } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileCollectionSheet({
  open,
  onOpenChange,
}: MobileCollectionSheetProps) {
  const { t } = useTranslation("scanner");
  const { collections, activeCollection, activateCollection } =
    useCollections();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerTitle className="font-heading text-base font-semibold text-foreground">
            {t("mobileScan.chooseCollection")}
          </DrawerTitle>
          <div className={MOBILE_LIST_CLASS}>
            {collections.map((collection) => (
              <MobileListRow
                key={collection.guid}
                label={collection.name}
                description={t("cardCount", { count: collection.cardCount })}
                selected={collection.guid === activeCollection?.guid}
                leading={
                  <MobileIconBadge>
                    <IconAlbum />
                  </MobileIconBadge>
                }
                onClick={() => {
                  void activateCollection(collection.guid);
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
