import { applyPiScanState } from "@/features/scanner/lib/pi-scan-store";
import { toast } from "@/lib/toast";
import type { PiScanSessionResult } from "@magic-vault/shared";

export function applyPiScanSessionResult(result: PiScanSessionResult): void {
  if (result.data) applyPiScanState(result.data);
  if (result.success || !result.message) return;
  if (result.data?.phase === "error" && result.data.message) return;
  toast.error(result.message);
}

export async function settlePiScanSessionRequest(
  request: Promise<PiScanSessionResult>,
  unreachableMessage: string,
): Promise<void> {
  let result: PiScanSessionResult;
  try {
    result = await request;
  } catch {
    toast.error(unreachableMessage);
    return;
  }
  applyPiScanSessionResult(result);
}
