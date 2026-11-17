import { formValidationMessage } from "@magic-vault/shared";
import { z } from "zod";

function millimetersUpTo(maxMm: number) {
  return z
    .number({ message: formValidationMessage("valueRequired") })
    .min(0, formValidationMessage("atLeast", { min: 0 }))
    .max(maxMm, formValidationMessage("atMost", { max: maxMm }));
}

export function flatbedPlacementFormSchema(
  glassWidthMm: number,
  glassHeightMm: number,
) {
  return z.object({
    leftMm: millimetersUpTo(glassWidthMm),
    topMm: millimetersUpTo(glassHeightMm),
    widthMm: millimetersUpTo(glassWidthMm),
    heightMm: millimetersUpTo(glassHeightMm),
  });
}
