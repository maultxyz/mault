import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { PiSorterMenuItems } from "./pi-sorter-menu-items";

vi.mock("@/lib/constants/api", () => ({ API_BASE: "" }));
vi.mock("@/lib/api/client", () => ({ getAuthHeaders: async () => ({ Authorization: "Bearer test", "X-Org-Id": "org-1" }) }));
vi.mock("@/features/companies/api/use-organization", () => ({ useOrg: () => ({ activeOrg: { id: "org-1" } }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/ui/dropdown-menu", () => ({ DropdownMenuItem: ({ children, onClick, disabled }: React.ComponentProps<"button">) => <button disabled={disabled} onClick={onClick}>{children}</button> }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("discovers attached USB sorters through the authenticated API proxy and selects their ID", async () => {
  const id = "/dev/serial/by-id/usb-Arduino";
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/pi-serial/devices"
    ? new Response(JSON.stringify({ devices: [{ id, label: "Arduino", builtin: false, busy: false }] }), { headers: { "Content-Type": "application/json" } })
    : new Response("<!doctype html><html></html>", { headers: { "Content-Type": "text/html" } })));
  const onSelect = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><PiSorterMenuItems onSelect={onSelect} /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Arduino" }));
  expect(fetch).toHaveBeenCalledWith("/api/pi-serial/devices", { headers: { Authorization: "Bearer test", "X-Org-Id": "org-1" } });
  expect(onSelect).toHaveBeenCalledWith(id);
  view.unmount();
  client.clear();
});
