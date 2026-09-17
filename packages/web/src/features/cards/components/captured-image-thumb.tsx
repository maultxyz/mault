import { useCollections } from "@/features/collections/api/use-collections";
import {
  CARD_CROP_REGIONS_BY_GAME_KEY,
  OCR_REGIONS_BY_GAME_KEY,
  type OcrRegion,
} from "@magic-vault/shared";

interface CapturedImageThumbProps {
  src: string;
  alt: string;
  showVectorRegions?: boolean;
  showOcrRegions?: boolean;
}

export function CapturedImageThumb({
  src,
  alt,
  showVectorRegions = false,
  showOcrRegions = false,
}: CapturedImageThumbProps) {
  const { activeCollection } = useCollections();
  const gameKey = activeCollection?.game?.key;
  const ocrRegions =
    showOcrRegions && gameKey ? (OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []) : [];
  const cropRegions =
    showVectorRegions && gameKey
      ? (CARD_CROP_REGIONS_BY_GAME_KEY[gameKey] ?? {})
      : {};
  const vectorRegions = Object.entries(cropRegions).filter(
    (entry): entry is [string, OcrRegion] => entry[1] != null,
  );

  return (
    <div className="relative h-full w-full">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {ocrRegions.map((region, i) => (
        <div
          key={`ocr-${i}`}
          className="pointer-events-none absolute border-2 border-amber-400/90 bg-amber-400/15"
          style={{
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.width * 100}%`,
            height: `${region.height * 100}%`,
          }}
        />
      ))}
      {vectorRegions.map(([name, region]) => (
        <div
          key={`vector-${name}`}
          className="pointer-events-none absolute border-2 border-sky-400/90 bg-sky-400/15"
          style={{
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.width * 100}%`,
            height: `${region.height * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
