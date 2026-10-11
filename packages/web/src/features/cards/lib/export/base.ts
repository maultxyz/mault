import type {
  ExportableCard,
  ExportAdapter,
  ExportContext,
  GroupBy,
  GroupedEntry,
} from "@/lib/interfaces/cards";
import { CONDITION_EXPORT_LABELS } from "@/lib/constants/cards";
import {
  toCardCondition,
  type CardCondition,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";

export type {
  ExportableCard,
  ExportAdapter,
  ExportContext,
  GroupBy,
  GroupedEntry,
};

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

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const dateSuffix = () => new Date().toISOString().slice(0, 10);

export function runExport(
  adapter: ExportAdapter,
  cards: ExportableCard[],
  collection: string,
  ctx: ExportContext,
  combineDuplicates: boolean,
) {
  if (cards.length === 0) return;
  const entries = groupCards(cards, adapter.groupBy, combineDuplicates);
  const csv = [
    adapter.headers(ctx).join(","),
    ...entries.map((entry) => adapter.row(entry, ctx).join(",")),
  ].join("\n");
  downloadCsv(
    csv,
    `magic-vault-${adapter.filenameSlug}-${dateSuffix()}-${collection}.csv`,
  );
}
