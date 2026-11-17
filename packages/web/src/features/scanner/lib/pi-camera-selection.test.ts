import { afterEach, expect, it, vi } from "vitest";
import { listPiCameras, piCameraUrl, readPiCameraHealth } from "./pi-camera";
import { PI_CAMERA_DEVICE_ID } from "@/lib/constants/scanner";

vi.mock("@/lib/api/client", () => ({ getAuthHeaders: async () => ({}) }));
vi.mock("@/lib/pi-host", () => ({ isPiHost: () => true, loadPiHost: async () => true }));
afterEach(() => vi.unstubAllGlobals());

it("lists distinct Pi camera IDs and addresses only the selected camera", async () => {
  const devices = [{ id: "/dev/video-test-a", label: "Camera A" }, { id: "/dev/video-test-b", label: "Camera B" }];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ devices }))));
  const cameras = await listPiCameras();
  expect(cameras.map((camera) => camera.deviceId)).toEqual(devices.map((device) => `${PI_CAMERA_DEVICE_ID}:${device.id}`));
  for (const action of ["health", "frame", "stream", "focus"]) {
    expect(piCameraUrl(action, cameras[1].deviceId)).toContain(`/${action}?cameraId=${encodeURIComponent(devices[1].id)}`);
  }
  expect(piCameraUrl("frame")).not.toContain("cameraId");
});

it("a selected camera outage stays an error instead of falling back to the default", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 503 })));
  expect(await readPiCameraHealth(`${PI_CAMERA_DEVICE_ID}:/dev/missing`)).toEqual({ status: "down" });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("cameraId=%2Fdev%2Fmissing"), expect.anything());
});
