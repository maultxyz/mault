import type {
  FieldMeta,
  PlayingCardWithDistance,
  ScannedCard,
} from "@magic-vault/shared";
import { getCardValue } from "@magic-vault/shared";

function csvEscape(val: string): string {
  return val.includes(",") || val.includes('"')
    ? `"${val.replace(/"/g, '""')}"`
    : val;
}

function groupByCardId(
  cards: ScannedCard[],
): Map<string, { card: PlayingCardWithDistance; quantity: number }> {
  const grouped = new Map<
    string,
    { card: PlayingCardWithDistance; quantity: number }
  >();
  for (const entry of cards) {
    const existing = grouped.get(entry.card.id);
    if (existing) existing.quantity++;
    else grouped.set(entry.card.id, { card: entry.card, quantity: 1 });
  }
  return grouped;
}

function groupByCardIdAndFoil(
  cards: ScannedCard[],
): Map<
  string,
  { card: PlayingCardWithDistance; quantity: number; isFoil: boolean }
> {
  const grouped = new Map<
    string,
    { card: PlayingCardWithDistance; quantity: number; isFoil: boolean }
  >();
  for (const entry of cards) {
    const isFoil = !!entry.isFoil;
    const key = `${entry.card.id}:${isFoil}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity++;
    else grouped.set(key, { card: entry.card, quantity: 1, isFoil });
  }
  return grouped;
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

function purchasePrice(card: PlayingCardWithDistance, isFoil: boolean) {
  const price = (isFoil ? card.priceFoil : card.price) ?? card.price;
  return price != null ? price.toFixed(2) : "";
}

export function exportToManabox(cards: ScannedCard[], collection: string) {
  if (cards.length === 0) return;
  const grouped = groupByCardIdAndFoil(cards);
  const headers = [
    "Name",
    "Set code",
    "Set name",
    "Collector number",
    "Foil",
    "Quantity",
    "Scryfall ID",
    "Condition",
    "Language",
    "Purchase price (USD)",
  ];
  const rows = Array.from(grouped.values()).map(
    ({ card, quantity, isFoil }) => [
      csvEscape(card.name),
      card.set.toUpperCase(),
      csvEscape(card.setName),
      card.collectorNumber,
      isFoil ? "foil" : "",
      String(quantity),
      card.id,
      "Near Mint",
      "en",
      purchasePrice(card, isFoil),
    ],
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, `magic-vault-manabox-${dateSuffix()}-${collection}.csv`);
}

export function exportToMoxfield(cards: ScannedCard[], collection: string) {
  if (cards.length === 0) return;
  const grouped = groupByCardIdAndFoil(cards);
  const headers = [
    "Count",
    "Name",
    "Edition",
    "Condition",
    "Language",
    "Foil",
    "Collector Number",
    "Alter",
    "Proxy",
    "Purchase Price (USD)",
  ];
  const rows = Array.from(grouped.values()).map(
    ({ card, quantity, isFoil }) => [
      String(quantity),
      csvEscape(card.name),
      card.set.toUpperCase(),
      "Near Mint",
      "EN",
      isFoil ? "foil" : "",
      card.collectorNumber,
      "False",
      "False",
      purchasePrice(card, isFoil),
    ],
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, `magic-vault-moxfield-${dateSuffix()}-${collection}.csv`);
}

export function exportToTcgplayer(cards: ScannedCard[], collection: string) {
  if (cards.length === 0) return;
  const grouped = groupByCardId(cards);
  const headers = [
    "Quantity",
    "Name",
    "Set Name",
    "Number",
    "Condition",
    "Printing",
    "Language",
  ];
  const rows = Array.from(grouped.values()).map(({ card, quantity }) => [
    String(quantity),
    csvEscape(card.name),
    csvEscape(card.setName),
    card.collectorNumber,
    "Near Mint",
    "Normal",
    "English",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, `magic-vault-tcgplayer-${dateSuffix()}-${collection}.csv`);
}

export function exportToCsv(
  cards: ScannedCard[],
  collection: string,
  fieldDefinitions: FieldMeta[],
) {
  if (cards.length === 0) return;
  const grouped = groupByCardIdAndFoil(cards);
  const headers = ["Quantity", "Foil", ...fieldDefinitions.map((f) => f.label)];
  const rows = Array.from(grouped.values()).map(
    ({ card, quantity, isFoil }) => [
      String(quantity),
      isFoil ? "True" : "False",
      ...fieldDefinitions.map((f) => {
        const value = getCardValue(card, f.field, fieldDefinitions);
        if (Array.isArray(value)) return csvEscape(value.join("; "));
        return csvEscape(value === null ? "" : String(value));
      }),
    ],
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, `magic-vault-export-${dateSuffix()}-${collection}.csv`);
}

export function exportToCardKingdom(cards: ScannedCard[], collection: string) {
  if (cards.length === 0) return;
  const grouped = groupByCardIdAndFoil(cards);
  const headers = ["Title", "Edition", "Foil", "Quantity"];
  const rows = Array.from(grouped.values()).map(
    ({ card, quantity, isFoil }) => [
      csvEscape(card.name),
      csvEscape(card.setName),
      isFoil ? "True" : "False",
      String(quantity),
    ],
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, `magic-vault-cardkingdom-${dateSuffix()}-${collection}.csv`);
}
