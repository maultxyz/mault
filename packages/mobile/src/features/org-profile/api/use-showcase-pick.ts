import { useSyncExternalStore } from "react";
import { readShowcasePick, subscribeToShowcasePick } from "@/features/org-profile/lib/showcase-pick";
import type { ShowcasePick } from "@/lib/interfaces/org-profile";

export function useShowcasePick(): ShowcasePick {
  return useSyncExternalStore(subscribeToShowcasePick, readShowcasePick);
}
