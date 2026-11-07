import { PAGE_SIZE_OPTIONS } from "./constants/collection-cards.constant";

export function pageSizeFromQuery(value: string | undefined, fallback: number): number {
  const requested = Number(value);
  return PAGE_SIZE_OPTIONS.includes(requested) ? requested : fallback;
}
