import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { cardSearchLanguageOfCollection } from "@magic-vault/shared";
import { useQuery, type QueryClient } from "@tanstack/react-query";

export function useCollectionCardSearchLanguage(
  collectionGuid: string | undefined,
): string {
  const { data: collections } = useQuery(collectionsQueryOptions);
  return cardSearchLanguageOfCollection(collections, collectionGuid);
}

export function cachedCollectionCardSearchLanguage(
  queryClient: QueryClient,
  collectionGuid: string,
): string {
  return cardSearchLanguageOfCollection(
    queryClient.getQueryData(collectionsQueryOptions.queryKey),
    collectionGuid,
  );
}
