import type { FoilNudgeDirection } from "../interfaces/foil-nudge.interface";

export const FOIL_NUDGE_MODULE_NUMBER = 1;
export const FOIL_NUDGE_PUSHER_PULSE_OFFSET = 18;
export const FOIL_NUDGE_MAX_TRAVEL_FRACTION = 0.4;
export const FOIL_NUDGE_SETTLE_MS = 250;
export const FOIL_NUDGE_SERVO_TIMEOUT_MS = 3000;
export const FOIL_NUDGE_INSET_RATIO = 0.08;
export const FOIL_NUDGE_GRID_COLUMNS = 10;
export const FOIL_NUDGE_GRID_ROWS = 14;
export const FOIL_NUDGE_SAMPLES_PER_CELL_SIDE = 8;
export const FOIL_NUDGE_CHANGED_CELL_MIN_CHANGE = 0.08;
export const FOIL_NUDGE_CHANGE_THRESHOLD = 0.145;
export const FOIL_NUDGE_DIRECTIONS: FoilNudgeDirection[] = ["left", "right"];
