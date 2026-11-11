import { OCR_FIXED_REGION_PADDING_OF_CARD_WIDTH } from "./constants/ocr-regions.constant";
import { MTG_CARD_ASPECT_RATIO } from "./constants/vision-model.constant";
import type { OcrOverlayRegion, OcrReadRegion, OcrRegion } from "./interfaces/ocr-region.interface";

function padEqually<Region extends OcrRegion>(region: Region): Region {
  const paddingInCardWidths = Math.max(
    0,
    Math.min(
      OCR_FIXED_REGION_PADDING_OF_CARD_WIDTH,
      region.height / MTG_CARD_ASPECT_RATIO,
      region.x,
      1 - region.x - region.width,
      region.y / MTG_CARD_ASPECT_RATIO,
      (1 - region.y - region.height) / MTG_CARD_ASPECT_RATIO,
    ),
  );
  const paddingX = paddingInCardWidths;
  const paddingY = paddingInCardWidths * MTG_CARD_ASPECT_RATIO;
  return {
    ...region,
    x: region.x - paddingX,
    y: region.y - paddingY,
    width: region.width + paddingX * 2,
    height: region.height + paddingY * 2,
  };
}

export function padFixedOcrRegions(regions: OcrRegion[]): OcrOverlayRegion[] {
  return regions.map(padEqually);
}

export function toOcrOverlayRegions(readRegions: OcrReadRegion[], fixedRegions: OcrRegion[]): OcrOverlayRegion[] {
  const unusedFixedRegions = [...fixedRegions];
  return readRegions.map((region) => {
    if (!region.anchored) {
      const fixedIndex = unusedFixedRegions.findIndex(
        (fixed) => fixed.field === region.field && !!fixed.fallback === region.fallback,
      );
      if (fixedIndex !== -1) {
        const [fixed] = unusedFixedRegions.splice(fixedIndex, 1);
        return padEqually({ ...fixed, anchored: false });
      }
    }
    return {
      field: region.field,
      fallback: region.fallback,
      anchored: region.anchored,
      x: region.box.x0,
      y: region.box.y0,
      width: region.box.x1 - region.box.x0,
      height: region.box.y1 - region.box.y0,
    };
  });
}
