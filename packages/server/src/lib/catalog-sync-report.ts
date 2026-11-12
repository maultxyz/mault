import {
  CATALOG_SYNC_REPORT_COLOR_FAILED,
  CATALOG_SYNC_REPORT_COLOR_PARTIAL,
  CATALOG_SYNC_REPORT_COLOR_SUCCESS,
  CATALOG_SYNC_REPORT_DESCRIPTION_MAX_LENGTH,
  CATALOG_SYNC_REPORT_FIELD_VALUE_MAX_LENGTH,
  CATALOG_SYNC_REPORT_MAX_FIELDS,
} from "./constants/sync";
import type {
  CatalogSyncReportOptions,
  CatalogSyncReportPayload,
  CatalogSyncResult,
} from "./interfaces/catalog-sync-report";

function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function catalogLabel(result: CatalogSyncResult): string {
  return `${result.gameKey} (${result.lang})`;
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function hasChanges(result: CatalogSyncResult): boolean {
  return result.newCards > 0 || result.updatedCards > 0 || result.cardErrors > 0;
}

function describeCatalog(result: CatalogSyncResult): string {
  if (!result.succeeded) {
    return `Failed after ${formatDuration(result.durationMs)}: ${result.fatalError ?? "unknown error"}`;
  }
  const lines = [
    `${result.newCards} new, ${result.updatedCards} updated, ${result.cardErrors} errors (${result.totalCards} cards, ${formatDuration(result.durationMs)})`,
  ];
  if (result.newCardNames.length > 0) {
    const moreCount = result.newCards - result.newCardNames.length;
    lines.push(
      `New: ${result.newCardNames.join(", ")}${moreCount > 0 ? ` and ${moreCount} more` : ""}`,
    );
  }
  for (const errorLine of result.cardErrorSamples) lines.push(errorLine);
  return lines.join("\n");
}

export function buildCatalogSyncReport(
  results: CatalogSyncResult[],
  options: CatalogSyncReportOptions,
): CatalogSyncReportPayload {
  const failedResults = results.filter((result) => !result.succeeded);
  const changedResults = results.filter(
    (result) => !result.succeeded || hasChanges(result),
  );
  const unchangedResults = results.filter(
    (result) => result.succeeded && !hasChanges(result),
  );
  const totalNewCards = results.reduce((sum, result) => sum + result.newCards, 0);
  const totalUpdatedCards = results.reduce(
    (sum, result) => sum + result.updatedCards,
    0,
  );

  const color =
    failedResults.length === 0
      ? CATALOG_SYNC_REPORT_COLOR_SUCCESS
      : failedResults.length === results.length
        ? CATALOG_SYNC_REPORT_COLOR_FAILED
        : CATALOG_SYNC_REPORT_COLOR_PARTIAL;

  const descriptionLines = [
    `${results.length - failedResults.length} of ${results.length} catalogs synced${options.forceResync ? " (force resync)" : ""}: ${totalNewCards} new cards, ${totalUpdatedCards} updated.`,
  ];
  if (failedResults.length > 0) {
    descriptionLines.push(`Failed: ${failedResults.map(catalogLabel).join(", ")}`);
  }
  if (unchangedResults.length > 0) {
    descriptionLines.push(`Unchanged: ${unchangedResults.map(catalogLabel).join(", ")}`);
  }

  return {
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title:
          failedResults.length === 0
            ? "Card catalog sync completed"
            : "Card catalog sync completed with failures",
        description: truncateText(
          descriptionLines.join("\n"),
          CATALOG_SYNC_REPORT_DESCRIPTION_MAX_LENGTH,
        ),
        color,
        timestamp: options.timestamp,
        ...(options.runUrl ? { url: options.runUrl } : {}),
        fields: changedResults
          .slice(0, CATALOG_SYNC_REPORT_MAX_FIELDS)
          .map((result) => ({
          name: `${result.succeeded ? "Synced" : "Failed"}: ${catalogLabel(result)}`,
          value: truncateText(
            describeCatalog(result),
            CATALOG_SYNC_REPORT_FIELD_VALUE_MAX_LENGTH,
          ),
        })),
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
