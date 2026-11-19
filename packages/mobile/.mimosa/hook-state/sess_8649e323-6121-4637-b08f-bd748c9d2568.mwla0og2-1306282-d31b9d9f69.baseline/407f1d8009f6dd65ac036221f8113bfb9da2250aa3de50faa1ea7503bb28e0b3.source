import Svg, { Path } from "react-native-svg";
import { BRAND_ICON_STROKE_PATHS, BRAND_ICON_VIEW_BOX } from "@magic-vault/shared";
import { LOADING_LOGO_VIEW_BOX_HEIGHT, LOADING_LOGO_VIEW_BOX_WIDTH } from "@/lib/constants/loading";
import type { BrandIconProps } from "@/lib/interfaces/ui";

export function BrandIcon({ size, color }: BrandIconProps) {
  return (
    <Svg
      accessible={false}
      width={size}
      height={(size * LOADING_LOGO_VIEW_BOX_HEIGHT) / LOADING_LOGO_VIEW_BOX_WIDTH}
      viewBox={BRAND_ICON_VIEW_BOX}
    >
      {BRAND_ICON_STROKE_PATHS.map((path) => (
        <Path key={path} d={path} fill={color} />
      ))}
    </Svg>
  );
}
