import { z } from "zod";
import {
  DECK_LINK_FOIL_FINISHES,
  MOXFIELD_DECK_API_URL,
  MOXFIELD_IMPORTED_BOARDS,
} from "../constants/deck-links";
import type { DeckLinkReader } from "../interfaces/deck-links";

const moxfieldDeckSchema = z.object({
  name: z.string().catch(""),
  boards: z.record(
    z.string(),
    z.object({
      cards: z
        .record(
          z.string(),
          z.object({
            quantity: z.number().int().min(0),
            finish: z.string().nullish(),
            isFoil: z.boolean().nullish(),
            card: z.object({
              name: z.string(),
              scryfall_id: z.string().nullish(),
              set: z.string().nullish(),
              cn: z.string().nullish(),
            }),
          }),
        )
        .catch({}),
    }),
  ),
});

export const moxfieldDeckReader: DeckLinkReader = {
  apiUrl: (deckId) => `${MOXFIELD_DECK_API_URL}${encodeURIComponent(deckId)}`,
  readLines: (body) => {
    const parsed = moxfieldDeckSchema.safeParse(body);
    if (!parsed.success) return null;
    const lines = MOXFIELD_IMPORTED_BOARDS.flatMap((board) =>
      Object.values(parsed.data.boards[board]?.cards ?? {}).map((entry) => ({
        name: entry.card.name,
        quantity: entry.quantity,
        setCode: entry.card.set ?? null,
        collectorNumber: entry.card.cn ?? null,
        scryfallId: entry.card.scryfall_id ?? null,
        isFoil: entry.finish
          ? DECK_LINK_FOIL_FINISHES.includes(entry.finish.toLowerCase())
          : (entry.isFoil ?? null),
      })),
    );
    return { deckName: parsed.data.name, lines };
  },
};
