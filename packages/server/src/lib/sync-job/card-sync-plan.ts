import type { CardSyncAction, CardSyncPlanInput } from "../interfaces/sync-job";

export function planCardSync({
  hasImage,
  hasBackImage,
  stored,
  forceResync,
  wasRecentlyUpdated,
  currentEmbeddingVersion,
  reembedsOutdatedEmbeddings,
}: CardSyncPlanInput): CardSyncAction {
  if (!hasImage || wasRecentlyUpdated) return "skip";
  if (forceResync || !stored) return "embedBothFaces";
  if (
    reembedsOutdatedEmbeddings &&
    stored.embeddingVersion < currentEmbeddingVersion
  ) {
    return "embedBothFaces";
  }
  if (hasBackImage && !stored.hasBackEmbedding) return "embedBackFaceOnly";
  return "skip";
}
