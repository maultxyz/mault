import { z } from "zod";
import { ARCHIDEKT_DECK_API_URL, DECK_LINK_FOIL_FINISHES } from "../constants/deck-links";
import type { DeckLinkReader } from "../interfaces/deck-links";

const archidektDeckSchema = z.object({
  name: z.string().catch(""),
  categories: z
    .array(z.object({ name: z.string(), includedInDeck: z.boolean().catch(true) }))
    .catch([]),
  cards: z.array(
    z.object({
      quantity: z.number().int().min(0),
      modifier: z.string().nullish(),
      categories: z.array(z.string()).nullish(),
      card: z.object({
        uid: z.string().nullish(),
        collectorNumber: z.string().nullish(),
        edition: z.object({ editioncode: z.string().nullish() }).nullish(),
        oracleCard: z.object({ name: z.string() }),
      }),
    }),
  ),
});

export const archidektDeckReader: DeckLinkReader = {
  apiUrl: (deckId) => `${ARCHIDEKT_DECK_API_URL}${encodeURIComponent(deckId)}/`,
  readLines: (body) => {
    const parsed = archidektDeckSchema.safeParse(body);
    if (!parsed.success) return null;
    const excludedCategories = new Set(
      parsed.data.categories
        .filter((category) => !category.includedInDeck)
        .map((category) => category.name),
    );
    const lines = parsed.data.cards
      .filter((entry) => {
        const primaryCategory = entry.categories?.[0];
        return !primaryCategory || !excludedCategories.has(primaryCategory);
      })
      .map((entry) => ({
        name: entry.card.oracleCard.name,
        quantity: entry.quantity,
        setCode: entry.card.edition?.editioncode ?? null,
        collectorNumber: entry.card.collectorNumber ?? null,
        scryfallId: entry.card.uid ?? null,
        isFoil: entry.modifier
          ? DECK_LINK_FOIL_FINISHES.includes(entry.modifier.toLowerCase())
          : null,
      }));
    return { deckName: parsed.data.name, lines };
  },
};
