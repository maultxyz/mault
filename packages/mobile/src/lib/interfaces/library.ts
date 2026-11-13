import type { ReactNode } from "react";
import type { LIBRARY_VIEWS } from "@/lib/constants/library";

export type LibraryView = (typeof LIBRARY_VIEWS)[number];

export interface LibraryViewProps {
  title: string;
  viewSwitcher: ReactNode;
}
