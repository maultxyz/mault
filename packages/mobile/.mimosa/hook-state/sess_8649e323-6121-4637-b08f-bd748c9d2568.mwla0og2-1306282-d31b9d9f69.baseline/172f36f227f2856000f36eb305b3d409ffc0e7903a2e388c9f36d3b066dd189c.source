import type { PhoneCameraMessage, Result } from "@magic-vault/shared";
import { apiPost } from "@/lib/api/client";
import { PHONE_CAMERA_LINK_PATTERN } from "@/lib/constants/phone-camera";

export function postPhoneCameraSignal(guid: string, message: PhoneCameraMessage): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/phone-camera-signal`, message);
}

export function parsePairingLink(text: string): string | null {
  const match = PHONE_CAMERA_LINK_PATTERN.exec(text.trim());
  return match ? decodeURIComponent(match[1]) : null;
}
