import { toPortraitCardImage } from "../card-image";
import {
  SYNC_IMAGE_FETCH_ATTEMPTS,
  SYNC_IMAGE_FETCH_RETRYABLE_STATUSES,
  SYNC_IMAGE_FETCH_TIMEOUT_MS,
} from "../constants/sync";
import type { CardImageFetchOptions } from "../interfaces/sync-job";

export async function fetchPortraitCardImage(
  url: string,
  headers: Record<string, string>,
  { runSignal, waitForTurn }: CardImageFetchOptions = {},
): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    await waitForTurn?.();
    let isRetryable = true;
    try {
      const timeoutSignal = AbortSignal.timeout(SYNC_IMAGE_FETCH_TIMEOUT_MS);
      const response = await fetch(url, {
        headers,
        signal: runSignal
          ? AbortSignal.any([runSignal, timeoutSignal])
          : timeoutSignal,
      });
      if (!response.ok) {
        isRetryable = SYNC_IMAGE_FETCH_RETRYABLE_STATUSES.includes(
          response.status,
        );
        throw new Error(`Image fetch failed: ${response.status}`);
      }
      return await toPortraitCardImage(
        Buffer.from(await response.arrayBuffer()),
      );
    } catch (err) {
      if (
        !isRetryable ||
        attempt >= SYNC_IMAGE_FETCH_ATTEMPTS ||
        runSignal?.aborted
      ) {
        throw err;
      }
    }
  }
}
