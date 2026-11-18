import { z } from "zod";
import {
  MACHINE_ATTENTION_KINDS,
  MACHINE_BIN_FILL_MAX_BINS,
  MACHINE_COMMANDS,
  MACHINE_NAME_MAX_LENGTH,
  MACHINE_RUN_STATES,
} from "../constants/machine-status.constant";

const machineBinFillSchema = z.object({
  binNumber: z.number().int().min(0).max(999),
  count: z.number().int().min(0),
  capacity: z.number().int().min(0).nullable(),
  isCatchAll: z.boolean(),
});

export const machineStatusInputSchema = z.object({
  name: z.string().trim().min(1).max(MACHINE_NAME_MAX_LENGTH),
  deviceGuid: z.string().uuid().nullable(),
  collectionGuid: z.string().uuid().nullable(),
  collectionName: z.string().max(200).nullable(),
  runState: z.enum(MACHINE_RUN_STATES),
  attention: z
    .object({
      kind: z.enum(MACHINE_ATTENTION_KINDS),
      module: z.number().int().optional(),
      binNumbers: z.array(z.number().int()).max(MACHINE_BIN_FILL_MAX_BINS).optional(),
      detail: z.string().max(300).optional(),
    })
    .nullable(),
  isEmergencyStopped: z.boolean(),
  canPause: z.boolean(),
  canResume: z.boolean(),
  canEmergencyStop: z.boolean(),
  sessionScanCount: z.number().int().min(0),
  presetName: z.string().max(200).nullable(),
  workflowStep: z
    .object({
      workflowName: z.string().max(200),
      position: z.number().int().min(1),
      stepCount: z.number().int().min(1),
    })
    .nullable(),
  binFill: z.array(machineBinFillSchema).max(MACHINE_BIN_FILL_MAX_BINS).nullable(),
  hasCamera: z.boolean(),
  lastCard: z
    .object({
      name: z.string().max(300).nullable(),
      binNumber: z.number().int().nullable(),
      matched: z.boolean(),
    })
    .nullable(),
});

export const machineCommandBodySchema = z.object({
  command: z.enum(MACHINE_COMMANDS),
});
