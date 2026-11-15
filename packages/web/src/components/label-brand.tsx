import { BrandIcon } from "@/components/brand-icon";
import {
  LABEL_BRAND_GAP_RATIO,
  LABEL_BRAND_MARK_HEIGHT_RATIO,
} from "@/lib/constants/label-sheets";
import { SITE_NAME } from "@/lib/constants/seo";
import type { LabelBrandProps } from "@/lib/interfaces/label-sheets";
import { cn } from "@/lib/utils";
import {
  BRAND_ICON_TIGHT_ASPECT_RATIO,
  BRAND_ICON_TIGHT_VIEW_BOX,
} from "@magic-vault/shared";

export function LabelBrand({ fontSize, className }: LabelBrandProps) {
  const markHeight = fontSize * LABEL_BRAND_MARK_HEIGHT_RATIO;
  return (
    <div
      className={cn("flex items-center font-heading font-semibold whitespace-nowrap", className)}
      style={{ fontSize: `${fontSize}px`, gap: `${fontSize * LABEL_BRAND_GAP_RATIO}px`, lineHeight: 1 }}
    >
      <BrandIcon
        viewBox={BRAND_ICON_TIGHT_VIEW_BOX}
        width={markHeight * BRAND_ICON_TIGHT_ASPECT_RATIO}
        height={markHeight}
        className="shrink-0"
      />
      <span>{SITE_NAME}</span>
    </div>
  );
}
