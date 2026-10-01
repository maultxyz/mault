import type { CollectionOverrideFormValues } from "@/schemas/collection-override.schema";

export const NO_DISCORD_CHANNEL = "none";
export const NO_DISCORD_ROLE = "none";

export const EMPTY_COLLECTION_OVERRIDE: CollectionOverrideFormValues = {
  collectionGuid: "",
  scanChannelId: null,
  errorChannelId: null,
};
