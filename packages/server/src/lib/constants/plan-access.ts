export const CHAOS_SORT_UPGRADE_MESSAGE =
  "Chaos sort is not part of your plan. Upgrade your plan to use it.";

export const CUSTOM_SOUNDS_UPGRADE_MESSAGE =
  "Custom sounds are not part of your plan. Upgrade your plan to upload your own clips.";

export const REPACK_UPGRADE_MESSAGE =
  "Building repacks is not part of your plan. Upgrade your plan to use it.";

export const STORAGE_UPGRADE_MESSAGE =
  "Storage locations are not part of your plan. Upgrade your plan to use them.";

export const FLEET_HEALTH_LOCKED_RESULT = {
  success: false,
  message:
    "Fleet health is not part of your plan. Upgrade your plan to use it.",
  upgradeRequired: true,
} as const;

export const STORAGE_LOCKED_RESULT = {
  success: false,
  message: STORAGE_UPGRADE_MESSAGE,
  upgradeRequired: true,
} as const;
