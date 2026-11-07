import {
  DOCUMENT_SCANNER_CARD_ARRIVAL_POLL_MS,
  DOCUMENT_SCANNER_CARD_ARRIVAL_TIMEOUT_MS,
  DOCUMENT_SCANNER_FLATBED_CARD_ARRIVAL_TIMEOUT_MS,
  DOCUMENT_SCANNER_IGNORED_IR_DROP_WAIT_MS,
} from "@/lib/constants/scanner";
import type { DocumentScannerFeedParams } from "@/lib/interfaces/scanner";
import { scanLog } from "@/lib/scan-log";
import type { SerialRequestResult } from "@magic-vault/shared";

function feedReply(reply: Record<string, unknown>): SerialRequestResult {
  return { sent: true, line: JSON.stringify(reply) };
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function isModuleOneLoaded(readIR: DocumentScannerFeedParams["readIR"]) {
  const ir = await readIR();
  return ir?.[0] === true;
}

export async function feedCardFromDocumentScanner({
  feedDocumentScannerCard,
  readIR,
  ignoreIrSensors,
  describeScannerError,
  deliverCardWithSorterFeeder,
  onFlatbedPageScanned,
  cardDidNotArriveMessage,
  moduleOneNotEmptyMessage,
}: DocumentScannerFeedParams): Promise<SerialRequestResult> {
  if (!ignoreIrSensors && (await isModuleOneLoaded(readIR))) {
    return feedReply({ error: moduleOneNotEmptyMessage });
  }

  const result = await feedDocumentScannerCard();
  if (result.type === "error") {
    scanLog(
      `[document-scanner] feed failed: ${result.reason} ${result.message ?? ""}`,
    );
    return result.reason === "feeder_empty"
      ? feedReply({ empty: true })
      : feedReply({ error: describeScannerError(result.reason) });
  }

  if (deliverCardWithSorterFeeder) return deliverCardWithSorterFeeder();

  if (ignoreIrSensors) {
    await wait(DOCUMENT_SCANNER_IGNORED_IR_DROP_WAIT_MS);
    return feedReply({ detected: true });
  }

  const isFlatbedPage = result.paperSource === "flatbed";
  if (isFlatbedPage) onFlatbedPageScanned();
  const deadline =
    Date.now() +
    (isFlatbedPage
      ? DOCUMENT_SCANNER_FLATBED_CARD_ARRIVAL_TIMEOUT_MS
      : DOCUMENT_SCANNER_CARD_ARRIVAL_TIMEOUT_MS);
  while (Date.now() < deadline) {
    if (await isModuleOneLoaded(readIR)) return feedReply({ detected: true });
    await wait(DOCUMENT_SCANNER_CARD_ARRIVAL_POLL_MS);
  }
  return feedReply({ error: cardDidNotArriveMessage });
}
