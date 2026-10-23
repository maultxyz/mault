import { PI_CAMERA_FRAME_URL } from "../constants/pi-scan";

export async function grabCameraFrame(): Promise<Buffer> {
  const response = await fetch(PI_CAMERA_FRAME_URL);
  if (!response.ok) {
    throw new Error("The Pi camera is not running.");
  }
  const frame = Buffer.from(await response.arrayBuffer());
  if (frame.length < 4 || frame[0] !== 0xff || frame[1] !== 0xd8) {
    throw new Error("The Pi camera returned a frame that is not a JPEG.");
  }
  return frame;
}
