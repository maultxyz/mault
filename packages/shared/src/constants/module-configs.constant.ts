import type {
  ChannelLayout,
  FeederCalibration,
  ServoCalibration,
} from "../interfaces/module-configs.interface";

export const DEFAULT_CHANNEL_LAYOUT: ChannelLayout = "standard";

export const CHANNEL_OFFSET: Record<ChannelLayout, number> = {
  legacy: 4,
  standard: 0,
};

export const MAX_SERVO_CHANNEL_INDEX = 15;

export function maxModulesForLayout(layout: ChannelLayout): number {
  return Math.floor((MAX_SERVO_CHANNEL_INDEX - CHANNEL_OFFSET[layout]) / 3);
}

export const DEFAULT_MODULE_COUNT = 3;

export const DEFAULT_CALIBRATION: ServoCalibration = {
  bottomClosed: 305,
  bottomOpen: 268,
  paddleClosed: 305,
  paddleOpen: 268,
  pusherLeft: 268,
  pusherNeutral: 305,
  pusherRight: 342,
  pusherHoldDuration: 150,
  paddleCloseDelay: 0,
  paddleOpenDelay: 300,
};

export const DEFAULT_FEEDER_CALIBRATION: FeederCalibration = {
  speed: 277,
  duration: 3000,
  pulseDuration: 0,
  pauseDuration: 0,
  settleDuration: 500,
  reverseSpeed: 333,
  reverseDuration: 0,
  feedRetryCount: 1,
};

export const FEED_RETRY_COUNT_MIN = 0;
export const FEED_RETRY_COUNT_MAX = 5;
