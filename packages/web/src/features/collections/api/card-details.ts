import { businessKeys } from "@/features/business/api/business";
import { storageLocationKeys } from "@/features/storage/api/storage-locations";
import { apiGet, getRequestAuth } from "@/lib/api/client";
import {
  COLLECTION_CARD_DETAILS_REUSE_MS,
  type CollectionCardDetails,
  type Result,
} from "@magic-vault/shared";
import {
  queryOptions,
  type QueryClient,
  type QueryFunctionContext,
  type QueryKey,
} from "@tanstack/react-query";

export const collectionCardDetailKeys = {
  bundle: (collectionGuid: string, scanId: string) =>
    ["collection-card-details", collectionGuid, scanId] as const,
  image: (collectionGuid: string | undefined, scanId: string | undefined) =>
    ["collection-card-image", collectionGuid, scanId] as const,
  diagnostics: (collectionGuid: string | undefined, scanId: string | undefined) =>
    ["collection-card-diagnostics", collectionGuid, scanId] as const,
  origin: (scanId: string) => ["card-scan-origin", scanId] as const,
};

function setQueryDataIfMissing(
  queryClient: QueryClient,
  queryKey: QueryKey,
  value: unknown,
) {
  if (queryClient.getQueryData(queryKey) === undefined) {
    queryClient.setQueryData(queryKey, value);
  }
}

async function fillCardDetailQueries(
  queryClient: QueryClient,
  collectionGuid: string,
  scanId: string,
  details: CollectionCardDetails,
) {
  setQueryDataIfMissing(queryClient, collectionCardDetailKeys.image(collectionGuid, scanId), details.images);
  setQueryDataIfMissing(queryClient, collectionCardDetailKeys.diagnostics(collectionGuid, scanId), details.diagnostics);
  setQueryDataIfMissing(queryClient, collectionCardDetailKeys.origin(scanId), details.origin);
  setQueryDataIfMissing(queryClient, storageLocationKeys.card(scanId), details.location);
  const { orgId } = await getRequestAuth();
  if (orgId) {
    setQueryDataIfMissing(queryClient, businessKeys.cardCost(orgId, scanId), details.cost);
  }
}

export const collectionCardDetailsQueryOptions = (
  collectionGuid: string,
  scanId: string,
) =>
  queryOptions({
    queryKey: collectionCardDetailKeys.bundle(collectionGuid, scanId),
    queryFn: async ({ client }) => {
      const result = await apiGet<Result<CollectionCardDetails>>(
        `/api/collections/${collectionGuid}/cards/${scanId}/details`,
      );
      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Card not found.");
      }
      await fillCardDetailQueries(client, collectionGuid, scanId, result.data);
      return result.data;
    },
    staleTime: COLLECTION_CARD_DETAILS_REUSE_MS,
    gcTime: COLLECTION_CARD_DETAILS_REUSE_MS,
    retry: false,
  });

export async function loadThroughCardDetails<FieldValue>(
  { client, queryKey }: QueryFunctionContext,
  collectionGuid: string | undefined,
  scanId: string | undefined,
  pickField: (details: CollectionCardDetails) => FieldValue,
  loadAlone: () => Promise<FieldValue>,
): Promise<FieldValue> {
  if (!collectionGuid || !scanId) return loadAlone();
  if (client.getQueryData(queryKey) !== undefined) {
    client.removeQueries({
      queryKey: collectionCardDetailKeys.bundle(collectionGuid, scanId),
      exact: true,
    });
    return loadAlone();
  }
  try {
    return pickField(
      await client.fetchQuery(collectionCardDetailsQueryOptions(collectionGuid, scanId)),
    );
  } catch {
    return loadAlone();
  }
}
