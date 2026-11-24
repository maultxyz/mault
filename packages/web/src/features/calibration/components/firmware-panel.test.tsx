import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FirmwarePanel } from "./firmware-panel";
import { useFirmwareVersionAlert } from "@/hooks/alerts/use-firmware-version-alert";
import calibration from "@/locales/en/calibration.json";
import scanner from "@/locales/en/scanner.json";

const mocks = vi.hoisted(() => ({
  piSorter: true,
  latest: "pi-0.3.0",
  serial: {
    isConnected: true,
    firmwareVersion: "pi-0.3.0",
    board: "raspberry_pi",
    transport: "pi-sorter",
    isFlashing: false,
    connect: vi.fn(),
  },
}));

vi.mock("@/hooks/use-pi-host", () => ({ usePiHostState: () => ({ piSorter: mocks.piSorter }) }));
vi.mock("@/hooks/use-latest-firmware-version", () => ({ useLatestFirmwareVersion: () => mocks.latest }));
vi.mock("@/features/scanner/api/use-serial", () => ({ useSerial: () => mocks.serial }));
vi.mock("@/features/scanner/api/use-new-board-flash", () => ({ useNewBoardFlash: () => ({ isSupported: true }) }));
vi.mock("@/features/scanner/components/esp32-flash-dialog", () => ({ Esp32FlashDialog: () => <div data-testid="esp32-flash" /> }));
vi.mock("@/features/scanner/components/new-board-flash-dialog", () => ({ NewBoardFlashDialog: () => <div data-testid="new-board-flash" /> }));
vi.mock("react-i18next", () => ({
  useTranslation: (namespace: string) => ({
    t: (key: string, values: Record<string, unknown> = {}) => {
      const dictionary = namespace === "scanner" ? scanner : calibration;
      let text = key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], dictionary) as string;
      for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{{${name}}}`, String(value));
      return text;
    },
  }),
}));

beforeEach(() => {
  mocks.piSorter = true;
  mocks.latest = "pi-0.3.0";
  Object.assign(mocks.serial, { isConnected: true, firmwareVersion: "pi-0.3.0", board: "raspberry_pi", transport: "pi-sorter" });
});
afterEach(cleanup);

it("shows installed and bundled GPIO firmware without board flashing", () => {
  render(<FirmwarePanel />);
  expect(screen.getAllByText("pi-0.3.0")).toHaveLength(2);
  expect(screen.getByText(calibration.firmware.bundled)).toBeInTheDocument();
  expect(screen.getByText(calibration.firmware.piDescription)).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByTestId("esp32-flash")).not.toBeInTheDocument();
  expect(screen.queryByTestId("new-board-flash")).not.toBeInTheDocument();
});

it("does not offer to flash a separate board while GPIO reconnects", () => {
  mocks.serial.isConnected = false;
  render(<FirmwarePanel />);
  expect(screen.getByText(calibration.firmware.notConnected)).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("keeps ESP32 firmware versions and flashing on USB-only hosts", () => {
  mocks.piSorter = false;
  mocks.latest = "2.14.0";
  Object.assign(mocks.serial, { firmwareVersion: "2.13.2", board: "esp32", transport: "serial" });
  render(<FirmwarePanel />);
  expect(screen.getByText("2.13.2")).toBeInTheDocument();
  expect(screen.getByText("2.14.0")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: calibration.firmware.flashConnected })).toBeInTheDocument();
});

it("keeps flashing new boards outside GPIO mode", () => {
  mocks.piSorter = false;
  mocks.serial.isConnected = false;
  render(<FirmwarePanel />);
  expect(screen.getByRole("button", { name: calibration.firmware.flashBoard })).toBeInTheDocument();
});

it("guides an older GPIO controller toward restarting Mault instead of ESP32 downloads", () => {
  mocks.serial.firmwareVersion = "pi-0.2.0";
  const { result } = renderHook(useFirmwareVersionAlert);
  expect(result.current.alert).not.toBeNull();
  expect(result.current.alert?.actions).toBeUndefined();
  expect(result.current.portal).toBeNull();
  render(<>{result.current.alert?.message}</>);
  expect(screen.getByText(/Restart Mault on the Pi/)).toHaveTextContent("pi-0.3.0");
});
