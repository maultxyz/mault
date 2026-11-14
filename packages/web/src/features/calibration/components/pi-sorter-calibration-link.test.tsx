import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePiHostState } from "@/hooks/use-pi-host";
import { PiSorterCalibrationLink } from "@/features/calibration/components/pi-sorter-calibration-link";

vi.mock("@/hooks/use-pi-host", () => ({ usePiHostState: vi.fn() }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("mobile Home Pi calibration shortcut", () => {
  beforeEach(() => {
    vi.mocked(usePiHostState).mockReturnValue({
      piHost: true,
      piSorter: true,
      settled: true,
    });
  });

  it("opens calibration without requiring a connect button or serial ownership", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PiSorterCalibrationLink />} />
          <Route
            path="/app/calibrate/calibration"
            element={<p>Calibration settings</p>}
          />
        </Routes>
      </MemoryRouter>,
    );
    const shortcut = screen.getByRole("link", {
      name: /mobileSorter.calibrate/,
    });
    expect(shortcut).toHaveAttribute("href", "/app/calibrate/calibration");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    fireEvent.click(shortcut);
    expect(screen.getByText("Calibration settings")).toBeInTheDocument();
  });

  it("leaves the normal USB and Bluetooth mobile flows unchanged", () => {
    vi.mocked(usePiHostState).mockReturnValue({
      piHost: true,
      piSorter: false,
      settled: true,
    });
    render(
      <MemoryRouter>
        <PiSorterCalibrationLink />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not assume built-in hardware while discovery is pending", () => {
    vi.mocked(usePiHostState).mockReturnValue({
      piHost: false,
      piSorter: false,
      settled: false,
    });
    render(
      <MemoryRouter>
        <PiSorterCalibrationLink />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
