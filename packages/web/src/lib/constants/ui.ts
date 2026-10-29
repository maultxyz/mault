export const MOBILE_SHEET_POSITIONER_CLASS =
  "max-md:fixed! max-md:inset-x-0! max-md:top-auto! max-md:bottom-0! max-md:left-0! max-md:w-full! max-md:transform-none!";

export const MOBILE_SHEET_POPUP_CLASS =
  "max-md:w-full! max-md:max-w-none max-md:max-h-[75dvh]! max-md:rounded-t-xl max-md:rounded-b-none max-md:p-2 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:shadow-2xl max-md:ring-0 max-md:data-open:slide-in-from-bottom-8 max-md:data-open:zoom-in-100 max-md:data-closed:zoom-out-100";

export const MOBILE_SHEET_BACKDROP_CLASS =
  "pointer-events-auto fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 md:hidden";

export const MOBILE_SHEET_ITEM_CLASS =
  "max-md:min-h-12 max-md:gap-3 max-md:rounded-md max-md:px-3 max-md:text-base max-md:[&_svg:not([class*='size-'])]:size-5";

export const MOBILE_COMBOBOX_TRIGGER_CLASS =
  "flex h-10 w-auto min-w-0 items-center gap-2 rounded-md border border-input bg-input/20 px-3 text-left text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

export const MOBILE_COMBOBOX_POSITIONER_CLASS = "max-md:bottom-(--keyboard-inset)!";

export const MOBILE_COMBOBOX_POPUP_CLASS =
  "max-md:flex max-md:max-h-[calc((100dvh-var(--keyboard-inset))*0.75)]! max-md:flex-col max-md:gap-1 max-md:*:data-[slot=input-group]:h-11 max-md:*:data-[slot=input-group]:w-auto max-md:*:data-[slot=input-group]:shrink-0 max-md:*:data-[slot=combobox-list]:max-h-none max-md:*:data-[slot=combobox-list]:min-h-0 max-md:*:data-[slot=combobox-list]:flex-1 max-md:**:data-[slot=combobox-item]:min-h-12 max-md:**:data-[slot=combobox-item]:px-3 max-md:**:data-[slot=combobox-item]:text-base";

export const GRADIENT_BURST_CLASS =
  "pointer-events-none absolute top-8 left-8 size-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/50 blur-[60px]";

export const MENU_SCROLL_LIST_CLASS =
  "h-auto [&>[data-slot=scroll-area-viewport]]:max-h-64";
