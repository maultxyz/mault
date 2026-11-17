import type { THEME_PREFERENCES } from "@/lib/constants/ui";
import type { ReactNode } from "react";

import type { FONT_SIZE } from "@/lib/constants/theme";

export interface ThemeColors {
  background: string;
  shell: string;
  shellAccent: string;
  foreground: string;
  foregroundSecondary: string;
  card: string;
  muted: string;
  mutedForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  primaryText: string;
  primaryMuted: string;
  primarySelected: string;
  primaryPressed: string;
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
  destructiveTint: string;
  onBrandSurface: string;
  onCamera: string;
  onStatusStrong: string;
  camera: string;
  cameraScrim: string;
  popoverShadow: string;
}

export type FontSize = keyof typeof FONT_SIZE;

export type StatusTone = "info" | "success" | "warning" | "destructive";

export interface OrgThemeProviderProps {
  children: ReactNode;
}

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
