import { THEME_COLORS, type ThemeColor } from "@/lib/constants/colors";

export type { ThemeColor };

export function applyPrimaryColor(color: ThemeColor) {
  document.documentElement.style.setProperty("--primary", color.value);
  document.documentElement.style.setProperty("--primary-foreground", color.fg);
}

export function resetPrimaryColor() {
  document.documentElement.style.removeProperty("--primary");
  document.documentElement.style.removeProperty("--primary-foreground");
}

export function applyPrimaryColorName(name: string | null) {
  const color = name ? THEME_COLORS.find((c) => c.name === name) : null;
  if (color) {
    applyPrimaryColor(color);
  } else {
    resetPrimaryColor();
  }
}
