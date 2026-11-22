import {
  COLLECTION_CARD_DETAILS_REUSE_MS,
  type CollectionCardDetails,
  type Result,
} from "@magic-vault/shared";
import { queryOptions, type QueryClient, type QueryFunctionContext, type QueryKey } from "@tanstack/react-query";
import { apiGet, unwrap } from "@/lib/api/client";
import { getActiveOrgId } from "@/lib/auth/session";

export const collectionCardDetailKeys = {
  bundle: (collectionGuid: string, scanId: string) => ["collection-card-details", collectionGuid, scanId] as const,
  image: (collectionGuid: string, scanId: string) => ["collection-card-image", collectionGuid, scanId] as const,
  origin: (scanId: string) => ["card-scan-origin", scanId] as const,
  location: (scanId: string) => ["storage-locations", "card", scanId] as const,
  cost: (orgId: string | null | undefined, scanId: string) => ["business", "card-cost", orgId, scanId] as const,
};

function setQueryDataIfMissing(queryClient: QueryClient, queryKey: QueryKey, value: unknown) {
  if (queryClient.getQueryData(queryKey) === undefined) queryClient.setQueryData(queryKey, value);
}

function fillCardDetailQueries(
  queryClient: QueryClient,
  collectionGuid: string,
  scanId: string,
  details: CollectionCardDetails,
) {
  setQueryDataIfMissing(queryClient, collectionCardDetailKeys.image(collectionGuid, scanId), {
    capturedImageUrl: details.images.capturedImageUrl ?? null,
    capturedBackImageUrl: details.images.capturedBackImageUrl ?? null,
  });
  setQueryDataIfMissing(queryClient, collectionCardDetailKeys.origin(scanId), details.origin);
  setQueryDataIfMissing(queryClient, collectionCardDetailKeys.location(scanId), details.location);
  const orgId = getActiveOrgId();
  if (orgId) setQueryDataIfMissing(queryClient, collectionCardDetailKeys.cost(orgId, scanId), details.cost);
}

export const collectionCardDetailsQueryOptions = (collectionGuid: string, scanId: string) =>
  queryOptions({
    queryKey: collectionCardDetailKeys.bundle(collectionGuid, scanId),
    queryFn: async ({ client }) => {
      const details = await unwrap(
        apiGet<Result<CollectionCardDetails>>(`/api/collections/${collectionGuid}/cards/${scanId}/details`),
      );
      fillCardDetailQueries(client, collectionGuid, scanId, details);
      return details;
    },
    staleTime: COLLECTION_CARD_DETAILS_REUSE_MS,
    gcTime: COLLECTION_CARD_DETAILS_REUSE_MS,
    retry: false,
  });

export async function loadThroughCardDetails<FieldValue>(
  { client, queryKey }: QueryFunctionContext,
  collectionGuid: string,
  scanId: string,
  pickField: (details: CollectionCardDetails) => FieldValue,
  loadAlone: () => Promise<FieldValue>,
): Promise<FieldValue> {
  if (!collectionGuid || !scanId) return loadAlone();
  if (client.getQueryData(queryKey) !== undefined) {
    client.removeQueries({ queryKey: collectionCardDetailKeys.bundle(collectionGuid, scanId), exact: true });
    return loadAlone();
  }
  try {
    return pickField(await client.fetchQuery(collectionCardDetailsQueryOptions(collectionGuid, scanId)));
  } catch {
    return loadAlone();
  }
}
