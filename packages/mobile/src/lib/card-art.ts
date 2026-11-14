import type { CardArtImageUrls, CardArtSources } from "@/lib/interfaces/cards";
import { absoluteUrl } from "@/lib/url";

export function cardArtSources(image: CardArtImageUrls | null | undefined): CardArtSources {
  const imageUrl = absoluteUrl(image?.normal ?? image?.small);
  const placeholderUrl = image?.normal && image.small && image.small !== image.normal ? absoluteUrl(image.small) : null;
  return { imageUrl, placeholderUrl };
}
