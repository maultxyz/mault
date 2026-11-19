import {
  CATALOG_SYNC_REPORT_COLOR_FAILED,
  CATALOG_SYNC_REPORT_COLOR_PARTIAL,
  CATALOG_SYNC_REPORT_COLOR_SUCCESS,
  CATALOG_SYNC_REPORT_DESCRIPTION_MAX_LENGTH,
} from "./constants/sync";
import type {
  CatalogSyncReportOptions,
  CatalogSyncReportPayload,
  CatalogSyncResult,
} from "./interfaces/catalog-sync-report";

function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function describeCatalog(result: CatalogSyncResult): string {
  const label = `**${result.gameKey}** (${result.lang})`;
  if (!result.succeeded) return `${label}: failed`;
  const removedCards = result.removedCards ?? 0;
  if (result.newCards === 0 && result.updatedCards === 0 && removedCards === 0) {
    return `${label}: no changes`;
  }
  const counts = `${label}: ${result.newCards} new, ${result.updatedCards} updated`;
  return removedCards > 0 ? `${counts}, ${removedCards} removed` : counts;
}

export function buildCatalogSyncReport(
  results: CatalogSyncResult[],
  options: CatalogSyncReportOptions,
): CatalogSyncReportPayload {
  const failedCount = results.filter((result) => !result.succeeded).length;
  const color =
    failedCount === 0
      ? CATALOG_SYNC_REPORT_COLOR_SUCCESS
      : failedCount === results.length
        ? CATALOG_SYNC_REPORT_COLOR_FAILED
        : CATALOG_SYNC_REPORT_COLOR_PARTIAL;

  return {
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `Card catalog sync${options.forceResync ? " (force resync)" : ""}`,
        description: truncateText(
          results.map(describeCatalog).join("\n"),
          CATALOG_SYNC_REPORT_DESCRIPTION_MAX_LENGTH,
        ),
        color,
        timestamp: options.timestamp,
        ...(options.runUrl ? { url: options.runUrl } : {}),
      },
    ],
  };
}

export async function postCatalogSyncReport(
  webhookUrl: string,
  payload: CatalogSyncReportPayload,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      `Discord webhook returned ${response.status}: ${await response.text()}`,
    );
  }
}
