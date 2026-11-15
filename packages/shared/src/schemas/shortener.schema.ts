import { z } from "zod";
import {
  SHORTENER_MAX_LINKS_PER_REQUEST,
  SHORTENER_TARGET_PATH_MAX_LENGTH,
  SHORTENER_TARGET_PATH_PATTERN,
  SHORT_LINK_CODE_PATTERN,
} from "../constants/monitor-links.constant";

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
