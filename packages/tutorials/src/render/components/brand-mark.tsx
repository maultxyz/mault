import { BRAND_ICON_STROKE_PATHS, BRAND_ICON_VIEW_BOX } from "@magic-vault/shared";
import { TUTORIAL_COLORS } from "../../lib/constants/tutorial-style";

export function BrandMark({ width }: { width: number }) {
  return (
    <svg viewBox={BRAND_ICON_VIEW_BOX} width={width} fill="none" aria-hidden>
      {BRAND_ICON_STROKE_PATHS.map((path) => (
        <path key={path} fill={TUTORIAL_COLORS.primary} d={path} />
      ))}
    </svg>
  );
}
