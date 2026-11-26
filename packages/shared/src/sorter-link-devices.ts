import type { SorterLinkStatus } from "./interfaces/sorter-link.interface";

export function linkedSorterGuidsMissingFromDevices(
  links: readonly SorterLinkStatus[] | undefined,
  devices: readonly { guid: string }[] | undefined,
): string {
  return (links ?? [])
    .filter((link) => link.linked && !devices?.some((device) => device.guid === link.guid))
    .map((link) => link.guid)
    .join(",");
}
