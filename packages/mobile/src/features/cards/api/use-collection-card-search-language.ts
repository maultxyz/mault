import { cardSearchLanguageOfCollection } from "@magic-vault/shared";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useActiveOrgId } from "@/hooks/use-org";

export function useCollectionCardSearchLanguage(collectionGuid: string | null | undefined): string {
  const { data: collections } = useQuery(collectionsQueryOptions(useActiveOrgId()));
  return cardSearchLanguageOfCollection(collections, collectionGuid);
}

export function cachedCollectionCardSearchLanguage(
  queryClient: QueryClient,
  orgId: string | null,
  collectionGuid: string,
): string {
  return cardSearchLanguageOfCollection(
    queryClient.getQueryData(collectionsQueryOptions(orgId).queryKey),
    collectionGuid,
  );
}
