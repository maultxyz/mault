import { z } from "zod";
import { DECK_LINK_URL_MAX_LENGTH } from "../constants/deck-link.constant";
import { parseDeckLinkUrl } from "../deck-link";
import { formValidationMessage } from "../form-validation";

export const deckLinkImportRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .max(DECK_LINK_URL_MAX_LENGTH, formValidationMessage("deckLinkInvalid"))
    .refine((url) => !!parseDeckLinkUrl(url), formValidationMessage("deckLinkInvalid")),
});
