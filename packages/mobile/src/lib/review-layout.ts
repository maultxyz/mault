import { REVIEW_LAYOUT_KEY } from "@/lib/constants/storage-keys";
import type { ReviewLayout } from "@/lib/interfaces/cards";
import { readKv, writeKv } from "@/lib/storage/kv";

export function readReviewLayout(): ReviewLayout {
  return readKv(REVIEW_LAYOUT_KEY) === "single" ? "single" : "grid";
}

export function saveReviewLayout(layout: ReviewLayout): void {
  writeKv(REVIEW_LAYOUT_KEY, layout);
}
