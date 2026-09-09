import type {
  FieldMeta,
  PlayingCardWithDistance,
  ScannedCard,
} from "@magic-vault/shared";

export interface ExportContext {
  isMtg: boolean;
  fieldDefinitions: FieldMeta[];
}

export interface GroupedEntry {
  card: PlayingCardWithDistance;
  quantity: number;
  isFoil: boolean;
}

export type GroupBy = "card" | "card-foil";

export interface ExportAdapter {
  key: string;
  label: string;
  filenameSlug: string;
  groupBy: GroupBy;
  // Game.key values this format applies to, or "all" - game keys are
  // admin-defined free text (see the Games Manager), not a fixed enum, so
  // this can't be a literal union.
  games: "all" | string[];
  headers: (ctx: ExportContext) => string[];
  row: (entry: GroupedEntry, ctx: ExportContext) => string[];
}

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
  return val.includes(",") || val.includes('"')
    ? `"${val.replace(/"/g, '""')}"`
    : val;
}

export function purchasePrice(card: PlayingCardWithDistance, isFoil: boolean) {
  const price = (isFoil ? card.priceFoil : card.price) ?? card.price;
  return price != null ? price.toFixed(2) : "";
}

function groupCards(cards: ScannedCard[], groupBy: GroupBy): GroupedEntry[] {
  const grouped = new Map<string, GroupedEntry>();
  for (const entry of cards) {
    const isFoil = !!entry.isFoil;
    const key =
      groupBy === "card-foil" ? `${entry.card.id}:${isFoil}` : entry.card.id;
    const existing = grouped.get(key);
    if (existing) existing.quantity++;
    else grouped.set(key, { card: entry.card, quantity: 1, isFoil });
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
  cards: ScannedCard[],
  collection: string,
  ctx: ExportContext,
) {
  if (cards.length === 0) return;
  const entries = groupCards(cards, adapter.groupBy);
  const csv = [
    adapter.headers(ctx).join(","),
    ...entries.map((entry) => adapter.row(entry, ctx).join(",")),
  ].join("\n");
  downloadCsv(
    csv,
    `magic-vault-${adapter.filenameSlug}-${dateSuffix()}-${collection}.csv`,
  );
}
