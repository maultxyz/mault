import {
  DEFAULT_CALIBRATION,
  DEFAULT_FEEDER_CALIBRATION,
} from "@magic-vault/shared";
import { z } from "zod";

const servoCalibrationSchema = z.object({
  bottomClosed: z.number(),
  bottomOpen: z.number(),
  paddleClosed: z.number(),
  paddleOpen: z.number(),
  pusherLeft: z.number(),
  pusherNeutral: z.number(),
  pusherRight: z.number(),
  pusherHoldDuration: z.number().default(150),
  paddleCloseDelay: z.number().default(150),
  paddleOpenDelay: z.number().default(DEFAULT_CALIBRATION.paddleOpenDelay),
});

const moduleConfigSchema = z.object({
  moduleNumber: z.number().int().positive(),
  calibration: servoCalibrationSchema,
});

const feederCalibrationSchema = z.object({
  speed: z.number(),
  duration: z.number(),
  pulseDuration: z.number(),
  pauseDuration: z.number(),
  settleDuration: z.number(),
  reverseSpeed: z.number().default(DEFAULT_FEEDER_CALIBRATION.reverseSpeed),
  reverseDuration: z
    .number()
    .default(DEFAULT_FEEDER_CALIBRATION.reverseDuration),
});

const binRouteSchema = z.object({
  binNumber: z.number().int().positive(),
  module: z.number().int().positive(),
  direction: z.enum(["left", "right", "bottom"]),
});

export const calibrationExportSchema = z.object({
  formatVersion: z.literal(1),
  moduleCount: z.number().int().positive(),
  channelLayout: z.enum(["standard", "legacy"]),
  modules: z.array(moduleConfigSchema),
  feeder: feederCalibrationSchema,
  binRoutes: z.array(binRouteSchema),
});

export type CalibrationExport = z.infer<typeof calibrationExportSchema>;
