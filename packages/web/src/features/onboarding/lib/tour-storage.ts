export function isTourCompleted(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return true;
  }
}

export function markTourCompleted(key: string): void {
  try {
    localStorage.setItem(key, "true");
  } catch {}
}
