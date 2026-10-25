import { EMPTY_BIN_NEW_LOCATION } from "@/lib/constants/storage";
import {
  formValidationMessage,
  STORAGE_LOCATION_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { z } from "zod";

const locationNameSchema = z
  .string()
  .trim()
  .max(
    STORAGE_LOCATION_NAME_MAX_LENGTH,
    formValidationMessage("nameTooLong", {
      max: STORAGE_LOCATION_NAME_MAX_LENGTH,
    }),
  );

const binLocationChoiceSchema = z.object({
  locationGuid: z
    .string()
    .min(1, formValidationMessage("storageLocationRequired")),
  newName: locationNameSchema,
});

export const emptyBinLocationSchema = binLocationChoiceSchema.superRefine(
  (values, ctx) => {
    if (values.locationGuid === EMPTY_BIN_NEW_LOCATION && !values.newName) {
      ctx.addIssue({
        code: "custom",
        message: formValidationMessage("nameRequired"),
        path: ["newName"],
      });
    }
  },
);

export type EmptyBinLocationFormValues = z.infer<typeof emptyBinLocationSchema>;

export const emptyAllBinsSchema = z
  .object({
    perBin: z.boolean(),
    all: binLocationChoiceSchema,
    bins: z.array(
      binLocationChoiceSchema.extend({ binNumber: z.number().int() }),
    ),
  })
  .superRefine((values, ctx) => {
    const requireName = (
      choice: { locationGuid: string; newName: string },
      path: (string | number)[],
    ) => {
      if (choice.locationGuid === EMPTY_BIN_NEW_LOCATION && !choice.newName) {
        ctx.addIssue({
          code: "custom",
          message: formValidationMessage("nameRequired"),
          path: [...path, "newName"],
        });
      }
    };
    if (values.perBin) {
      values.bins.forEach((bin, index) => requireName(bin, ["bins", index]));
    } else {
      requireName(values.all, ["all"]);
    }
  });

export type EmptyAllBinsFormValues = z.infer<typeof emptyAllBinsSchema>;
