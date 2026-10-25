import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CardFilterFields } from "@/features/cards/components/card-filter-fields";
import { CardSortOptions } from "@/features/cards/components/card-sort-options";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { CardSortFilterDrawerProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardSortFilterDrawer({
  sortKey,
  onSortChange,
  sortableFields,
  activeFilters,
  onFiltersChange,
  activeFilterCount,
  availableRarities,
  availableColors,
  availableFoilTypes,
  binCount,
  triggerClassName,
}: CardSortFilterDrawerProps) {
  const { t } = useTranslation("cards");
  const isMobile = useIsMobile();
  const isSorted = !!sortKey && sortKey !== "scan-desc";
  const label = t("cardToolbar.sortAndFilter");

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button
          variant={isSorted || activeFilterCount > 0 ? "outline-selected" : "outline"}
          size="icon"
          className={cn("shrink-0", triggerClassName)}
          aria-label={label}
          title={label}
        >
          <IconAdjustmentsHorizontal />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="min-h-0">
        <DrawerHeader>
          <DrawerTitle>{label}</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-2">
          <section className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold">
              {t("cardToolbar.sortHeading")}
            </h3>
            <CardSortOptions
              sortKey={sortKey}
              onSortChange={onSortChange}
              sortableFields={sortableFields}
            />
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold">
              {t("cardToolbar.filterHeading")}
            </h3>
            <CardFilterFields
              activeFilters={activeFilters}
              onFiltersChange={onFiltersChange}
              activeFilterCount={activeFilterCount}
              availableRarities={availableRarities}
              availableColors={availableColors}
              availableFoilTypes={availableFoilTypes}
              binCount={binCount}
            />
          </section>
        </div>
        <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerClose asChild>
            <Button>{t("cardToolbar.done")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
