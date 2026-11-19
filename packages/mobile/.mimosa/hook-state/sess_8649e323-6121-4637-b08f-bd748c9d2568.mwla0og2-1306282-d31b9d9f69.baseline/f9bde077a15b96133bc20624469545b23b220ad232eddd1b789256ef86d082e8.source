import { formValidationMessage, type Announcement, type AnnouncementInput } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { z } from "zod";
import {
  ANNOUNCEMENT_DATE_TIME_PATTERN,
  ANNOUNCEMENT_SEVERITIES,
  ANNOUNCEMENT_VALIDATION_KEY_PREFIX,
  EMPTY_ANNOUNCEMENT_FORM,
} from "@/lib/constants/admin-discord";
import type { AnnouncementFormValues } from "@/lib/interfaces/admin-discord";
import { translateFormErrorMessage } from "@/lib/form-validation";

const padTwoDigits = (value: number) => String(value).padStart(2, "0");

export function parseAnnouncementDateTime(value: string): Date | null {
  const match = ANNOUNCEMENT_DATE_TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  const roundTrips =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute;
  return roundTrips ? date : null;
}

export function formatAnnouncementDateTime(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())} ${padTwoDigits(
    date.getHours(),
  )}:${padTwoDigits(date.getMinutes())}`;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => !value || parseAnnouncementDateTime(value) !== null, {
    message: `${ANNOUNCEMENT_VALIDATION_KEY_PREFIX}invalidDateTime`,
  });

export const announcementFormSchema = z
  .object({
    severity: z.enum(ANNOUNCEMENT_SEVERITIES),
    message: z.string().trim().min(1, formValidationMessage("valueRequired")),
    isActive: z.boolean(),
    showOnLanding: z.boolean(),
    link: z
      .string()
      .trim()
      .refine((value) => !value || isHttpUrl(value), { message: `${ANNOUNCEMENT_VALIDATION_KEY_PREFIX}invalidLink` }),
    startsAt: optionalDateTimeSchema,
    endsAt: optionalDateTimeSchema,
  })
  .refine(
    (values) => {
      const startsAt = values.startsAt ? parseAnnouncementDateTime(values.startsAt) : null;
      const endsAt = values.endsAt ? parseAnnouncementDateTime(values.endsAt) : null;
      return !startsAt || !endsAt || endsAt > startsAt;
    },
    { message: `${ANNOUNCEMENT_VALIDATION_KEY_PREFIX}endAfterStart`, path: ["endsAt"] },
  );

export function toAnnouncementFormValues(announcement: Announcement | undefined): AnnouncementFormValues {
  if (!announcement) return EMPTY_ANNOUNCEMENT_FORM;
  return {
    severity: announcement.severity,
    message: announcement.message,
    isActive: announcement.isActive,
    showOnLanding: announcement.showOnLanding,
    link: announcement.link ?? "",
    startsAt: formatAnnouncementDateTime(announcement.startsAt),
    endsAt: formatAnnouncementDateTime(announcement.endsAt),
  };
}

export function toAnnouncementInput(values: AnnouncementFormValues): AnnouncementInput {
  return {
    severity: values.severity,
    message: values.message.trim(),
    isActive: values.isActive,
    showOnLanding: values.showOnLanding,
    link: values.link.trim() || null,
    startsAt: values.startsAt ? (parseAnnouncementDateTime(values.startsAt)?.toISOString() ?? null) : null,
    endsAt: values.endsAt ? (parseAnnouncementDateTime(values.endsAt)?.toISOString() ?? null) : null,
  };
}

export function translateAnnouncementFormError(t: TFunction, message: string | undefined): string | undefined {
  if (message?.startsWith(ANNOUNCEMENT_VALIDATION_KEY_PREFIX)) return t(message);
  return translateFormErrorMessage(t, message);
}
