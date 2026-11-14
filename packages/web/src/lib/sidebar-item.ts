import { buttonVariants } from "@/components/ui/button";
import {
  SIDEBAR_IDLE_ITEM_CLASS,
  SIDEBAR_SELECTED_ITEM_CLASS,
} from "@/lib/constants/nav";
import { SIDEBAR_EXPANDED_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { createStoredFlag } from "@/lib/stored-flag";
import { cn } from "@/lib/utils";

export const useSidebarExpanded = createStoredFlag(SIDEBAR_EXPANDED_STORAGE_KEY);

export function sidebarItemClassName({
  isActive,
  size = "default",
}: {
  isActive: boolean;
  size?: "default" | "icon-lg";
}) {
  return cn(
    buttonVariants({ variant: "ghost", size }),
    isActive ? SIDEBAR_SELECTED_ITEM_CLASS : SIDEBAR_IDLE_ITEM_CLASS,
  );
}
