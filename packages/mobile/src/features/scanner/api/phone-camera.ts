import {
  PHONE_CAMERA_CAPTURE_FORM_FIELD,
  phoneCameraCapturePath,
  type PhoneCameraMessage,
  type Result,
} from "@magic-vault/shared";
import { apiPost, apiPostForm } from "@/lib/api/client";
import { PHONE_CAMERA_LINK_PATTERN } from "@/lib/constants/phone-camera";

export function postPhoneCameraSignal(guid: string, message: PhoneCameraMessage): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/phone-camera-signal`, message);
}

export function uploadPhoneCameraCapture(guid: string, requestId: string, imageUri: string): Promise<Result<null>> {
  const form = new FormData();
  form.append(PHONE_CAMERA_CAPTURE_FORM_FIELD, { uri: imageUri, name: "capture.jpg", type: "image/jpeg" } as unknown as Blob);
  return apiPostForm<Result<null>>(`/api${phoneCameraCapturePath(guid, requestId)}`, form);
}

export function parsePairingLink(text: string): string | null {
  const match = PHONE_CAMERA_LINK_PATTERN.exec(text.trim());
  return match ? decodeURIComponent(match[1]) : null;
}
