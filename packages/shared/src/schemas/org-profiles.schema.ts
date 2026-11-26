import { z } from "zod";
import {
  ORG_PROFILE_BIO_MAX_LENGTH,
  ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH,
  ORG_PROFILE_HANDLE_MAX_LENGTH,
  ORG_PROFILE_HANDLE_MIN_LENGTH,
  ORG_PROFILE_HANDLE_PATTERN,
  ORG_PROFILE_LINK_KINDS,
  ORG_PROFILE_LINK_LABEL_MAX_LENGTH,
  ORG_PROFILE_LINK_URL_MAX_LENGTH,
  ORG_PROFILE_LINKS_MAX,
  ORG_PROFILE_SHOP_CATALOGS_MAX,
  ORG_PROFILE_SHOWCASE_CARDS_MAX,
  RESERVED_ORG_PROFILE_HANDLES,
} from "../constants/org-profiles.constant";
import { formValidationMessage } from "../form-validation";

const reservedOrgProfileHandles: readonly string[] = RESERVED_ORG_PROFILE_HANDLES;

export function withWebUrlScheme(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isHttpWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export const orgProfileHandleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    ORG_PROFILE_HANDLE_PATTERN,
    formValidationMessage("profileHandleInvalid", {
      min: ORG_PROFILE_HANDLE_MIN_LENGTH,
      max: ORG_PROFILE_HANDLE_MAX_LENGTH,
    }),
  )
  .refine(
    (handle) => !reservedOrgProfileHandles.includes(handle),
    formValidationMessage("profileHandleReserved"),
  );

export const orgProfileLinkSchema = z.object({
  kind: z.enum(ORG_PROFILE_LINK_KINDS),
  url: z
    .string()
    .transform(withWebUrlScheme)
    .pipe(
      z
        .string()
        .max(ORG_PROFILE_LINK_URL_MAX_LENGTH, formValidationMessage("shortLinkTargetInvalid"))
        .refine(isHttpWebUrl, formValidationMessage("shortLinkTargetInvalid")),
    ),
  label: z
    .string()
    .trim()
    .max(
      ORG_PROFILE_LINK_LABEL_MAX_LENGTH,
      formValidationMessage("nameTooLong", { max: ORG_PROFILE_LINK_LABEL_MAX_LENGTH }),
    ),
});

export const orgProfileFormSchema = z.object({
  handle: orgProfileHandleSchema,
  displayName: z
    .string()
    .trim()
    .min(1, formValidationMessage("nameRequired"))
    .max(
      ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH,
      formValidationMessage("nameTooLong", { max: ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH }),
    ),
  bio: z
    .string()
    .trim()
    .max(
      ORG_PROFILE_BIO_MAX_LENGTH,
      formValidationMessage("textTooLong", { max: ORG_PROFILE_BIO_MAX_LENGTH }),
    ),
  links: z.array(orgProfileLinkSchema).max(ORG_PROFILE_LINKS_MAX),
  showcaseScanIds: z.array(z.uuid()).max(ORG_PROFILE_SHOWCASE_CARDS_MAX),
  shopCatalogGuids: z.array(z.uuid()).max(ORG_PROFILE_SHOP_CATALOGS_MAX),
  showsPrices: z.boolean(),
  isPublished: z.boolean(),
});
