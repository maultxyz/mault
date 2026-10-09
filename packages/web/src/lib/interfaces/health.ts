import type { OcrRegion } from "@magic-vault/shared";

export interface OcrRegionTileProps {
  gameKey: string;
  name: string;
  lang: string | null;
  regions: OcrRegion[];
}
