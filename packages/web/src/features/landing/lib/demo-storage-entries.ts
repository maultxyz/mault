import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import { DEMO_STORAGE_LOCATIONS } from "@/lib/constants/landing";
import type { DemoStorageEntry } from "@/lib/interfaces/landing";

export const DEMO_STORAGE_ENTRIES: DemoStorageEntry[] =
  DEMO_STORAGE_LOCATIONS.flatMap((location) =>
    location.storedCards.map((storedCard, index) => ({
      locationGuid: location.guid,
      locationName: location.name,
      position: index + 1,
      card: DEMO_SCANNED_CARDS[storedCard.cardIndex].card,
      isFoil: storedCard.isFoil ?? false,
    })),
  );

export function searchDemoStorage(query: string): DemoStorageEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  return DEMO_STORAGE_ENTRIES.filter((entry) =>
    entry.card.name.toLowerCase().includes(normalizedQuery),
  );
}
