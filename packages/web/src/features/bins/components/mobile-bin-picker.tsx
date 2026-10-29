import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { BinList } from "@/features/bins/components/bin-list";
import { IconSelector } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function MobileBinPicker() {
  const { t } = useTranslation("bins");
  const { configs, selectedBin } = useBinConfigs();
  const [binWhenOpened, setBinWhenOpened] = useState<number | null>(null);
  const isSheetOpen = binWhenOpened === selectedBin;
  const isCatchAll = configs.find(
    (config) => config.binNumber === selectedBin,
  )?.isCatchAll;

  return (
    <>
      <button
        type="button"
        onClick={() => setBinWhenOpened(selectedBin)}
        className="flex min-h-14 w-full items-center gap-3 rounded-lg bg-card px-3 py-2 text-left ring-1 ring-border transition-colors active:bg-muted"
      >
        <MobileIconBadge tone="primary">{selectedBin}</MobileIconBadge>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-foreground/70">
            {t("mobileBinPicker.caption")}
          </span>
          <span className="block truncate text-sm font-medium text-foreground">
            {t("binLabel", { number: selectedBin })}
          </span>
        </span>
        {isCatchAll && (
          <Badge className="shrink-0">
            {t("catchAll")}
          </Badge>
        )}
        <IconSelector className="size-4 shrink-0 text-foreground/70" />
      </button>
      <Drawer
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!open) setBinWhenOpened(null);
        }}
      >
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <DrawerTitle className="font-heading text-base font-semibold text-foreground">
              {t("mobileBinPicker.title")}
            </DrawerTitle>
            <BinList />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
