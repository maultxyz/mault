import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import { useCallback, useState, type ReactNode } from "react";

interface DynamicDialogProps {
  trigger?: React.ReactElement;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  footerClassName?: string;
  children?: ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

export function DynamicDialog({
  trigger,
  title,
  description,
  footer,
  footerClassName,
  children,
  className,
  open: controlledOpen,
  onOpenChange,
  dismissible = true,
  onKeyDown,
}: DynamicDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(isOpen);
      onOpenChange?.(isOpen);
    },
    [isControlled, onOpenChange],
  );

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        dismissible={dismissible}
      >
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className={className} onKeyDown={onKeyDown}>
          <DrawerHeader className="py-0">
            <DrawerTitle className="text-start">{title}</DrawerTitle>
            {description && (
              <DrawerDescription className="text-start">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="p-4 pt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {children}
          </div>
          {footer && (
            <DrawerFooter className={cn("pt-0", footerClassName)}>
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} dismissible={dismissible}>
      {trigger && <DialogTrigger render={trigger}></DialogTrigger>}
      <DialogContent
        className={cn("flex max-h-[calc(100dvh-2rem)] flex-col", className)}
        showCloseButton={dismissible}
        onKeyDown={onKeyDown}
      >
        <DialogHeader className="flex-none">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          {children}
        </div>
        {footer && (
          <DialogFooter className={cn("flex-none", footerClassName)}>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
