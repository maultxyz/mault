import type { PiControllerClient } from "../pi-controller-hub";
import type { SorterPort } from "./pi-serial";

export type PiControllerPortFactory = () => Promise<SorterPort>;

export interface PiControllerCommand {
  client: PiControllerClient;
  payload: Record<string, unknown>;
  originalSeq: number | null;
  readOnly: boolean;
  wireSeq?: number;
}
