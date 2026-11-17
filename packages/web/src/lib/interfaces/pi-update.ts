import type { PiUpdateStatus } from "@magic-vault/shared";

export interface PiUpdateResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PiUpdateControls {
  status: PiUpdateStatus | null;
  error: string | null;
  busy: boolean;
  start: () => Promise<void>;
}
