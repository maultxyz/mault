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
