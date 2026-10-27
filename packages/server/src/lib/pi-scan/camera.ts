import sharp from "sharp";
import { PI_CAMERA_FRAME_URL } from "../constants/pi-scan";

export async function grabCameraFrame(): Promise<Buffer> {
  const response = await fetch(`${PI_CAMERA_FRAME_URL}?fresh=1`, { signal: AbortSignal.timeout(5_000), cache: "no-store" });
  if (!response.ok) {
    throw new Error("The Pi camera is not running.");
  }
  const frame = Buffer.from(await response.arrayBuffer());
  if (frame.length < 4 || frame[0] !== 0xff || frame[1] !== 0xd8) {
    throw new Error("The Pi camera returned a frame that is not a JPEG.");
  }
  return frame;
}

// Compare central thumbnails across fresh frames, rather than assuming an IR
// detection plus a fixed delay means the card has stopped moving.
export async function grabSettledCameraFrame(
  grab = grabCameraFrame,
  pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
): Promise<Buffer> {
  let previous: Buffer | null = null;
  let stable = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    const frame = await grab();
    const thumbnail = await sharp(frame).resize(80, 80, { fit: "fill" })
      .extract({ left: 8, top: 8, width: 64, height: 64 }).greyscale().raw().toBuffer();
    if (previous) {
      let difference = 0;
      for (let i = 0; i < thumbnail.length; i++) difference += Math.abs(thumbnail[i] - previous[i]);
      stable = difference / thumbnail.length <= 3 ? stable + 1 : 0;
      if (stable >= 3) return frame;
    }
    previous = thumbnail;
    await pause(100);
  }
  throw new Error("The camera image did not settle. Check card movement and camera exposure before resuming.");
}
