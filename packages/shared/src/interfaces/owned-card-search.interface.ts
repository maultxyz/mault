export interface OwnedCardSearchResult {
  scanId: string;
  collectionGuid: string;
  collectionName: string;
  cardName: string;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  imageUrl: string | null;
  isFoil: boolean;
  locationGuid: string | null;
  locationName: string | null;
  locationPosition: number | null;
}
