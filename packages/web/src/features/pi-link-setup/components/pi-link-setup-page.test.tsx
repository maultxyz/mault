import { PiLinkSetupPage } from "@/features/pi-link-setup/components/pi-link-setup-page";
import type { PiLinkSetup } from "@/lib/interfaces/raspberry-pis";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setup: null as PiLinkSetup | null }));

vi.mock("@/features/pi-link-setup/api/use-pi-link-setup", () => ({
  usePiLinkSetup: () => mocks.setup,
}));

function anchorHrefs(container: HTMLElement) {
  return [...container.querySelectorAll("a")].map((anchor) => anchor.getAttribute("href"));
}

function renderPage(setup: PiLinkSetup) {
  mocks.setup = setup;
  return render(
    <MemoryRouter>
      <PiLinkSetupPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.setup = null;
});

it("shows the link code and opens Raspberry Pis with it filled in", () => {
  const { container } = renderPage({
    status: { state: "pairing", code: "ABCD2345", expiresAt: null, appUrl: "https://dev.mault.xyz" },
    isUnreachable: false,
  });
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  expect(screen.getByText("ABCD-2345")).toBeInTheDocument();
  const hrefs = anchorHrefs(container);
  expect(hrefs).toContain("https://dev.mault.xyz/auth/sign-in");
  expect(hrefs).toContain("https://dev.mault.xyz/app/settings/raspberry-pis?linkCode=ABCD2345");
});

it("never shows a code once the board is linked", () => {
  const { container } = renderPage({
    status: { state: "linked", hostName: "Workbench", connected: true, appUrl: "https://mault.xyz" },
    isUnreachable: false,
  });
  expect(screen.getByText("piLinkSetup.linkedTitle")).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/[A-Z0-9]{4}-[A-Z0-9]{4}/);
  expect(anchorHrefs(container)).toContain("https://mault.xyz/app/home");
  expect(anchorHrefs(container).some((href) => href?.includes("linkCode"))).toBe(false);
});

it("explains when the board's setup can't be reached", () => {
  renderPage({ status: null, isUnreachable: true });
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
