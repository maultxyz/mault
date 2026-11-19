import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeatureHighlight } from "@magic-vault/shared";
import { FeatureHighlightsHost } from "./feature-highlights-host";

const mocks = vi.hoisted(() => ({
  markSeen: vi.fn(),
  loadUnseen: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options
        ? `${key}(${Object.entries(options)
            .map(([name, value]) => `${name}=${value}`)
            .join(",")})`
        : key,
  }),
}));
vi.mock("@/hooks/use-is-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/use-impersonation", () => ({
  useImpersonation: () => ({ isImpersonating: false }),
}));
vi.mock("@/lib/auth", () => ({
  useAuthSession: () => ({ data: { user: { id: "user-1" } } }),
}));
vi.mock("@/features/scanner/api/use-stations", () => ({
  useStations: () => ({ connectedStationIds: new Set<string>() }),
}));
vi.mock("@/features/scanner/api/use-scanned-cards", () => ({
  useScannedCards: () => ({ isTimerActive: false }),
}));
vi.mock("@/features/onboarding/lib/tour-storage", () => ({
  isTourCompleted: () => true,
}));
vi.mock("@/features/feature-highlights/api/feature-highlights", async () => {
  const { queryOptions } = await import("@tanstack/react-query");
  return {
    markFeatureHighlightsSeen: mocks.markSeen,
    unseenFeatureHighlightsQueryOptions: (userId: string | null) =>
      queryOptions({
        queryKey: ["feature-highlights", "unseen", userId],
        queryFn: mocks.loadUnseen,
        enabled: !!userId,
      }),
  };
});

const firstHighlight: FeatureHighlight = {
  id: "first",
  source: "admin",
  publishedAt: "2026-11-19T00:00:00.000Z",
  slides: [
    {
      title: { kind: "literal", value: "Faster search" },
      body: { kind: "literal", value: "Search finds more cards." },
      media: {
        type: "video",
        url: "https://example.com/search.mp4",
        posterUrl: null,
        altText: { kind: "literal", value: "Search demo" },
      },
      link: {
        url: "https://example.com/docs",
        label: { kind: "literal", value: "Read the docs" },
      },
    },
  ],
};

const secondHighlight: FeatureHighlight = {
  id: "second",
  source: "admin",
  publishedAt: "2026-11-18T00:00:00.000Z",
  slides: [
    {
      title: { kind: "literal", value: "Bulk edit" },
      body: { kind: "literal", value: "Edit many cards at once." },
      media: null,
      link: null,
    },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderHost() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/home"]}>
        <FeatureHighlightsHost />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function location() {
  return screen.getByTestId("location");
}

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  mocks.loadUnseen.mockResolvedValue({
    highlights: [firstHighlight, secondHighlight],
    seenHighlightIds: [],
  });
  mocks.markSeen.mockResolvedValue(undefined);
});

describe("FeatureHighlightsFloatingCard", () => {
  it("opens the current highlight on the What's new page when its text is clicked", async () => {
    renderHost();
    await screen.findByRole("region", { name: "featureHighlights.title" });
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.next" }));
    fireEvent.click(screen.getByText("Edit many cards at once."));
    expect(location()).toHaveTextContent("/app/whats-new?highlight=second");
    await waitFor(() =>
      expect(mocks.markSeen.mock.calls[0]?.[0]).toEqual(["first", "second"]),
    );
    expect(screen.queryByRole("region", { name: "featureHighlights.title" })).toBeNull();
  });

  it("makes the slide title a link to the highlight", async () => {
    renderHost();
    await screen.findByRole("region", { name: "featureHighlights.title" });
    const titleLink = screen.getByRole("link", { name: "Faster search" });
    expect(titleLink).toHaveAttribute("href", "/app/whats-new?highlight=first");
  });

  it("opens the current highlight from the header button", async () => {
    renderHost();
    await screen.findByRole("region", { name: "featureHighlights.title" });
    const openButton = screen.getByLabelText("featureHighlights.openInTimeline");
    expect(openButton).toHaveAttribute("href", "/app/whats-new?highlight=first");
    fireEvent.click(openButton);
    expect(location()).toHaveTextContent("/app/whats-new?highlight=first");
    await waitFor(() => expect(mocks.markSeen).toHaveBeenCalledTimes(1));
  });

  it("does not navigate for clicks on the video, the slide link or Next", async () => {
    renderHost();
    await screen.findByRole("region", { name: "featureHighlights.title" });
    fireEvent.click(screen.getByLabelText("Search demo"));
    fireEvent.click(screen.getByLabelText(/Read the docs/));
    expect(location()).toHaveTextContent("/app/home");
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.next" }));
    expect(location()).toHaveTextContent("/app/home");
    expect(screen.getByRole("region", { name: "featureHighlights.title" })).toBeInTheDocument();
    expect(mocks.markSeen).not.toHaveBeenCalled();
  });
});
