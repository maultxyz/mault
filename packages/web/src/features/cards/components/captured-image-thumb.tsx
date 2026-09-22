import { useCollections } from "@/features/collections/api/use-collections";
import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";

interface CapturedImageThumbProps {
  src: string;
  alt: string;
  showOcrRegions?: boolean;
}

export function CapturedImageThumb({
  src,
  alt,
  showOcrRegions = false,
}: CapturedImageThumbProps) {
  const { activeCollection } = useCollections();
  const gameKey = activeCollection?.game?.key;
  const ocrRegions =
    showOcrRegions && gameKey ? (OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []) : [];

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
    </div>
  );
}
