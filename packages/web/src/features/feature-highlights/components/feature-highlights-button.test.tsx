import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FeatureHighlight,
  FeatureHighlightTimelinePage,
} from "@magic-vault/shared";
import { FeatureHighlightsButton } from "./feature-highlights-button";

const mocks = vi.hoisted(() => ({
  loadUnseen: vi.fn(),
  loadTimelinePage: vi.fn(),
  markSeen: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en-US" },
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
vi.mock("@/features/feature-highlights/api/feature-highlights", async () => {
  const { infiniteQueryOptions, queryOptions } = await import(
    "@tanstack/react-query"
  );
  return {
    markFeatureHighlightsSeen: mocks.markSeen,
    unseenFeatureHighlightsQueryOptions: (userId: string | null) =>
      queryOptions({
        queryKey: ["feature-highlights", "unseen", userId],
        queryFn: mocks.loadUnseen,
        enabled: !!userId,
      }),
    featureHighlightTimelineQueryOptions: (userId: string | null) =>
      infiniteQueryOptions({
        queryKey: ["feature-highlights", "timeline", userId],
        queryFn: ({ pageParam }) => mocks.loadTimelinePage(pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage: FeatureHighlightTimelinePage) =>
          lastPage.nextBefore,
      }),
  };
});

function highlightOf(id: string, title: string, publishedAt: string): FeatureHighlight {
  return {
    id,
    source: "admin",
    publishedAt,
    slides: [
      {
        title: { kind: "literal", value: title },
        body: { kind: "literal", value: `${title} body` },
        media: {
          type: "video",
          url: `https://example.com/${id}.mp4`,
          posterUrl: null,
          altText: { kind: "literal", value: `${title} video` },
        },
        link: null,
      },
    ],
  };
}

const newest = highlightOf("h-3", "Faster search", "2026-11-15T12:00:00.000Z");
const middle = highlightOf("h-2", "Bulk edit", "2026-11-10T12:00:00.000Z");
const older = highlightOf("h-1", "Price labels", "2026-11-01T12:00:00.000Z");
const oldest = highlightOf("h-0", "Old news", "2026-10-01T12:00:00.000Z");

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FeatureHighlightsButton />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  mocks.loadUnseen.mockResolvedValue({
    highlights: [newest, middle],
    seenHighlightIds: [],
  });
  mocks.loadTimelinePage.mockResolvedValue({
    highlights: [newest, middle, older, oldest],
    seenHighlightIds: ["h-1", "h-0"],
    nextBefore: null,
  });
  mocks.markSeen.mockResolvedValue(undefined);
});

describe("FeatureHighlightsButton", () => {
  it("names the unseen count on the button", async () => {
    renderButton();
    expect(
      await screen.findByRole("button", {
        name: "featureHighlights.triggerWithCount(count=2)",
      }),
    ).toBeInTheDocument();
  });

  it("lists the three newest highlights, marks only the unseen ones seen and keeps their badges", async () => {
    renderButton();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "featureHighlights.triggerWithCount(count=2)",
      }),
    );
    const popover = await screen.findByRole("region", {
      name: "featureHighlights.title",
    });
    await within(popover).findByRole("article", { name: "Faster search" });
    expect(within(popover).getAllByRole("article")).toHaveLength(3);
    expect(within(popover).queryByRole("article", { name: "Old news" })).toBeNull();
    expect(within(popover).getByText("Bulk edit body")).toBeInTheDocument();
    const video = within(popover).getByLabelText("Faster search video") as HTMLVideoElement;
    expect(video.autoplay).toBe(false);
    expect(video.controls).toBe(true);

    await waitFor(() => expect(mocks.markSeen).toHaveBeenCalledTimes(1));
    expect(mocks.markSeen.mock.calls[0]?.[0]).toEqual(["h-3", "h-2"]);
    const newBadges = within(popover).getAllByText("featureHighlights.timeline.new");
    expect(newBadges).toHaveLength(2);
    expect(
      within(
        within(popover).getByRole("article", { name: "Price labels" }),
      ).queryByText("featureHighlights.timeline.new"),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "featureHighlights.title" }),
    ).toBeInTheDocument();
  });

  it("links to the full history", async () => {
    renderButton();
    fireEvent.click(await screen.findByRole("button", { name: /featureHighlights/ }));
    const popover = await screen.findByRole("region", {
      name: "featureHighlights.title",
    });
    expect(
      within(popover).getByText("featureHighlights.seeAll").closest("a"),
    ).toHaveAttribute("href", "/app/whats-new");
  });
});
