import { toCardCondition } from "../card-condition";
import { CONDITION_EXPORT_LABELS } from "../constants/card-export.constant";
import type {
  ExportableCard,
  ExportAdapter,
  ExportContext,
  GroupBy,
  GroupedEntry,
} from "../interfaces/card-export.interface";
import type { CardCondition } from "../interfaces/card-condition.interface";
import type { PlayingCardWithDistance } from "../interfaces/card.interface";

export function supportsGame(
  adapter: ExportAdapter,
  gameKey: string | undefined,
): boolean {
  return (
    adapter.games === "all" ||
    (gameKey !== undefined && adapter.games.includes(gameKey))
  );
}

export function csvEscape(val: string): string {
  return /[",\r\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
}

export function conditionLabel(condition: CardCondition): string {
  return CONDITION_EXPORT_LABELS[condition];
}

export function purchasePrice(card: PlayingCardWithDistance, isFoil: boolean) {
  const price = (isFoil ? card.priceFoil : card.price) ?? card.price;
  return price != null ? price.toFixed(2) : "";
}

function groupCards(
  cards: ExportableCard[],
  groupBy: GroupBy,
  combineDuplicates: boolean,
): GroupedEntry[] {
  if (!combineDuplicates)
    return cards.map((entry) => ({
      card: entry.card,
      quantity: 1,
      isFoil: !!entry.isFoil,
      foilType: entry.foilType,
      condition: toCardCondition(entry.condition),
    }));
  const grouped = new Map<string, GroupedEntry>();
  for (const entry of cards) {
    const isFoil = !!entry.isFoil;
    const condition = toCardCondition(entry.condition);
    const key =
      groupBy === "card-foil"
        ? `${entry.card.id}:${isFoil}:${entry.foilType ?? ""}:${condition}`
        : `${entry.card.id}:${condition}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity++;
    else
      grouped.set(key, {
        card: entry.card,
        quantity: 1,
        isFoil,
        foilType: entry.foilType,
        condition,
      });
  }
  return Array.from(grouped.values());
}

const dateSuffix = () => new Date().toISOString().slice(0, 10);

export function buildExportCsv(
  adapter: ExportAdapter,
  cards: ExportableCard[],
  ctx: ExportContext,
  combineDuplicates: boolean,
): string {
  const entries = groupCards(cards, adapter.groupBy, combineDuplicates);
  return [
    adapter.headers(ctx).join(","),
    ...entries.map((entry) => adapter.row(entry, ctx).join(",")),
  ].join("\n");
}

export function exportFilename(adapter: ExportAdapter, slug: string): string {
  return `magic-vault-${adapter.filenameSlug}-${dateSuffix()}-${slug}.csv`;
}
