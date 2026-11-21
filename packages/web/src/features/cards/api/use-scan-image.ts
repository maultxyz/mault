import {
  collectionCardDetailKeys,
  loadThroughCardDetails,
} from "@/features/collections/api/card-details";
import { loadCardImage } from "@/features/collections/api/collections";
import { SCAN_IMAGE_URL_STALE_MS } from "@/lib/constants/scanner";
import type { ScanImageUrls } from "@/lib/interfaces/cards";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const scanImageQueryOptions = (
  collectionGuid: string | undefined,
  scanId: string | undefined,
) =>
  queryOptions({
    queryKey: collectionCardDetailKeys.image(collectionGuid, scanId),
    queryFn: (context): Promise<ScanImageUrls> =>
      loadThroughCardDetails(
        context,
        collectionGuid,
        scanId,
        (details) => details.images,
        () => loadCardImage(collectionGuid!, scanId!).then((r) => r.data ?? {}),
      ),
    enabled: !!collectionGuid && !!scanId,
    staleTime: SCAN_IMAGE_URL_STALE_MS,
  });

export function useScanImage(
  collectionGuid: string | undefined,
  scanId: string | undefined,
) {
  return useQuery({
    ...scanImageQueryOptions(collectionGuid, scanId),
    select: (images) => images.capturedImageUrl,
  });
}

export function useScanBackImage(
  collectionGuid: string | undefined,
  scanId: string | undefined,
) {
  return useQuery({
    ...scanImageQueryOptions(collectionGuid, scanId),
    select: (images) => images.capturedBackImageUrl,
  });
}
