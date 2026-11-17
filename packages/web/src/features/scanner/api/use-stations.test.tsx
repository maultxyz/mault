import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StationsProvider, useStations } from "./use-stations";

const host = vi.hoisted(() => ({ piHost: true, piSorter: false }));
vi.mock("@/hooks/use-pi-host", () => ({ usePiHostState: () => host }));
vi.mock("@/features/companies/api/use-organization", () => ({ useOrg: () => ({ activeOrg: { id: "camera-org" } }) }));
vi.mock("@/features/scanner/lib/onnx-runtime", () => ({ useEffectiveExecutionProvider: () => "wasm" }));
vi.mock("@/features/billing/api/billing", () => ({ billingQueryOptions: () => ({}) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: undefined }) }));
beforeEach(() => {
  host.piSorter = false;
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("restores each sorter's saved camera after remount despite a default preview before connection", async () => {
  const first = renderHook(useStations, { wrapper: StationsProvider });
  const stationId = first.result.current.activeStationId;
  act(() => first.result.current.bindStationDevice(stationId, "pi-sorter"));
  act(() => first.result.current.setStationCamera(stationId, "pi-webcam:/dev/arducam"));
  await waitFor(() => expect(first.result.current.getDevicePrefs("pi-sorter")?.cameraId).toBe("pi-webcam:/dev/arducam"));
  first.unmount();
  const refreshed = renderHook(useStations, { wrapper: StationsProvider });
  const refreshedId = refreshed.result.current.activeStationId;
  act(() => refreshed.result.current.setStationCamera(refreshedId, "pi-webcam:/dev/default"));
  act(() => refreshed.result.current.bindStationDevice(refreshedId, "pi-sorter"));
  expect(refreshed.result.current.stations.find((station) => station.id === refreshedId)?.cameraId).toBe("pi-webcam:/dev/arducam");
  expect(refreshed.result.current.getDevicePrefs("pi-sorter")?.cameraId).toBe("pi-webcam:/dev/arducam");
});

it("prevents additional USB, Bluetooth and cloud station connections in GPIO mode", () => {
  host.piSorter = true;
  const { result } = renderHook(useStations, { wrapper: StationsProvider });
  const connector = { connect: vi.fn(), connectBluetooth: vi.fn(), connectCloud: vi.fn(), connectPort: vi.fn(), connectBluetoothDevice: vi.fn(), disconnect: vi.fn() };
  act(() => { result.current.registerConnector(result.current.activeStationId, connector); });
  expect(result.current.maxConnectedSorters).toBe(1);
  expect(result.current.canConnectAnotherSorter).toBe(false);
  act(() => {
    result.current.connectAnotherSorter("usb");
    result.current.connectAnotherSorter("bluetooth");
    result.current.connectAnotherSorter("pi:/dev/ttyACM0");
    result.current.connectAnotherSorterCloud("another-sorter");
  });
  expect(connector.connect).not.toHaveBeenCalled();
  expect(connector.connectBluetooth).not.toHaveBeenCalled();
  expect(connector.connectCloud).not.toHaveBeenCalled();
});

it("retains multiple sorter connections for USB-only hosts", () => {
  const { result } = renderHook(useStations, { wrapper: StationsProvider });
  const connect = vi.fn();
  act(() => { result.current.registerConnector(result.current.activeStationId, { connect, connectBluetooth: vi.fn(), connectCloud: vi.fn(), connectPort: vi.fn(), connectBluetoothDevice: vi.fn(), disconnect: vi.fn() }); });
  expect(result.current.maxConnectedSorters).toBeGreaterThan(1);
  expect(result.current.canConnectAnotherSorter).toBe(true);
  act(() => result.current.connectAnotherSorter("pi:/dev/ttyACM0"));
  expect(connect).toHaveBeenCalledWith("/dev/ttyACM0");
});
