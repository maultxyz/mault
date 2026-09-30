import { SOUND_CLIP_NAME_MAX_LENGTH } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { z } from "zod";

export function createSoundClipNameSchema(t: TFunction<"sounds">) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("library.nameRequired"))
      .max(SOUND_CLIP_NAME_MAX_LENGTH, t("library.nameTooLong")),
  });
}

export type SoundClipNameFormValues = z.infer<
  ReturnType<typeof createSoundClipNameSchema>
>;
