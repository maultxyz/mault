import { loadCardImage } from "@/features/collections/api/collections";
import { SCAN_IMAGE_URL_STALE_MS } from "@/lib/constants/scanner";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const scanImageQueryOptions = (
  collectionGuid: string | undefined,
  scanId: string | undefined,
) =>
  queryOptions({
    queryKey: ["collection-card-image", collectionGuid, scanId],
    queryFn: () =>
      loadCardImage(collectionGuid!, scanId!).then(
        (r) => r.data?.capturedImageUrl,
      ),
    enabled: !!collectionGuid && !!scanId,
    staleTime: SCAN_IMAGE_URL_STALE_MS,
  });

export function useScanImage(
  collectionGuid: string | undefined,
  scanId: string | undefined,
) {
  return useQuery(scanImageQueryOptions(collectionGuid, scanId));
}
