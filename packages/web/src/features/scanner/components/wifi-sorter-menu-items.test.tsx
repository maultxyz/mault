import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { WifiSorters } from "@/lib/interfaces/sorter-wifi";
import { WifiSorterMenuItems } from "./wifi-sorter-menu-items";

const mocks = vi.hoisted(() => ({
  wifiSorters: { sorters: [], isLoading: false } as WifiSorters,
  navigate: vi.fn(),
}));
vi.mock("@/features/scanner/api/use-wifi-sorters", () => ({
  useWifiSorters: () => mocks.wifiSorters,
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSubTrigger: ({
    children,
    disabled,
  }: React.ComponentProps<"button">) => (
    <button disabled={disabled}>{children}</button>
  ),
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: React.ComponentProps<"button">) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  mocks.navigate.mockReset();
});

it("always offers Wi-Fi and points to setup when no sorter is linked", () => {
  mocks.wifiSorters = { sorters: [], isLoading: false };
  render(<WifiSorterMenuItems onSelect={vi.fn()} />);
  expect(
    screen.getByRole("button", { name: "scannerMenu.connectWifi" }),
  ).toBeTruthy();
  expect(screen.getByText("wifiConnect.empty")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "sorterWifi.setUp" }));
  expect(mocks.navigate).toHaveBeenCalledWith("/app/calibrate/connection");
});

it("connects an online sorter and disables unavailable ones", () => {
  mocks.wifiSorters = {
    isLoading: false,
    sorters: [
      { guid: "a", name: "Front desk", online: true, inUse: false, connectedHere: false },
      { guid: "b", name: "Back room", online: false, inUse: false, connectedHere: false },
    ],
  };
  const onSelect = vi.fn();
  render(<WifiSorterMenuItems onSelect={onSelect} />);
  fireEvent.click(screen.getByRole("button", { name: "Front desk" }));
  expect(onSelect).toHaveBeenCalledWith("a");
  expect(
    screen.getByRole<HTMLButtonElement>("button", { name: /Back room/ }).disabled,
  ).toBe(true);
});
