import { z } from "zod";

export const foilCalibrationLabelSchema = z.object({
  card: z.string().trim().min(1).max(200),
  finish: z.enum(["foil", "nonfoil"]),
  sleeved: z.boolean(),
  notes: z.string().trim().max(1000),
  brightness: z.number().int().min(1).max(255),
  captureMode: z.enum(["color", "brightness", "direction", "staged"]),
});
