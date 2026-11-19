export const MOBILE_SHEET_POSITIONER_CLASS =
  "max-md:fixed! max-md:inset-x-0! max-md:top-auto! max-md:bottom-0! max-md:left-0! max-md:w-full! max-md:transform-none!";

export const MOBILE_SHEET_POPUP_CLASS =
  "max-md:w-full! max-md:max-w-none max-md:max-h-[75dvh]! max-md:rounded-t-xl max-md:rounded-b-none max-md:p-2 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:shadow-popover max-md:ring-1 max-md:ring-border max-md:data-open:slide-in-from-bottom-8 max-md:data-open:zoom-in-100 max-md:data-closed:zoom-out-100";

export const MOBILE_SHEET_BACKDROP_CLASS =
  "pointer-events-auto fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 md:hidden";

export const MOBILE_SHEET_ITEM_CLASS =
  "max-md:min-h-12 max-md:gap-2 max-md:rounded-md max-md:px-3 max-md:text-base max-md:[&_svg:not([class*='size-'])]:size-5";

export const MOBILE_COMBOBOX_TRIGGER_CLASS =
  "flex h-10 w-auto min-w-0 items-center gap-2 rounded-md border border-input bg-border/20 px-3 text-left shadow-input text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-border/30";

export const MOBILE_COMBOBOX_POSITIONER_CLASS = "max-md:bottom-(--keyboard-inset)!";

export const MOBILE_COMBOBOX_POPUP_CLASS =
  "max-md:flex max-md:max-h-[calc((100dvh-var(--keyboard-inset))*0.75)]! max-md:flex-col max-md:gap-1 max-md:*:data-[slot=input-group]:h-11 max-md:*:data-[slot=input-group]:w-auto max-md:*:data-[slot=input-group]:shrink-0 max-md:*:data-[slot=combobox-list]:max-h-none max-md:*:data-[slot=combobox-list]:min-h-0 max-md:*:data-[slot=combobox-list]:flex-1 max-md:**:data-[slot=combobox-item]:min-h-12 max-md:**:data-[slot=combobox-item]:px-3 max-md:**:data-[slot=combobox-item]:text-base";

export const SHELL_GRADIENT_CLASS =
  "pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary/10 via-primary/4 via-35% to-transparent to-60% dark:from-primary/25 dark:via-primary/8";

export const GRADIENT_BURST_CLASS =
  "pointer-events-none absolute top-8 left-8 size-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/50 blur-[60px]";

export const MENU_SCROLL_LIST_CLASS =
  "h-auto [&>[data-slot=scroll-area-viewport]]:max-h-64";

export const DESKTOP_TITLE_BAR_CLASS =
  "[-webkit-app-region:drag] pr-[calc(100vw_-_env(titlebar-area-x,0px)_-_env(titlebar-area-width,100vw)_+_0.75rem)] [&_a]:[-webkit-app-region:no-drag] [&_button]:[-webkit-app-region:no-drag] [&_input]:[-webkit-app-region:no-drag] [&_[role=combobox]]:[-webkit-app-region:no-drag]";

export const PROGRESS_TRACK_CLASS =
  "overflow-hidden rounded-full bg-foreground/6";

export const PROGRESS_SIZE_CLASS = {
  sm: "h-1",
  default: "h-1.5",
  lg: "h-2",
} as const;

export const PROGRESS_TONE_CLASS = {
  primary: "bg-primary",
  warning: "bg-warning",
} as const;

export const ICON_BADGE_SIZE_CLASS = {
  compact: "size-8 md:size-7",
  sm: "size-8",
  default: "size-9",
  lg: "size-10",
  xl: "size-11",
  "2xl": "size-14",
} as const;

export const ICON_BADGE_TONE_CLASS = {
  neutral: "bg-foreground/6 text-foreground",
  primary: "bg-primary/10 text-primary dark:bg-primary/20",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning-muted text-warning-foreground",
  success: "bg-success-muted text-success-foreground",
} as const;

export const FOIL_GRADIENT_CLASS =
  "bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300";

export const GITHUB_STAR_PILL_CLASS =
  "inline-flex items-center gap-0.5 rounded-full border bg-foreground/6 px-1.5 text-2xs text-foreground/80";

export const STATUS_DOT_OFFLINE_CLASS = "border-2 border-foreground/60";

export const TOGGLE_TILE_SELECTED_CLASS =
  "border-primary bg-primary/5 text-foreground";

export const TOGGLE_TILE_UNSELECTED_CLASS =
  "border-border text-foreground/70 hover:bg-foreground/6 hover:text-foreground";
