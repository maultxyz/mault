import type { ReactNode } from "react";

export interface AppShellProps {
  children: ReactNode;
}

export interface WindowControlsOverlayLike extends EventTarget {
  visible: boolean;
}
