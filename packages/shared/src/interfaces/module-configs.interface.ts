export interface ServoCalibration {
  bottomClosed: number;
  bottomOpen: number;
  paddleClosed: number;
  paddleOpen: number;
  pusherLeft: number;
  pusherNeutral: number;
  pusherRight: number;
  paddleCloseDelay: number;
}

export interface ModuleConfig {
  moduleNumber: number;
  calibration: ServoCalibration;
}

export type ChannelLayout = "legacy" | "standard";
export const DEFAULT_CHANNEL_LAYOUT: ChannelLayout = "standard";

export const CHANNEL_OFFSET: Record<ChannelLayout, number> = {
  legacy: 4,
  standard: 0,
};

// Largest module count whose servo channels (3 each) plus one feeder channel
// right after them still fit in channels [offset, 15].
export function maxModulesForLayout(layout: ChannelLayout): number {
  return Math.floor((15 - CHANNEL_OFFSET[layout]) / 3);
}

export const DEFAULT_MODULE_COUNT = 3;

export const DEFAULT_CALIBRATION: ServoCalibration = {
  bottomClosed: 400,
  bottomOpen: 150,
  paddleClosed: 420,
  paddleOpen: 150,
  pusherLeft: 150,
  pusherNeutral: 230,
  pusherRight: 300,
  paddleCloseDelay: 150,
};

export interface FeederCalibration {
  speed: number;
  duration: number;
  pulseDuration: number;
  pauseDuration: number;
  settleDuration: number;
}

export const DEFAULT_FEEDER_CALIBRATION: FeederCalibration = {
  speed: 277,
  duration: 3000,
  pulseDuration: 0,
  pauseDuration: 0,
  settleDuration: 500,
};
