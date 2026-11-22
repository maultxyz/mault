import type { RefObject } from "react";

export interface InitialLoadState {
  completedRef: RefObject<boolean>;
  areSecondaryRequestsEnabled: boolean;
  enableSecondaryRequests: () => void;
}
