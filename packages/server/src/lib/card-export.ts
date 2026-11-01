import {
  allExportAdapters,
  buildExportCsv,
  exportFilename,
  groupExportCards,
  exportEntryKey,
  supportsGame,
  type ExportContext,
} from "@magic-vault/shared";
import type { Context } from "hono";
import type { CardExportInput, CardExportResult } from "./interfaces/card-export";
import { resolveTcgplayerSkus } from "./tcgplayer-skus";

export async function buildCardExport({
  format,
  combineDuplicates,
  cards,
  gameKeys,
  game,
  exportName,
}: CardExportInput): Promise<CardExportResult> {
  const adapter = allExportAdapters.find((candidate) => candidate.key === format);
  if (!adapter) return { success: false, message: "Unknown export format." };
  if (!gameKeys.every((key) => supportsGame(adapter, key ?? undefined))) {
    return { success: false, message: "This export format doesn't support these cards." };
  }
  const ctx: ExportContext = {
    isMtg: game?.key === "mtg",
    fieldDefinitions: game?.fieldDefinitions ?? [],
    gameKey: game?.key,
    gameName: game?.name,
  };
  if (adapter.usesTcgplayerSkus) {
    const entries = groupExportCards(cards, adapter.groupBy, combineDuplicates);
    const skuMatches = await resolveTcgplayerSkus(game?.key, entries);
    ctx.tcgplayerSkusByEntryKey = Object.fromEntries(
      entries.flatMap((entry, index) => {
        const skuMatch = skuMatches[index];
        return skuMatch ? [[exportEntryKey(entry), skuMatch]] : [];
      }),
    );
  }
  const slug = exportName.replace(/\s+/g, "-").toLowerCase();
  return {
    success: true,
    csv: buildExportCsv(adapter, cards, ctx, combineDuplicates),
    filename: exportFilename(adapter, slug),
  };
}

export function csvResponse(c: Context, csv: string, filename: string): Response {
  return c.body(csv, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
  });
}
