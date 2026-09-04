export type SerialCommand =
  | "connect"
  | "test"
  | "feeder"
  | "auto-feed"
  | "bin"
  | "jam";

export interface SerialEventReport {
  command: SerialCommand;
  sent: boolean;
  response: unknown;
  cardName?: string;
  binNumber?: number;
  collectionGuid?: string;
}
