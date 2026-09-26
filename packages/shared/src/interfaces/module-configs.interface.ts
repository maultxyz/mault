export interface ServoCalibration {
  bottomClosed: number;
  bottomOpen: number;
  paddleClosed: number;
  paddleOpen: number;
  pusherLeft: number;
  pusherNeutral: number;
  pusherRight: number;
  pusherHoldDuration: number;
  paddleCloseDelay: number;
}

export interface ModuleConfig {
  moduleNumber: number;
  calibration: ServoCalibration;
}

export type ChannelLayout = "legacy" | "standard";

export interface FeederCalibration {
  speed: number;
  duration: number;
  pulseDuration: number;
  pauseDuration: number;
  settleDuration: number;
}
