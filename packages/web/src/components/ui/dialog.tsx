import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DrawerContent } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { DialogPresentationContext } from "@/lib/dialog-presentation-context"
import type { DialogProps } from "@/lib/interfaces/dialog"
import { IconX } from "@tabler/icons-react"

function asChildElement(render: unknown, children: React.ReactNode) {
  if (React.isValidElement(render)) {
    return children === undefined
      ? render
      : React.cloneElement(render, undefined, children)
  }
  return <button type="button">{children}</button>
}

function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  drawerOnMobile = true,
  children,
}: DialogProps) {
  const isMobile = useIsMobile()
  if (isMobile && drawerOnMobile) {
    return (
      <DialogPresentationContext value="drawer">
        <DrawerPrimitive.Root
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
        >
          {children}
        </DrawerPrimitive.Root>
      </DialogPresentationContext>
    )
  }
  return (
    <DialogPresentationContext value="dialog">
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={(next) => onOpenChange?.(next)}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogPresentationContext>
  )
}

function DialogTrigger({
  render,
  children,
  ...props
}: DialogPrimitive.Trigger.Props) {
  const presentation = React.useContext(DialogPresentationContext)
  if (presentation === "drawer") {
    return (
      <DrawerPrimitive.Trigger asChild>
        {asChildElement(render, children)}
      </DrawerPrimitive.Trigger>
    )
  }
  return (
    <DialogPrimitive.Trigger data-slot="dialog-trigger" render={render} {...props}>
      {children}
    </DialogPrimitive.Trigger>
  )
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  render,
  children,
  ...props
}: DialogPrimitive.Close.Props) {
  const presentation = React.useContext(DialogPresentationContext)
  if (presentation === "drawer") {
    return (
      <DrawerPrimitive.Close asChild>
        {asChildElement(render, children)}
      </DrawerPrimitive.Close>
    )
  }
  return (
    <DialogPrimitive.Close data-slot="dialog-close" render={render} {...props}>
      {children}
    </DialogPrimitive.Close>
  )
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/80 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const presentation = React.useContext(DialogPresentationContext)
  if (presentation === "drawer") {
    return (
      <DrawerContent data-slot="dialog-content">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-control text-popover-foreground">
          {children}
        </div>
      </DrawerContent>
    )
  }
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-control text-popover-foreground shadow-popover ring-1 ring-border duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon"
              />
            }
          >
            <IconX
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-1.5 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose render={<Button variant="outline" />}>
          Close
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({ className, children, ...props }: DialogPrimitive.Title.Props) {
  const presentation = React.useContext(DialogPresentationContext)
  const classes = cn("font-heading text-sm font-medium", className)
  if (presentation === "drawer") {
    return (
      <DrawerPrimitive.Title data-slot="dialog-title" className={classes}>
        {children}
      </DrawerPrimitive.Title>
    )
  }
  return (
    <DialogPrimitive.Title data-slot="dialog-title" className={classes} {...props}>
      {children}
    </DialogPrimitive.Title>
  )
}

function DialogDescription({
  className,
  children,
  ...props
}: DialogPrimitive.Description.Props) {
  const presentation = React.useContext(DialogPresentationContext)
  const classes = cn(
    "text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
    className
  )
  if (presentation === "drawer") {
    return (
      <DrawerPrimitive.Description
        data-slot="dialog-description"
        className={classes}
      >
        {children}
      </DrawerPrimitive.Description>
    )
  }
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={classes}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
