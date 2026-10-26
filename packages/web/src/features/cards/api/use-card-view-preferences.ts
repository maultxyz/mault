import {
  usePersistedFlag,
  usePersistedState,
} from "@/hooks/use-persisted-state";
import { CARD_GRID_DENSITIES } from "@/lib/constants/card-grid";
import {
  CARD_GRID_DENSITY_STORAGE_KEY,
  CARD_GROUP_DUPLICATES_STORAGE_KEY,
  CARD_REVIEW_LAYOUT_STORAGE_KEY,
  CARD_VIEW_MODE_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import type {
  CardGridDensity,
  CardViewMode,
  ReviewLayout,
} from "@/lib/interfaces/cards";

function parseCardViewMode(stored: string | null): CardViewMode {
  return stored === "list" ? "list" : "grid";
}

function parseReviewLayout(stored: string | null): ReviewLayout {
  return stored === "single" ? "single" : "grid";
}

function parseCardGridDensity(stored: string | null): CardGridDensity {
  return CARD_GRID_DENSITIES.find((density) => density === stored) ??
    "comfortable";
}

export function useCardViewPreferences() {
  const [viewMode, handleViewModeChange] = usePersistedState(
    CARD_VIEW_MODE_STORAGE_KEY,
    parseCardViewMode,
  );
  const [groupDuplicates, handleGroupDuplicatesChange] = usePersistedFlag(
    CARD_GROUP_DUPLICATES_STORAGE_KEY,
  );
  return {
    viewMode,
    handleViewModeChange,
    groupDuplicates,
    handleGroupDuplicatesChange,
  };
}

export function useCardGridDensity() {
  return usePersistedState(CARD_GRID_DENSITY_STORAGE_KEY, parseCardGridDensity);
}

export function useReviewLayout() {
  return usePersistedState(CARD_REVIEW_LAYOUT_STORAGE_KEY, parseReviewLayout);
}
