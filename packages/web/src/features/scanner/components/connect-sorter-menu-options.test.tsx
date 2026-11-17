import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConnectSorterMenuOptions } from "./connect-sorter-menu-options";

const mocks = vi.hoisted(() => ({ piHost: true, piSorter: false, connect: vi.fn() }));
vi.mock("@/hooks/use-pi-host", () => ({ usePiHostState: () => mocks }));
vi.mock("@/features/scanner/api/use-stations", () => ({ useStations: () => ({ canConnectAnotherSorter: true, connectAnotherSorter: mocks.connect }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("./pi-sorter-menu-items", () => ({ PiSorterMenuItems: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect("/dev/ttyACM0")}>Host USB sorter</button> }));
vi.mock("./connect-sorter-menu-items", () => ({ ConnectSorterMenuItems: () => <button>Browser sorter</button> }));
beforeEach(() => { mocks.piHost = true; mocks.piSorter = false; vi.clearAllMocks(); });
afterEach(cleanup);

it("hides adding sorters in GPIO mode", () => {
  mocks.piSorter = true;
  const { container } = render(<ConnectSorterMenuOptions />);
  expect(container).toBeEmptyDOMElement();
});

it("keeps USB discovery on USB-only Linux/Pi hosts", () => {
  render(<ConnectSorterMenuOptions />);
  fireEvent.click(screen.getByRole("button", { name: "Host USB sorter" }));
  expect(mocks.connect).toHaveBeenCalledWith("pi:/dev/ttyACM0");
});

it("preserves ordinary browser connections outside host mode", () => {
  mocks.piHost = false;
  render(<ConnectSorterMenuOptions />);
  expect(screen.getByRole("button", { name: "Browser sorter" })).toBeInTheDocument();
});
