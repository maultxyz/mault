let selectedLocationGuids: string[] = [];

export function setStorageSelection(locationGuids: string[]): void {
  selectedLocationGuids = locationGuids;
}

export function readStorageSelection(): string[] {
  return selectedLocationGuids;
}
