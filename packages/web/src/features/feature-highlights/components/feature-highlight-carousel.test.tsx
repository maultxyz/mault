import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeatureHighlight } from "@magic-vault/shared";
import { FeatureHighlightCarousel } from "./feature-highlight-carousel";
import { FeatureHighlightsHost } from "./feature-highlights-host";
import { featureHighlightCarouselSlides } from "@/features/feature-highlights/lib/feature-highlight-slides";

const mocks = vi.hoisted(() => ({
  markSeen: vi.fn(),
  loadUnseen: vi.fn(),
  isMobile: false,
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
vi.mock("@/hooks/use-is-mobile", () => ({ useIsMobile: () => mocks.isMobile }));
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

const highlight: FeatureHighlight = {
  id: "highlight-1",
  source: "release",
  publishedAt: "2026-11-19T00:00:00.000Z",
  slides: [
    {
      title: { kind: "translated", key: "featureHighlights.release.one.title" },
      body: { kind: "literal", value: "Literal body text" },
      media: null,
      link: null,
    },
    {
      title: { kind: "literal", value: "Second slide" },
      body: { kind: "literal", value: "More text" },
      media: {
        type: "video",
        url: "https://example.com/clip.mp4",
        posterUrl: null,
        altText: { kind: "literal", value: "Sorting demo" },
      },
      link: {
        url: "https://example.com/docs",
        label: { kind: "literal", value: "" },
      },
    },
  ],
};

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

function renderCarousel(onFinish = vi.fn()) {
  render(
    <MemoryRouter>
      <FeatureHighlightCarousel
        slides={featureHighlightCarouselSlides([highlight])}
        onFinish={onFinish}
      />
    </MemoryRouter>,
  );
  return onFinish;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isMobile = false;
  mockReducedMotion(false);
});


describe("FeatureHighlightCarousel", () => {
  it("resolves translated keys and renders literal text as is", () => {
    renderCarousel();
    expect(
      screen.getByRole("heading", { name: "featureHighlights.release.one.title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Literal body text")).toBeInTheDocument();
  });

  it("moves between slides with buttons and arrow keys and announces the change", () => {
    renderCarousel();
    expect(screen.queryByRole("button", { name: "featureHighlights.back" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.next" }));
    expect(screen.getByRole("heading", { name: "Second slide" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "featureHighlights.slideAnnouncement(current=2,total=2,title=Second slide)",
    );
    expect(screen.getByLabelText(/featureHighlights.learnMore/)).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
    fireEvent.keyDown(screen.getByRole("heading", { name: "Second slide" }), {
      key: "ArrowLeft",
    });
    expect(
      screen.getByRole("heading", { name: "featureHighlights.release.one.title" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(screen.getByText("Literal body text"), { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Second slide" })).toBeInTheDocument();
  });

  it("finishes from the last slide with Got it", () => {
    const onFinish = renderCarousel();
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.next" }));
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.gotIt" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("autoplays muted inline video only without reduced motion", () => {
    renderCarousel();
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.next" }));
    const video = screen.getByLabelText("Sorting demo") as HTMLVideoElement;
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.controls).toBe(true);
    expect(video.loop).toBe(true);
    expect(video).toHaveAttribute("playsinline");
  });

  it("does not autoplay video when reduced motion is preferred", () => {
    mockReducedMotion(true);
    renderCarousel();
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.next" }));
    const video = screen.getByLabelText("Sorting demo") as HTMLVideoElement;
    expect(video.autoplay).toBe(false);
  });
});

describe("FeatureHighlightsHost", () => {
  function renderHost() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/home"]}>
          <FeatureHighlightsHost />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("shows unseen highlights without taking focus and marks them seen on finish", async () => {
    mocks.loadUnseen.mockResolvedValue({
      highlights: [highlight],
      seenHighlightIds: [],
    });
    mocks.markSeen.mockResolvedValue(undefined);
    renderHost();
    const region = await screen.findByRole("region", {
      name: "featureHighlights.title",
    });
    expect(region).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.next" }));
    fireEvent.click(screen.getByRole("button", { name: "featureHighlights.gotIt" }));
    await waitFor(() =>
      expect(mocks.markSeen.mock.calls[0]?.[0]).toEqual(["highlight-1"]),
    );
    expect(screen.queryByRole("region", { name: "featureHighlights.title" })).toBeNull();
  });

  it("marks highlights seen when closed with Escape", async () => {
    mocks.loadUnseen.mockResolvedValue({
      highlights: [highlight],
      seenHighlightIds: [],
    });
    mocks.markSeen.mockResolvedValue(undefined);
    renderHost();
    await screen.findByRole("region", { name: "featureHighlights.title" });
    fireEvent.keyDown(screen.getByRole("button", { name: "a11y.close" }), {
      key: "Escape",
    });
    await waitFor(() =>
      expect(mocks.markSeen.mock.calls[0]?.[0]).toEqual(["highlight-1"]),
    );
  });

  it("links to the What's new page and marks the shown highlights seen", async () => {
    mocks.loadUnseen.mockResolvedValue({
      highlights: [highlight],
      seenHighlightIds: [],
    });
    mocks.markSeen.mockResolvedValue(undefined);
    renderHost();
    await screen.findByRole("region", { name: "featureHighlights.title" });
    const seeAllLink = screen.getByRole("link", { name: "featureHighlights.seeAll" });
    expect(seeAllLink).toHaveAttribute("href", "/app/whats-new");
    fireEvent.click(seeAllLink);
    await waitFor(() =>
      expect(mocks.markSeen.mock.calls[0]?.[0]).toEqual(["highlight-1"]),
    );
    expect(screen.queryByRole("region", { name: "featureHighlights.title" })).toBeNull();
  });

  it("stays hidden when nothing is unseen", async () => {
    mocks.loadUnseen.mockResolvedValue({ highlights: [], seenHighlightIds: [] });
    renderHost();
    await waitFor(() => expect(mocks.loadUnseen).toHaveBeenCalled());
    expect(screen.queryByRole("region")).toBeNull();
  });
});
