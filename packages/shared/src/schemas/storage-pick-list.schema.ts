import { z } from "zod";
import {
  PICK_LIST_MAX_ENTRIES,
  PICK_LIST_MAX_QUANTITY,
  PICK_LIST_NAME_MAX_LENGTH,
} from "../constants/pick-list.constant";

export const storagePickListRequestSchema = z.object({
  entries: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(PICK_LIST_NAME_MAX_LENGTH),
        quantity: z.number().int().min(1).max(PICK_LIST_MAX_QUANTITY),
      }),
    )
    .max(PICK_LIST_MAX_ENTRIES),
});
