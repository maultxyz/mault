import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCameraSettingsDraft } from "./use-camera-settings-draft";

const mocks = vi.hoisted(() => ({
  camera: { selectedCameraId: "camera-a", focusDistance: 37 as number | null, status: "ready",
    selectCamera: vi.fn(), applyFocusDistance: vi.fn() },
  error: vi.fn(),
}));
vi.mock("@/features/scanner/api/use-camera", () => ({ useCameraContext: () => mocks.camera }));
vi.mock("@/features/scanner/api/use-station-toast", () => ({ useStationToast: () => ({ error: mocks.error }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.camera.selectedCameraId = "camera-a";
  mocks.camera.focusDistance = 37;
  mocks.camera.status = "ready";
  mocks.camera.selectCamera.mockImplementation(async (id: string) => { mocks.camera.selectedCameraId = id; return true; });
  mocks.camera.applyFocusDistance.mockImplementation(async (value: number | null) => { mocks.camera.focusDistance = value; });
});
afterEach(cleanup);

it("previews camera selection without persistence and restores on Discard", async () => {
  const { result } = renderHook(useCameraSettingsDraft);
  act(() => result.current.setCamera("camera-b"));
  expect(result.current.isDirty).toBe(true);
  expect(result.current.isCameraChanged).toBe(true);
  await waitFor(() => expect(mocks.camera.selectCamera).toHaveBeenCalledWith("camera-b", false));
  await act(() => result.current.discard());
  expect(result.current.cameraId).toBe("camera-a");
  expect(result.current.isDirty).toBe(false);
  expect(mocks.camera.selectCamera).toHaveBeenLastCalledWith("camera-a");
  act(() => result.current.setCamera("camera-b"));
  await act(() => result.current.commit());
  expect(mocks.camera.selectCamera).toHaveBeenCalledWith("camera-b");
  expect(result.current.isDirty).toBe(false);
});

it("previews focus without persistence, restores on Discard and persists only on Save", async () => {
  const { result } = renderHook(useCameraSettingsDraft);
  act(() => result.current.previewFocus(45));
  await waitFor(() => expect(mocks.camera.applyFocusDistance).toHaveBeenCalledWith(45, false));
  expect(result.current.isDirty).toBe(true);
  await act(() => result.current.discard());
  expect(mocks.camera.applyFocusDistance).toHaveBeenLastCalledWith(37, false);
  expect(result.current.isDirty).toBe(false);
  act(() => result.current.previewFocus(52));
  await act(() => result.current.commit());
  expect(mocks.camera.applyFocusDistance).toHaveBeenLastCalledWith(52, true);
  expect(result.current.isDirty).toBe(false);
});

it("restores the original focus before switching cameras and does not carry focus to the new camera", async () => {
  const { result } = renderHook(useCameraSettingsDraft);
  act(() => result.current.previewFocus(45));
  await waitFor(() => expect(mocks.camera.applyFocusDistance).toHaveBeenCalledWith(45, false));
  act(() => result.current.setCamera("camera-b"));
  await act(() => result.current.commit());
  expect(mocks.camera.applyFocusDistance).toHaveBeenLastCalledWith(37, false);
  expect(mocks.camera.applyFocusDistance.mock.calls.some(([, persist]) => persist === true)).toBe(false);
  expect(mocks.camera.selectCamera).toHaveBeenCalledWith("camera-b");
});

it("retains a failed camera draft for retry", async () => {
  mocks.camera.selectCamera.mockResolvedValue(false);
  const { result } = renderHook(useCameraSettingsDraft);
  act(() => result.current.setCamera("missing"));
  await act(async () => { await expect(result.current.commit()).rejects.toThrow("could not be selected"); });
  expect(result.current.isDirty).toBe(true);
  expect(result.current.cameraId).toBe("missing");
  expect(result.current.isSaving).toBe(false);
});

it("restores a preview on unmount without persisting it", async () => {
  const { result, unmount } = renderHook(useCameraSettingsDraft);
  act(() => result.current.previewFocus(null));
  await waitFor(() => expect(mocks.camera.applyFocusDistance).toHaveBeenCalledWith(null, false));
  unmount();
  await waitFor(() => expect(mocks.camera.applyFocusDistance).toHaveBeenLastCalledWith(37, false));
});

it("retains focus drafts after a save failure and restores them on Discard", async () => {
  const { result } = renderHook(useCameraSettingsDraft);
  act(() => result.current.previewFocus(45));
  await waitFor(() => expect(mocks.camera.applyFocusDistance).toHaveBeenCalledWith(45, false));
  mocks.camera.applyFocusDistance.mockRejectedValueOnce(new Error("disk full"));
  await act(async () => { await expect(result.current.commit()).rejects.toThrow("disk full"); });
  expect(result.current.isDirty).toBe(true);
  await act(() => result.current.discard());
  expect(mocks.camera.applyFocusDistance).toHaveBeenLastCalledWith(37, false);
});

it("keeps the original baseline when focus returns to its original value", async () => {
  const { result } = renderHook(useCameraSettingsDraft);
  act(() => result.current.previewFocus(45));
  await waitFor(() => expect(mocks.camera.applyFocusDistance).toHaveBeenCalledWith(45, false));
  act(() => result.current.previewFocus(37));
  await waitFor(() => expect(mocks.camera.applyFocusDistance).toHaveBeenLastCalledWith(37, false));
  expect(result.current.isDirty).toBe(false);
  act(() => result.current.previewFocus(52));
  await act(() => result.current.discard());
  expect(mocks.camera.applyFocusDistance).toHaveBeenLastCalledWith(37, false);
});

it("restores through the original camera adapter when the sorter changes", async () => {
  const originalApply = mocks.camera.applyFocusDistance;
  const { result, unmount } = renderHook(useCameraSettingsDraft);
  act(() => result.current.previewFocus(45));
  await waitFor(() => expect(originalApply).toHaveBeenCalledWith(45, false));
  const otherApply = vi.fn().mockResolvedValue(undefined);
  mocks.camera.applyFocusDistance = otherApply;
  unmount();
  await waitFor(() => expect(originalApply).toHaveBeenLastCalledWith(37, false));
  expect(otherApply).not.toHaveBeenCalled();
  mocks.camera.applyFocusDistance = originalApply;
});

it("retries a failed focus save instead of retaining a rejected request", async () => {
  const { result } = renderHook(useCameraSettingsDraft);
  act(() => result.current.previewFocus(45));
  await waitFor(() => expect(mocks.camera.applyFocusDistance).toHaveBeenCalledWith(45, false));
  mocks.camera.applyFocusDistance.mockRejectedValueOnce(new Error("temporary failure"));
  await act(async () => { await expect(result.current.commit()).rejects.toThrow("temporary failure"); });
  await act(() => result.current.commit());
  expect(mocks.camera.applyFocusDistance).toHaveBeenLastCalledWith(45, true);
  expect(result.current.isDirty).toBe(false);
});

it("keeps the saved baseline when preview readback changes, including after refresh-like rerenders", async () => {
  const { result, rerender, unmount } = renderHook(useCameraSettingsDraft);
  act(() => result.current.setCamera("camera-b"));
  await waitFor(() => expect(mocks.camera.selectCamera).toHaveBeenCalledWith("camera-b", false));
  rerender();
  expect(result.current.isDirty).toBe(true);
  expect(result.current.isCameraChanged).toBe(true);
  unmount();
  await waitFor(() => expect(mocks.camera.selectCamera).toHaveBeenLastCalledWith("camera-a"));
});
