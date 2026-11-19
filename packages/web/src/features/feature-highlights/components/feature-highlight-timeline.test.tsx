import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FeatureHighlight,
  FeatureHighlightTimelinePage,
} from "@magic-vault/shared";
import { FeatureHighlightTimeline } from "./feature-highlight-timeline";

const mocks = vi.hoisted(() => ({
  loadTimelinePage: vi.fn(),
  markSeen: vi.fn(),
  isImpersonating: false,
  observers: [] as Array<{
    callback: IntersectionObserverCallback;
    elements: Set<Element>;
  }>,
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
vi.mock("@/hooks/use-impersonation", () => ({
  useImpersonation: () => ({ isImpersonating: mocks.isImpersonating }),
}));
vi.mock("@/lib/auth", () => ({
  useAuthSession: () => ({ data: { user: { id: "user-1" } } }),
}));
vi.mock("@/features/feature-highlights/api/feature-highlights", async () => {
  const { infiniteQueryOptions } = await import("@tanstack/react-query");
  return {
    markFeatureHighlightsSeen: mocks.markSeen,
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

function highlightOf(
  id: string,
  title: string,
  publishedAt: string,
  extraSlides: FeatureHighlight["slides"] = [],
): FeatureHighlight {
  return {
    id,
    source: "admin",
    publishedAt,
    slides: [
      {
        title: { kind: "literal", value: title },
        body: { kind: "literal", value: `${title} body` },
        media: null,
        link: null,
      },
      ...extraSlides,
    ],
  };
}

const novemberUnseen = highlightOf(
  "h-nov-2",
  "Faster search",
  "2026-11-15T12:00:00.000Z",
  [
    {
      title: { kind: "literal", value: "Search demo" },
      body: { kind: "literal", value: "Watch it work" },
      media: {
        type: "video",
        url: "https://example.com/search.mp4",
        posterUrl: "https://example.com/search.jpg",
        altText: { kind: "literal", value: "Searching for a card" },
      },
      link: {
        url: "https://example.com/search-docs",
        label: { kind: "literal", value: "Read the docs" },
      },
    },
  ],
);
const novemberSeen = highlightOf("h-nov-1", "Bulk edit", "2026-11-10T12:00:00.000Z");
const october = highlightOf("h-oct", "Price labels", "2026-10-12T12:00:00.000Z");

function pageOf(
  highlights: FeatureHighlight[],
  seenHighlightIds: string[],
  nextBefore: string | null,
): FeatureHighlightTimelinePage {
  return { highlights, seenHighlightIds, nextBefore };
}

function articleOf(title: string): HTMLElement {
  return screen.getByRole("article", { name: title });
}

function showEntry(element: Element) {
  act(() => {
    for (const observer of mocks.observers) {
      if (!observer.elements.has(element)) continue;
      observer.callback(
        [
          {
            target: element,
            isIntersecting: true,
            intersectionRatio: 0.6,
            intersectionRect: { height: 300 } as DOMRectReadOnly,
            rootBounds: { height: 800 } as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    }
  });
}

function renderTimeline() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FeatureHighlightTimeline
          searchText=""
          onSearchTextChange={() => {}}
          searchQuery=""
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isImpersonating = false;
  mocks.observers = [];
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  globalThis.IntersectionObserver = class {
    private readonly record;
    constructor(callback: IntersectionObserverCallback) {
      this.record = { callback, elements: new Set<Element>() };
      mocks.observers.push(this.record);
    }
    observe(element: Element) {
      this.record.elements.add(element);
    }
    unobserve(element: Element) {
      this.record.elements.delete(element);
    }
    disconnect() {
      this.record.elements.clear();
    }
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  mocks.markSeen.mockResolvedValue(undefined);
});

describe("FeatureHighlightTimeline", () => {
  it("groups highlights under one heading per month", async () => {
    mocks.loadTimelinePage.mockResolvedValue(
      pageOf([novemberUnseen, novemberSeen, october], ["h-nov-1", "h-oct"], null),
    );
    renderTimeline();
    const november = await screen.findByRole("region", { name: "November 2026" });
    const octoberSection = screen.getByRole("region", { name: "October 2026" });
    expect(within(november).getAllByRole("article")).toHaveLength(2);
    expect(within(octoberSection).getAllByRole("article")).toHaveLength(1);
    expect(
      within(november).getByText("Nov 15, 2026").closest("time"),
    ).toHaveAttribute("dateTime", "2026-11-15T12:00:00.000Z");
  });

  it("renders every slide inline with playable, non autoplaying video", async () => {
    mocks.loadTimelinePage.mockResolvedValue(pageOf([novemberUnseen], [], null));
    renderTimeline();
    const entry = await screen.findByRole("article", { name: "Faster search" });
    expect(within(entry).getByRole("heading", { name: "Faster search" })).toBeInTheDocument();
    expect(within(entry).getByText("Faster search body")).toBeInTheDocument();
    expect(within(entry).getByRole("heading", { name: "Search demo" })).toBeInTheDocument();
    expect(within(entry).getByText("Watch it work")).toBeInTheDocument();
    expect(
      within(entry).getByLabelText(/Read the docs/),
    ).toHaveAttribute("href", "https://example.com/search-docs");
    const video = within(entry).getByLabelText("Searching for a card") as HTMLVideoElement;
    expect(video.autoplay).toBe(false);
    expect(video.controls).toBe(true);
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).toHaveAttribute("poster", "https://example.com/search.jpg");
    expect(entry.tagName).toBe("ARTICLE");
    expect(entry.closest("button")).toBeNull();
  });

  it("marks an unseen highlight seen once it has been on screen and keeps its New badge", async () => {
    mocks.loadTimelinePage.mockResolvedValue(
      pageOf([novemberUnseen, novemberSeen], ["h-nov-1"], null),
    );
    renderTimeline();
    await screen.findByRole("article", { name: "Faster search" });
    expect(
      within(articleOf("Faster search")).getByText("featureHighlights.timeline.new"),
    ).toBeInTheDocument();
    expect(
      within(articleOf("Bulk edit")).queryByText("featureHighlights.timeline.new"),
    ).toBeNull();

    showEntry(articleOf("Faster search"));
    showEntry(articleOf("Bulk edit"));
    await waitFor(
      () => expect(mocks.markSeen.mock.calls[0]?.[0]).toEqual(["h-nov-2"]),
      { timeout: 3000 },
    );
    expect(mocks.markSeen).toHaveBeenCalledTimes(1);
    expect(
      within(articleOf("Faster search")).getByText("featureHighlights.timeline.new"),
    ).toBeInTheDocument();
  });

  it("never marks highlights seen while impersonating", async () => {
    mocks.isImpersonating = true;
    mocks.loadTimelinePage.mockResolvedValue(pageOf([novemberUnseen], [], null));
    renderTimeline();
    await screen.findByRole("article", { name: "Faster search" });
    showEntry(articleOf("Faster search"));
    await new Promise((resolve) => setTimeout(resolve, 1700));
    expect(mocks.markSeen).not.toHaveBeenCalled();
  });

  it("loads the next page with the cursor from Load more", async () => {
    mocks.loadTimelinePage.mockImplementation((before: string | null) =>
      Promise.resolve(
        before === null
          ? pageOf([novemberSeen], ["h-nov-1"], "2026-11-10T12:00:00.000Z|h-nov-1")
          : pageOf([october], ["h-oct"], null),
      ),
    );
    renderTimeline();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "featureHighlights.timeline.loadMore",
      }),
    );
    expect(
      await screen.findByRole("region", { name: "October 2026" }),
    ).toBeInTheDocument();
    expect(mocks.loadTimelinePage).toHaveBeenLastCalledWith(
      "2026-11-10T12:00:00.000Z|h-nov-1",
    );
    expect(
      screen.queryByRole("button", { name: "featureHighlights.timeline.loadMore" }),
    ).toBeNull();
  });

  it("shows the empty state when nothing was published", async () => {
    mocks.loadTimelinePage.mockResolvedValue(pageOf([], [], null));
    renderTimeline();
    expect(
      await screen.findByText("featureHighlights.timeline.empty"),
    ).toBeInTheDocument();
  });
});
