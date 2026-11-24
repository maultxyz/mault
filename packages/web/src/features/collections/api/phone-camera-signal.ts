import { apiGetBlob, apiPost, apiPostForm } from "@/lib/api/client";
import {
  PHONE_CAMERA_CAPTURE_FORM_FIELD,
  phoneCameraCapturePath,
  type PhoneCameraMessage,
  type Result,
} from "@magic-vault/shared";

export async function postPhoneCameraSignal(
  guid: string,
  message: PhoneCameraMessage,
): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/phone-camera-signal`, message);
}

export async function uploadPhoneCameraCapture(
  guid: string,
  requestId: string,
  image: Blob,
): Promise<Result<null>> {
  const form = new FormData();
  form.append(PHONE_CAMERA_CAPTURE_FORM_FIELD, image, "capture.jpg");
  return apiPostForm<Result<null>>(`/api${phoneCameraCapturePath(guid, requestId)}`, form);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the capture"));
    reader.readAsDataURL(blob);
  });
}

export async function fetchPhoneCameraCaptureDataUrl(
  guid: string,
  requestId: string,
): Promise<string> {
  return blobToDataUrl(await apiGetBlob(`/api${phoneCameraCapturePath(guid, requestId)}`));
}
