import {
  FEEDER_CARD_FEED_EDGES,
  FEEDER_CARD_SHEET_SIDES,
  FEEDER_CARD_TOPS,
} from "@/lib/constants/scanner";
import { z } from "zod";

export const feederCardSetupSchema = z.object({
  sheetSide: z.enum(FEEDER_CARD_SHEET_SIDES),
  feedEdge: z.enum(FEEDER_CARD_FEED_EDGES),
  cardTop: z.enum(FEEDER_CARD_TOPS),
});

export type FeederCardSetupFormValues = z.infer<typeof feederCardSetupSchema>;
