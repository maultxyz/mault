import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PiBluetoothMenuItems } from "./pi-bluetooth-menu-items";

const mocks = vi.hoisted(() => ({ supported: true, powered: true, open: (_open: boolean) => {} }));
vi.mock("@/lib/constants/api", () => ({ API_BASE: "" }));
vi.mock("@/lib/api/client", () => ({ getAuthHeaders: async () => ({ Authorization: "Bearer test", "X-Org-Id": "org-1" }) }));
vi.mock("@/features/companies/api/use-organization", () => ({ useOrg: () => ({ activeOrg: { id: "org-1" } }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenuSub: ({ onOpenChange, children }: { onOpenChange: (open: boolean) => void; children: React.ReactNode }) => { mocks.open = onOpenChange; return <div>{children}</div>; },
  DropdownMenuSubTrigger: ({ children, disabled }: React.ComponentProps<"button">) => <button disabled={disabled} onClick={() => mocks.open(true)}>{children}</button>,
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: React.ComponentProps<"button">) => <button onClick={onClick} disabled={disabled}>{children}</button>,
}));
beforeEach(() => {
  mocks.supported = true; mocks.powered = true;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/devices")
    ? { devices: [{ id: "ble:AA:BB:CC:DD:EE:FF", label: "ESP32", busy: false }] }
    : { supported: mocks.supported, powered: mocks.powered }), { headers: { "Content-Type": "application/json" } })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function view() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const onSelect = vi.fn();
  render(<QueryClientProvider client={client}><PiBluetoothMenuItems onSelect={onSelect} /></QueryClientProvider>);
  return onSelect;
}

it("uses the host adapter without browser Web Bluetooth, scanning only when opened", async () => {
  const onSelect = view();
  const trigger = await screen.findByRole("button", { name: "scannerMenu.connectBluetooth" });
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole("button", { name: "ESP32" }));
  expect(fetch).toHaveBeenCalledWith("/api/pi-serial/bluetooth/devices", { method: "POST", headers: { Authorization: "Bearer test", "X-Org-Id": "org-1" } });
  expect(onSelect).toHaveBeenCalledWith("ble:AA:BB:CC:DD:EE:FF");
});

it("hides Bluetooth without host support and does not scan", async () => {
  mocks.supported = false;
  view();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("explains a powered-off adapter without starting discovery", async () => {
  mocks.powered = false;
  view();
  expect(await screen.findByRole("button", { name: "piHardware.bluetoothOff" })).toBeDisabled();
  expect(fetch).toHaveBeenCalledTimes(1);
});
