import { useCollections } from "@/features/collections/api/use-collections";
import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";

interface CapturedImageThumbProps {
  src: string;
  alt: string;
}

export function CapturedImageThumb({ src, alt }: CapturedImageThumbProps) {
  const { activeCollection } = useCollections();
  const regions = activeCollection?.game
    ? (OCR_REGIONS_BY_GAME_KEY[activeCollection.game.key] ?? [])
    : [];

  return (
    <div className="relative h-full w-full">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {regions.map((region, i) => (
        <div
          key={i}
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
