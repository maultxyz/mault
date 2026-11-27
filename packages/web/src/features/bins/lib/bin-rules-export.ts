import { downloadBlob } from "@/lib/download";
import {
  binRulesExportFilename,
  serializeBinRulesExport,
  type BinRulesExport,
} from "@magic-vault/shared";

export function downloadBinRulesExport(data: BinRulesExport): void {
  const blob = new Blob([serializeBinRulesExport(data)], {
    type: "application/json",
  });
  downloadBlob(blob, binRulesExportFilename(data));
}
