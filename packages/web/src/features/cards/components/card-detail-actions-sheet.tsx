import { MobileListRow } from "@/components/mobile-list-row";
import { DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { CardDetailActionsSheetProps } from "@/lib/interfaces/cards";
import { Drawer as DrawerPrimitive } from "vaul";

export function CardDetailActionsSheet({
  open,
  onOpenChange,
  title,
  actions,
}: CardDetailActionsSheetProps) {
  return (
    <DrawerPrimitive.NestedRoot open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex flex-col gap-3 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerTitle className="truncate font-heading text-base font-semibold text-foreground">
            {title}
          </DrawerTitle>
          <div className={MOBILE_LIST_CLASS}>
            {actions.map((action) => (
              <MobileListRow
                key={action.key}
                icon={action.icon}
                label={action.label}
                destructive={action.destructive}
                disabled={action.disabled}
                onClick={() => {
                  onOpenChange(false);
                  action.onSelect();
                }}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </DrawerPrimitive.NestedRoot>
  );
}
