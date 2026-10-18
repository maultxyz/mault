import { PRICE_SYNC_EMBED_COLORS } from "../constants/discord";
import type {
  DiscordEmbed,
  PriceSyncSourceOutcome,
  PriceSyncSummary,
} from "../interfaces/discord";

const count = (n: number) => n.toLocaleString("en-US");

function describeSource(outcome: PriceSyncSourceOutcome): string {
  if (outcome.status === "failed") return "Failed";
  if (outcome.status === "unchanged") return "No changes upstream";
  const parts = [`${count(outcome.prices)} prices`];
  if (outcome.products) parts.push(`${count(outcome.products)} products`);
  if (outcome.failures) parts.push(`${count(outcome.failures)} failed`);
  return parts.join(", ");
}

export function buildPriceSyncEmbed(summary: PriceSyncSummary): DiscordEmbed {
  const outcomes = Object.values(summary.sources);
  const failed =
    summary.refreshedCards === null ||
    outcomes.every((o) => o.status === "failed");
  const partial =
    !failed &&
    outcomes.some(
      (o) => o.status === "failed" || (o.status === "updated" && !!o.failures),
    );

  const fields = Object.entries(summary.sources).map(([name, outcome]) => ({
    name,
    value: describeSource(outcome),
    inline: true,
  }));
  fields.push({
    name: "Cards repriced",
    value:
      summary.refreshedCards === null ? "Failed" : count(summary.refreshedCards),
    inline: false,
  });

  return {
    title: failed
      ? "Price update failed"
      : partial
        ? "Prices updated with errors"
        : "Prices updated",
    description: summary.forced ? "Forced full re-pull." : undefined,
    color: failed
      ? PRICE_SYNC_EMBED_COLORS.failed
      : partial
        ? PRICE_SYNC_EMBED_COLORS.partial
        : PRICE_SYNC_EMBED_COLORS.success,
    timestamp: new Date().toISOString(),
    fields,
  };
}
