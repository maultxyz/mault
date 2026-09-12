import { z } from "zod";

const servoCalibrationSchema = z.object({
  bottomClosed: z.number(),
  bottomOpen: z.number(),
  paddleClosed: z.number(),
  paddleOpen: z.number(),
  pusherLeft: z.number(),
  pusherNeutral: z.number(),
  pusherRight: z.number(),
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
