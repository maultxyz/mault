import { z } from "zod";
import {
  STATS_SYNC_EARLIEST_DAY,
  STATS_SYNC_KEY_MAX_LENGTH,
  STATS_SYNC_KEY_PREFIX,
  STATS_SYNC_MAX_DAYS_PER_REQUEST,
  STATS_SYNC_MAX_SCANS_PER_DAY,
} from "../constants/stats-sync.constant";
import { formValidationMessage } from "../form-validation";

const scanCountSchema = z.number().int().min(0).max(STATS_SYNC_MAX_SCANS_PER_DAY);

export const statsSyncDaySchema = z
  .object({
    day: z.iso.date().refine((day) => day >= STATS_SYNC_EARLIEST_DAY),
    scanCount: scanCountSchema,
    matchedCount: scanCountSchema,
    unmatchedCount: scanCountSchema,
    correctedCount: scanCountSchema,
  })
  .refine(
    (day) =>
      day.matchedCount + day.unmatchedCount === day.scanCount &&
      day.correctedCount <= day.scanCount,
  );

export const statsSyncPushSchema = z.object({
  days: z
    .array(statsSyncDaySchema)
    .max(STATS_SYNC_MAX_DAYS_PER_REQUEST)
    .refine((days) => new Set(days.map((day) => day.day)).size === days.length),
});

export const statsSyncConnectFormSchema = z.object({
  syncKey: z
    .string()
    .trim()
    .max(STATS_SYNC_KEY_MAX_LENGTH, formValidationMessage("statsSyncKeyInvalid"))
    .refine(
      (key) => key.startsWith(STATS_SYNC_KEY_PREFIX) && key.length > STATS_SYNC_KEY_PREFIX.length,
      formValidationMessage("statsSyncKeyInvalid"),
    ),
});

export type StatsSyncConnectFormValues = z.infer<typeof statsSyncConnectFormSchema>;
