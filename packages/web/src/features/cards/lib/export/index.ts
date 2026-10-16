import {
  buildExportCsv,
  exportFilename,
  type ExportableCard,
  type ExportAdapter,
  type ExportContext,
} from "@magic-vault/shared";

export {
  allExportAdapters,
  supportsGame,
  type ExportableCard,
  type ExportAdapter,
  type ExportContext,
} from "@magic-vault/shared";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function runExport(
  adapter: ExportAdapter,
  cards: ExportableCard[],
  collection: string,
  ctx: ExportContext,
  combineDuplicates: boolean,
) {
  if (cards.length === 0) return;
  downloadCsv(buildExportCsv(adapter, cards, ctx, combineDuplicates), exportFilename(adapter, collection));
}
