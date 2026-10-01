import { loadCardImage } from "@/features/collections/api/collections";
import { SCAN_IMAGE_URL_STALE_MS } from "@/lib/constants/scanner";
import { useQuery } from "@tanstack/react-query";

export function useScanImage(
  collectionGuid: string | undefined,
  scanId: string | undefined,
) {
  return useQuery({
    queryKey: ["collection-card-image", collectionGuid, scanId],
    queryFn: () =>
      loadCardImage(collectionGuid!, scanId!).then(
        (r) => r.data?.capturedImageUrl,
      ),
    enabled: !!collectionGuid && !!scanId,
    staleTime: SCAN_IMAGE_URL_STALE_MS,
  });
}
