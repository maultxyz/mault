import {
  MEMBER_SEAT_LIMIT_ERROR_CODE,
  MEMBER_SEAT_LIMIT_HTTP_STATUS,
} from "./constants/plans.constant";
import {
  PENDING_SCAN_SAVE_RETRY_DELAYS_MS,
  PENDING_SCAN_SAVE_RETRYABLE_STATUSES,
} from "./constants/scan-save.constant";
import type { MemberSeatLimitErrorBody } from "./interfaces/plans.interface";

export class MemberSeatLimitError extends Error {
  constructor(readonly limit: number) {
    super(`This organization's member seat limit of ${limit} is reached.`);
    this.name = "MemberSeatLimitError";
  }
}

export async function throwIfMemberSeatLimit(res: Response): Promise<void> {
  if (res.status !== MEMBER_SEAT_LIMIT_HTTP_STATUS) return;
  const body = (await res
    .clone()
    .json()
    .catch(() => null)) as Partial<MemberSeatLimitErrorBody> | null;
  if (body?.code === MEMBER_SEAT_LIMIT_ERROR_CODE) {
    throw new MemberSeatLimitError(body.limit ?? 0);
  }
}

export function isRetryableScanSaveStatus(status: number): boolean {
  return (
    status >= 500 || PENDING_SCAN_SAVE_RETRYABLE_STATUSES.includes(status)
  );
}

export function pendingScanSaveRetryDelayMs(attempt: number): number {
  return PENDING_SCAN_SAVE_RETRY_DELAYS_MS[
    Math.min(attempt, PENDING_SCAN_SAVE_RETRY_DELAYS_MS.length - 1)
  ];
}
