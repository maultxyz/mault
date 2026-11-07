import { MATCH_VALIDATION_GUIDE_SEEN_STORAGE_KEY } from "@/lib/constants/storage-keys";

export function hasSeenMatchValidationGuide(): boolean {
  try {
    return localStorage.getItem(MATCH_VALIDATION_GUIDE_SEEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markMatchValidationGuideSeen(): void {
  try {
    localStorage.setItem(MATCH_VALIDATION_GUIDE_SEEN_STORAGE_KEY, "true");
  } catch {}
}
