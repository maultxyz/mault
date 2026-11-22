import type { MyCardReservation } from "@magic-vault/shared";

export interface MyCardReservationGroup {
  requestGuid: string;
  reservations: MyCardReservation[];
}

export type MyCardReservationCancelTarget =
  | { kind: "reservation"; reservationGuid: string }
  | { kind: "request"; requestGuid: string };

export interface MyCardReservationSectionProps {
  title: string;
  groups: MyCardReservationGroup[];
  newGuids: ReadonlySet<string>;
  onPressGroup: (group: MyCardReservationGroup) => void;
}

export interface MyCardReservationAlertsProps {
  alerts: MyCardReservation[];
  onOpenReservations: () => void;
}
