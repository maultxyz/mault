export interface PinnedModel {
  repo: string;
  revision: string;
  filename: string;
  sha256: string;
}

export type RgbaChannelOrder = "rgba" | "bgra";

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
  channelOrder?: RgbaChannelOrder;
}

export interface CornerModelOutputs {
  corners: ArrayLike<number>;
  sharpness?: ArrayLike<number>;
  presence?: ArrayLike<number>;
}
