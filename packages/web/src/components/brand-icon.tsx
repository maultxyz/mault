import {
  BRAND_ICON_STROKE_PATHS,
  BRAND_ICON_VIEW_BOX,
} from "@/lib/constants/brand";
import type { ComponentProps } from "react";

export function BrandIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={BRAND_ICON_VIEW_BOX}
      fill="none"
      aria-hidden
      {...props}
    >
      {BRAND_ICON_STROKE_PATHS.map((path) => (
        <path key={path} fill="currentColor" d={path} />
      ))}
    </svg>
  );
}
