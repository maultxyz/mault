import type {
  FulfilmentOrder,
  FulfilmentOrderDetail,
  IntakeLot,
  IntakeLotCard,
  OrderLine,
  PickWalkEntry,
  PickWalkStop,
} from "@magic-vault/shared";
import type { BUSINESS_VIEWS } from "@/lib/constants/business";

export type BusinessView = (typeof BUSINESS_VIEWS)[number];

export interface BusinessHubProps {
  onBack?: () => void;
}

export interface PickWalk {
  openOrders: FulfilmentOrderDetail[];
  closedOrderCount: number;
  entries: PickWalkEntry[];
  stops: PickWalkStop[];
  pickedScanIds: ReadonlySet<string>;
  pickedCount: number;
  nextEntry: PickWalkEntry | null;
  completedOrders: FulfilmentOrderDetail[];
  shortOrders: FulfilmentOrderDetail[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
  setPicked: (scanIds: string[], isPicked: boolean) => void;
}

export interface BusinessListViewProps {
  canAct: boolean;
}

export interface IntakeLotRowProps {
  lot: IntakeLot;
  onPress: () => void;
  onPressIn: () => void;
}

export interface IntakeLotCardRowProps {
  card: IntakeLotCard;
  onPress: () => void;
}

export interface OrderRowProps {
  order: FulfilmentOrder;
  onPress: () => void;
  onPressIn: () => void;
}

export interface OrderLineRowProps {
  line: OrderLine;
  pickedCount: number;
  isOpen: boolean;
  canAct: boolean;
  onFindSubstitute: () => void;
}

export interface PickWalkEntryRowProps {
  entry: PickWalkEntry;
  isPicked: boolean;
  showOrderName: boolean;
  canPick: boolean;
  onToggle: () => void;
  onMissing: () => void;
}

export interface PickWalkNextCardProps {
  entry: PickWalkEntry;
  showOrderName: boolean;
  canPick: boolean;
  onPicked: () => void;
  onMissing: () => void;
}
