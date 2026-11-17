import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionsQueryOptions, setActiveCollection } from "@/features/collections/api/collections";

export function useActivateCollection(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setActiveCollection,
    onSuccess: (next) => queryClient.setQueryData(collectionsQueryOptions(orgId).queryKey, next),
  });
}
