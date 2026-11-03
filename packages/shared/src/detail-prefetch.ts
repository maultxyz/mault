import type {
  DetailPrefetchChainOptions,
  DetailPrefetchChainStep,
} from "./interfaces/review-grid.interface";

export async function walkDetailPrefetchChain<Step extends DetailPrefetchChainStep>({
  firstScanId,
  stepCount,
  loadStep,
  onStepLoaded,
  isCancelled,
}: DetailPrefetchChainOptions<Step>): Promise<void> {
  let scanId: string | null = firstScanId;
  const visitedScanIds = new Set<string>();
  while (scanId && visitedScanIds.size < stepCount && !visitedScanIds.has(scanId)) {
    visitedScanIds.add(scanId);
    const step: Step | null = await loadStep(scanId).catch(() => null);
    if (isCancelled() || !step) return;
    onStepLoaded(scanId, step);
    scanId = step.nextScanId;
  }
}
