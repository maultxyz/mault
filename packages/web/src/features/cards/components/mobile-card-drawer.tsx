import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { CardDrawerContext } from "@/lib/card-drawer-context";
import type { MobileCardDrawerProps } from "@/lib/interfaces/cards";

export function MobileCardDrawer({
  open,
  onClose,
  children,
}: MobileCardDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:h-[92dvh] data-[vaul-drawer-direction=bottom]:max-h-[92dvh]">
        <CardDrawerContext value>{children}</CardDrawerContext>
      </DrawerContent>
    </Drawer>
  );
}
