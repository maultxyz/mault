import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CameraFocusControl } from "./camera-focus-control";

const mocks = vi.hoisted(() => ({ lock: vi.fn(), apply: vi.fn().mockResolvedValue(undefined) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/features/scanner/api/use-camera", () => ({ useCameraContext: () => ({
  stream: null, selectedCameraId: "pi-webcam:/dev/camera-a", focusRange: { min: 0, max: 100, step: 1 },
  focusDistance: null, setFocusDistance: vi.fn(), applyFocusDistance: mocks.apply,
}) }));
vi.mock("@/features/scanner/lib/pi-camera", () => ({ browserMustUsePiCamera: () => true, isPiRelayTrack: () => false, lockTrackFocus: mocks.lock }));
vi.mock("@/components/ui/switch", () => ({ Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => <input type="checkbox" checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} /> }));
vi.mock("@/components/ui/slider", () => ({ Slider: () => <div /> }));
afterEach(cleanup);

it("restores autofocus if the page closes while reading the manual focus position", async () => {
  let finish: (value: number) => void = () => {};
  mocks.lock.mockImplementationOnce(() => new Promise<number>((resolve) => { finish = resolve; }));
  const change = vi.fn();
  const { unmount } = render(<CameraFocusControl previewOnly onFocusChange={change} />);
  fireEvent.click(screen.getByRole("checkbox"));
  unmount();
  finish(37);
  await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith(null, false));
  expect(change).not.toHaveBeenCalled();
});
