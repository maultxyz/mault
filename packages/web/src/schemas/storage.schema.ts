import { EMPTY_BIN_NEW_LOCATION } from "@/lib/constants/storage";
import { STORAGE_LOCATION_NAME_MAX_LENGTH } from "@magic-vault/shared";
import { z } from "zod";

const locationNameSchema = z
  .string()
  .trim()
  .max(
    STORAGE_LOCATION_NAME_MAX_LENGTH,
    `Name must be ${STORAGE_LOCATION_NAME_MAX_LENGTH} characters or less`,
  );

export const storageLocationNameSchema = z.object({
  name: locationNameSchema.min(1, "Name is required"),
});

export type StorageLocationNameFormValues = z.infer<
  typeof storageLocationNameSchema
>;

export const emptyBinLocationSchema = z
  .object({
    locationGuid: z.string().min(1, "Choose where the cards went"),
    newName: locationNameSchema,
  })
  .superRefine((values, ctx) => {
    if (values.locationGuid === EMPTY_BIN_NEW_LOCATION && !values.newName) {
      ctx.addIssue({
        code: "custom",
        message: "Name is required",
        path: ["newName"],
      });
    }
  });

export type EmptyBinLocationFormValues = z.infer<typeof emptyBinLocationSchema>;

const binLocationChoiceSchema = z.object({
  locationGuid: z.string().min(1, "Choose where the cards went"),
  newName: locationNameSchema,
});

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
          message: "Name is required",
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
