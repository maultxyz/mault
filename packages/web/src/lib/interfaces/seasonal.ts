import type {
  SEASONAL_CORNER_CLASS,
  SEASONAL_DECOR_PREFERENCES,
} from "@/lib/constants/seasonal";

export type SeasonalTheme = "halloween" | "thanksgiving" | "christmas";

export type SeasonalDecorPreference = (typeof SEASONAL_DECOR_PREFERENCES)[number];

export type SeasonalCorner = keyof typeof SEASONAL_CORNER_CLASS;

export interface SeasonalCornerDecorProps {
  corner: SeasonalCorner;
  className?: string;
  withHangingAccent?: boolean;
}

export interface SeasonalCornerArtProps {
  withHangingAccent?: boolean;
}

export interface SeasonalAccentProps {
  className?: string;
}

export interface SvgPoint {
  x: number;
  y: number;
}

export interface GarlandNeedlePaths {
  dark: string;
  light: string;
}
