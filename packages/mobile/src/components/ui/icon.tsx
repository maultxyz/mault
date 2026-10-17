import { ICONS, ICON_STROKE_WIDTH } from "@/lib/constants/icons";
import type { IconProps } from "@/lib/interfaces/ui";

export function Icon({ name, size = 20, color }: IconProps) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={ICON_STROKE_WIDTH} />;
}
