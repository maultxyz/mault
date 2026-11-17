import { z } from "zod";
import {
  CUSTOM_SHORT_LINK_CODE_MAX_LENGTH,
  CUSTOM_SHORT_LINK_CODE_PATTERN,
  CUSTOM_SHORT_LINK_TARGET_MAX_LENGTH,
  RESERVED_SHORT_LINK_CODES,
  SHORTENER_MAX_LINKS_PER_REQUEST,
  SHORTENER_TARGET_PATH_MAX_LENGTH,
  SHORTENER_TARGET_PATH_PATTERN,
  SHORT_LINK_CODE_PATTERN,
} from "../constants/monitor-links.constant";
import { formValidationMessage } from "../form-validation";

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const customShortLinkTargetSchema = z
  .string()
  .trim()
  .max(CUSTOM_SHORT_LINK_TARGET_MAX_LENGTH, formValidationMessage("shortLinkTargetInvalid"))
  .refine(isWebUrl, formValidationMessage("shortLinkTargetInvalid"));

const reservedShortLinkCodes: readonly string[] = RESERVED_SHORT_LINK_CODES;

export const customShortLinkFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      CUSTOM_SHORT_LINK_CODE_PATTERN,
      formValidationMessage("shortLinkCodeInvalid", { max: CUSTOM_SHORT_LINK_CODE_MAX_LENGTH }),
    )
    .refine(
      (code) => !reservedShortLinkCodes.includes(code),
      formValidationMessage("shortLinkCodeReserved"),
    ),
  targetUrl: customShortLinkTargetSchema,
});

export const customShortLinkUpdateSchema = z.object({
  targetUrl: customShortLinkTargetSchema,
});

const shortLinkCodeSchema = z.string().regex(SHORT_LINK_CODE_PATTERN);

export const shortenerRegisterLinksSchema = z.object({
  links: z
    .array(
      z.object({
        code: shortLinkCodeSchema,
        targetPath: z
          .string()
          .regex(SHORTENER_TARGET_PATH_PATTERN)
          .max(SHORTENER_TARGET_PATH_MAX_LENGTH),
        expiresAt: z.iso.datetime().nullable(),
      }),
    )
    .max(SHORTENER_MAX_LINKS_PER_REQUEST),
});

export const shortenerDeleteLinksSchema = z.object({
  codes: z.array(shortLinkCodeSchema).max(SHORTENER_MAX_LINKS_PER_REQUEST),
});
