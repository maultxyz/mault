import type { SharedValue } from "react-native-reanimated";

export interface LoadingLogoKeyframe {
  at: number;
  translateY: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}

export interface LoadingLogoLayer {
  delayFraction: number;
  boxHeight: number;
  originX: string;
  originY: string;
  keyframes: LoadingLogoKeyframe[];
}

export interface LoadingLogoProps {
  size?: number;
  color?: string;
  accessibilityLabel?: string;
}

export interface LoadingLogoLayerViewProps {
  layer: LoadingLogoLayer;
  path: string;
  cycleProgress: SharedValue<number>;
  width: number;
  height: number;
  color: string;
}
