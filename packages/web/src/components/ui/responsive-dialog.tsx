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
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const DialogCloseContext = createContext<() => void>(() => {});

export function useDialogClose() {
  return useContext(DialogCloseContext);
}

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
  onClose?: () => void;
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
  onClose,
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
      if (!isOpen) onClose?.();
    },
    [isControlled, onOpenChange, onClose],
  );

  const close = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DialogCloseContext value={close}>
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
            <div className="p-4 pt-2 flex flex-col gap-2">{children}</div>
            {footer && (
              <DrawerFooter className={cn("pt-0", footerClassName)}>
                {footer}
              </DrawerFooter>
            )}
          </DrawerContent>
        </Drawer>
      </DialogCloseContext>
    );
  }

  return (
    <DialogCloseContext value={close}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger}></DialogTrigger>}
        <DialogContent
          className={cn("flex flex-col", className)}
          showCloseButton={dismissible}
          onKeyDown={onKeyDown}
        >
          <DialogHeader className="flex-none">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
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
    </DialogCloseContext>
  );
}
