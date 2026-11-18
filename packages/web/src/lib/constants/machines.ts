export const MACHINES_ROUTE_PATH = "/app/machines";
export const STATION_MACHINE_ID_PREFIX = "station-";
export const MACHINE_ID_UNSAFE_CHARACTERS = /[^A-Za-z0-9:_-]/g;
export const MACHINE_RECENT_CARDS_COUNT = 5;
export const MACHINE_CONTROL_BUTTON_CLASS =
  "flex size-12 shrink-0 items-center justify-center rounded-full text-white shadow-popover transition-transform active:scale-95 disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:size-5";
export const MACHINE_RECENT_CARD_WIDTH_CLASS = "w-[78%] md:w-[70%]";
export const MACHINE_RUN_STATE_DOT_CLASS = {
  running: "bg-success",
  paused: "bg-warning",
  attention: "bg-destructive",
  stopped: "bg-foreground/40",
  idle: "bg-foreground/40",
} as const;
