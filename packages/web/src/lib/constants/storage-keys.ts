// Every localStorage/sessionStorage key the app writes, combined here so a
// key string is never duplicated (and typo'd) across the file that reads it
// and the file that writes it.

export const SIDEBAR_EXPANDED_STORAGE_KEY = "sidebarExpanded";

export const ESP32_MOUNT_TYPE_STORAGE_KEY = "magic-vault:build-esp32-mount-type";
export const BUILD_CHECKLIST_STORAGE_KEY = "magic-vault:build-checklist";
export const BUILD_PARTS_CHECKLIST_STORAGE_KEY =
  "magic-vault:build-parts-checklist";
export const BUILD_BOARD_TYPE_STORAGE_KEY = "magic-vault:build-board-type";
export const BUILD_MODULE_COUNT_STORAGE_KEY =
  "magic-vault:build-parts-module-count";

export const SORTING_RULES_TOUR_COMPLETED_KEY =
  "magic-vault:sorting-rules-tour-completed";
export const CALIBRATION_TOUR_COMPLETED_KEY =
  "magic-vault:calibration-tour-completed";
export const ONBOARDING_COMPLETED_KEY = "magic-vault:onboarding-completed";

export const ACTIVE_COLLECTION_STORAGE_KEY = "activeCollectionGuid";
export const ACTIVE_ORG_STORAGE_KEY = "activeOrgId";

// sessionStorage, not localStorage — an impersonation session shouldn't
// survive the tab closing.
export const IMPERSONATION_STORAGE_KEY = "impersonation";

export const PENDING_INVITE_STORAGE_KEY = "pendingInviteToken";
export const LOCAL_AUTH_TOKEN_STORAGE_KEY = "localAuthToken";
export const LANGUAGE_STORAGE_KEY = "language";
export const DISMISSED_ALERTS_STORAGE_KEY = "magic-vault:dismissed-alerts";
