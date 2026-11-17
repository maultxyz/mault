import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Children, isValidElement, type ReactNode } from "react";

import { HotkeyHint } from "@/components/hotkey-hint";
import { Kbd } from "@/components/ui/kbd";
import { isHotkeyActive } from "@/lib/hotkeys";
import type { HotkeyHintProps } from "@/lib/interfaces/hotkeys";
import { useSingleKeyHotkeysEnabled } from "@/lib/single-key-hotkeys-store";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-control font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-transparent active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[color-mix(in_oklch,var(--primary),black_8%)] bg-primary bg-linear-to-b from-white/8 to-white/0 font-semibold text-primary-foreground shadow-button-raised hover:bg-primary-hover active:not-aria-[haspopup]:shadow-button-raised-pressed",
        outline:
          "border-border bg-card shadow-button-outline hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-border/30 dark:hover:bg-border/50",
        "outline-selected":
          "border-primary/40 bg-primary/10 text-primary shadow-button-outline hover:bg-primary/15 focus-visible:border-primary/40 focus-visible:ring-primary dark:bg-primary/20 dark:hover:bg-primary/30",
        secondary:
          "bg-foreground/6 text-foreground hover:bg-foreground/10 aria-expanded:bg-foreground/10 dark:bg-foreground/8 dark:hover:bg-foreground/12",
        selected:
          "bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25",
        ghost:
          "hover:bg-foreground/6 hover:text-foreground aria-expanded:bg-foreground/6 aria-expanded:text-foreground dark:hover:bg-foreground/8 dark:aria-expanded:bg-foreground/8",
        destructive:
          "border-[color-mix(in_oklch,var(--destructive),black_8%)] bg-destructive bg-linear-to-b from-white/8 to-white/0 font-semibold text-destructive-foreground shadow-button-raised hover:bg-[color-mix(in_oklch,var(--destructive),black_12%)] focus-visible:border-destructive focus-visible:ring-destructive active:not-aria-[haspopup]:shadow-button-raised-pressed",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-7 gap-1 px-2.5 data-icon-start:pl-2 data-icon-end:pr-2 data-kbd-end:pr-1 [&_svg:not([class*='size-'])]:size-3.5 max-md:h-10 max-md:gap-2 max-md:px-4 max-md:text-sm max-md:data-icon-start:pl-3 max-md:data-icon-end:pr-3 max-md:[&_svg:not([class*='size-'])]:size-4",
        xs: "h-5 gap-1 rounded-md px-1.5 text-2xs data-icon-start:pl-1 data-icon-end:pr-1 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-6 gap-1 px-2 text-xs data-icon-start:pl-1.5 data-icon-end:pr-1.5 data-kbd-end:pr-0.5 [&_svg:not([class*='size-'])]:size-3 max-md:h-8 max-md:px-3 max-md:text-sm max-md:data-icon-start:pl-2.5 max-md:data-icon-end:pr-2.5 max-md:[&_svg:not([class*='size-'])]:size-4",
        lg: "h-8 gap-1.5 px-3 data-icon-start:pl-2.5 data-icon-end:pr-2.5 data-kbd-end:pr-1.5 [&_svg:not([class*='size-'])]:size-4 max-md:h-11 max-md:px-5 max-md:text-sm max-md:data-icon-start:pl-4 max-md:data-icon-end:pr-4",
        xl: "h-12 gap-1.5 px-3 data-icon-start:pl-2.5 data-icon-end:pr-2.5 data-kbd-end:pr-1.5 [&_svg:not([class*='size-'])]:size-4 max-md:px-5 max-md:text-sm max-md:data-icon-start:pl-4 max-md:data-icon-end:pr-4",
        marketing:
          "h-7 gap-1 px-2.5 text-sm data-icon-start:pl-2 data-icon-end:pr-2 data-kbd-end:pr-1 [&_svg:not([class*='size-'])]:size-3.5 max-md:h-10 max-md:gap-2 max-md:px-4 max-md:data-icon-start:pl-3 max-md:data-icon-end:pr-3 max-md:[&_svg:not([class*='size-'])]:size-4",
        icon: "size-7 [&_svg:not([class*='size-'])]:size-3.5 max-md:size-10 max-md:[&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-5 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-6 [&_svg:not([class*='size-'])]:size-3 max-md:size-8 max-md:[&_svg:not([class*='size-'])]:size-4",
        "icon-compact": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-8 [&_svg:not([class*='size-'])]:size-4 max-md:size-10 max-md:[&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function isKeyHint(node: ReactNode): boolean {
  return isValidElement(node) && (node.type === Kbd || node.type === HotkeyHint);
}

function isHiddenHotkeyHint(node: ReactNode, singleKeyHotkeysEnabled: boolean): boolean {
  if (!isValidElement(node) || node.type !== HotkeyHint) return false;
  const { id, showWhenInactive } = node.props as HotkeyHintProps;
  return !showWhenInactive && !isHotkeyActive(id, singleKeyHotkeysEnabled);
}

function isAdornment(node: ReactNode): boolean {
  if (!isValidElement(node)) return false;
  return typeof node.type !== "string" || node.type === "svg" || node.type === "img";
}

function adornmentAttributes(children: ReactNode, singleKeyHotkeysEnabled: boolean) {
  const parts = Children.toArray(children).filter(
    (part) => !isHiddenHotkeyHint(part, singleKeyHotkeysEnabled),
  );
  const first = parts[0];
  const last = parts[parts.length - 1];
  const kbdEnd = isKeyHint(last);
  return {
    "data-icon-start": isAdornment(first) && !isKeyHint(first) ? "" : undefined,
    "data-icon-end": isAdornment(last) && !kbdEnd ? "" : undefined,
    "data-kbd-end": kbdEnd ? "" : undefined,
  };
}

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const singleKeyHotkeysEnabled = useSingleKeyHotkeysEnabled();
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...adornmentAttributes(children, singleKeyHotkeysEnabled)}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
