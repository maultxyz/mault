import type { FONT_SIZE } from "@/lib/constants/theme";

export interface ThemeColors {
  background: string;
  foreground: string;
  foregroundSecondary: string;
  card: string;
  muted: string;
  mutedForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  primaryText: string;
  destructive: string;
  destructiveStrong: string;
  destructiveMuted: string;
  destructiveBorder: string;
  destructiveForeground: string;
  success: string;
  successStrong: string;
  successMuted: string;
  successBorder: string;
  successForeground: string;
  warning: string;
  warningStrong: string;
  warningMuted: string;
  warningBorder: string;
  warningForeground: string;
  info: string;
  infoStrong: string;
  infoMuted: string;
  infoBorder: string;
  infoForeground: string;
  overlay: string;
  input: string;
  inputBackground: string;
  cardRing: string;
  segmentActive: string;
  destructiveTint: string;
  onBrandSurface: string;
  onCamera: string;
  camera: string;
  cameraScrim: string;
}

export type FontSize = keyof typeof FONT_SIZE;

export type StatusTone = "info" | "success" | "warning" | "destructive";
