import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import type * as React from "react";

interface DynamicPopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
}

export function DynamicPopover({
  trigger,
  children,
  contentClassName,
  side,
  align,
  sideOffset,
  alignOffset,
}: DynamicPopoverProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="min-h-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Details</DrawerTitle>
          </DrawerHeader>
          <div
            className={cn(
              "flex min-h-0 flex-col gap-2 overflow-y-auto px-5 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]",
              contentClassName,
            )}
          >
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger render={trigger}></PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={contentClassName}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
