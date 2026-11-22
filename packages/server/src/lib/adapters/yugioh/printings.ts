import {
  YUGIOH_PRINTING_ID_SEPARATOR,
  YUGIOH_RARITY_KEY_ALIASES,
} from "../../constants/yugioh";
import type {
  YgoCard,
  YgoCardImage,
  YgoCardSet,
} from "../../interfaces/yugioh";

export function mainYugiohArtworkOf(raw: YgoCard): YgoCardImage | undefined {
  return (
    raw.card_images?.find((image) => image.id === raw.id) ?? raw.card_images?.[0]
  );
}

export function yugiohRaritySlug(rarity: string | null | undefined): string {
  return (rarity ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function yugiohRarityKey(rarity: string | null | undefined): string {
  const slug = yugiohRaritySlug(rarity);
  return YUGIOH_RARITY_KEY_ALIASES[slug] ?? slug;
}

export function yugiohPrintingKey(
  setCode: string,
  rarity: string | null | undefined,
): string {
  return `${setCode.trim().toUpperCase()}|${yugiohRarityKey(rarity)}`;
}

export function yugiohPrintingId(raw: YgoCard, printing: YgoCardSet): string {
  return [raw.id, printing.set_code, yugiohRaritySlug(printing.set_rarity)].join(
    YUGIOH_PRINTING_ID_SEPARATOR,
  );
}

export function yugiohPrintingsOf(raw: YgoCard): YgoCardSet[] {
  const seen = new Set<string>();
  return (raw.card_sets ?? []).filter((printing) => {
    const id = yugiohPrintingId(raw, printing);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function yugiohPrintingOf(raw: YgoCard, id: string): YgoCardSet | undefined {
  return yugiohPrintingsOf(raw).find(
    (printing) => yugiohPrintingId(raw, printing) === id,
  );
}

export function yugiohPasscodeOf(id: string): string {
  return id.split(YUGIOH_PRINTING_ID_SEPARATOR)[0];
}

export function hasSeveralYugiohArtworks(raw: YgoCard): boolean {
  return (raw.card_images?.length ?? 0) > 1;
}
