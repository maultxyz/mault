import type { SERVER_SCAN_ACTOR } from "../constants/scan-actor";

export interface ServerScanActor {
  userId: string;
  orgId: string;
}

export interface ServerScanBindings {
  [SERVER_SCAN_ACTOR]?: ServerScanActor;
}
