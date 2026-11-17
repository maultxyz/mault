import type { LoadingViewfinderCorner } from "@/lib/interfaces/loading";

export const LOADING_QUIP_INTERVAL_MS = 2400;
export const LOADING_QUIP_KEYS = [
  "shuffling",
  "feeding",
  "polishing",
  "counting",
  "pricing",
  "sorting",
] as const;

export const LOADING_VIEWFINDER_CORNERS: LoadingViewfinderCorner[] = [
  {
    className: "-top-4 -left-4 rounded-tl-lg border-t-2 border-l-2",
    lockOffsetX: "6px",
    lockOffsetY: "6px",
  },
  {
    className: "-top-4 -right-4 rounded-tr-lg border-t-2 border-r-2",
    lockOffsetX: "-6px",
    lockOffsetY: "6px",
  },
  {
    className: "-bottom-4 -left-4 rounded-bl-lg border-b-2 border-l-2",
    lockOffsetX: "6px",
    lockOffsetY: "-6px",
  },
  {
    className: "-bottom-4 -right-4 rounded-br-lg border-b-2 border-r-2",
    lockOffsetX: "-6px",
    lockOffsetY: "-6px",
  },
];
