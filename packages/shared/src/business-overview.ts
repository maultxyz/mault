import type {
  BusinessOverview,
  BusinessOverviewAttentionItem,
} from "./interfaces/business.interface";

export function businessOverviewAttentionItems(
  overview: BusinessOverview,
): BusinessOverviewAttentionItem[] {
  const items: BusinessOverviewAttentionItem[] = [
    { key: "readyForPickup", count: overview.reservations?.readyForPickup ?? 0, section: "reservations" },
    { key: "readyToComplete", count: overview.picks.readyToCompleteCount, section: "picks" },
    { key: "toPull", count: overview.reservations?.toPull ?? 0, section: "reservations" },
    { key: "openIntake", count: overview.intake.openLotCount, section: "intake" },
  ];
  return items.filter((item) => item.count > 0);
}
