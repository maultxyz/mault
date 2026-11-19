import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FeatureHighlight,
  FeatureHighlightTimelinePage,
} from "@magic-vault/shared";
import WhatsNewPage from "./whats-new";

const translations: Record<string, string> = {
  "featureHighlights.release.languageSearch.title": "Search in every language",
  "featureHighlights.release.languageSearch.body": "English names now find foreign printings.",
};

const mocks = vi.hoisted(() => ({
  loadTimelinePage: vi.fn(),
  markSeen: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en-US" },
    t: (key: string, options?: Record<string, unknown>) =>
      translations[key] ??
      (options
        ? `${key}(${Object.entries(options)
            .map(([name, value]) => `${name}=${value}`)
            .join(",")})`
        : key),
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

const translatedHighlight: FeatureHighlight = {
  id: "release-language",
  source: "release",
  publishedAt: "2026-11-15T12:00:00.000Z",
  slides: [
    {
      title: { kind: "translated", key: "featureHighlights.release.languageSearch.title" },
      body: { kind: "translated", key: "featureHighlights.release.languageSearch.body" },
      media: null,
      link: null,
    },
  ],
};

function literalHighlight(id: string, title: string, publishedAt: string): FeatureHighlight {
  return {
    id,
    source: "admin",
    publishedAt,
    slides: [
      {
        title: { kind: "literal", value: title },
        body: { kind: "literal", value: `${title} details` },
        media: null,
        link: null,
      },
    ],
  };
}

const bulkEdit = literalHighlight("bulk-edit", "Bulk edit cards", "2026-11-10T12:00:00.000Z");
const priceLabels = literalHighlight("price-labels", "Price labels", "2026-10-12T12:00:00.000Z");

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(initialEntry = "/app/whats-new") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <WhatsNewPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function searchField() {
  return screen.getByRole("searchbox", {
    name: "featureHighlights.search.label",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  mocks.markSeen.mockResolvedValue(undefined);
  mocks.loadTimelinePage.mockImplementation((before: string | null) =>
    Promise.resolve(
      before === null
        ? {
            highlights: [translatedHighlight, bulkEdit],
            seenHighlightIds: ["release-language", "bulk-edit"],
            nextBefore: "2026-11-10T12:00:00.000Z|bulk-edit",
          }
        : {
            highlights: [priceLabels],
            seenHighlightIds: ["price-labels"],
            nextBefore: null,
          },
    ),
  );
});

describe("What's new search", () => {
  it("hides the search field until highlights have loaded", async () => {
    renderPage();
    expect(screen.queryByRole("searchbox")).toBeNull();
    await screen.findByRole("article", { name: "Search in every language" });
    expect(searchField()).toBeInTheDocument();
  });

  it("filters by translated text, loads the remaining pages and announces the count", async () => {
    renderPage();
    await screen.findByRole("article", { name: "Search in every language" });
    expect(mocks.loadTimelinePage).toHaveBeenCalledTimes(1);

    fireEvent.change(searchField(), { target: { value: "foreign PRINTINGS" } });
    await waitFor(() => expect(mocks.loadTimelinePage).toHaveBeenCalledTimes(2));
    expect(mocks.loadTimelinePage).toHaveBeenLastCalledWith(
      "2026-11-10T12:00:00.000Z|bulk-edit",
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "featureHighlights.search.resultsCount(count=1)",
      ),
    );
    expect(
      screen.getByRole("article", { name: "Search in every language" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Bulk edit cards" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "featureHighlights.timeline.loadMore" }),
    ).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "?q=foreign+PRINTINGS",
      ),
    );
  });

  it("filters by literal text on later pages and keeps month grouping", async () => {
    renderPage();
    await screen.findByRole("article", { name: "Search in every language" });
    fireEvent.change(searchField(), { target: { value: "labels price" } });
    const october = await screen.findByRole("region", { name: "October 2026" });
    expect(
      within(october).getByRole("article", { name: "Price labels" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "November 2026" })).toBeNull();
  });

  it("shows a no results state that clears the search", async () => {
    renderPage();
    await screen.findByRole("article", { name: "Search in every language" });
    fireEvent.change(searchField(), { target: { value: "spaceships" } });
    expect(
      await screen.findByText(
        "featureHighlights.search.noMatches(query=spaceships)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "featureHighlights.search.resultsCount(count=0)",
    );
    const emptyStateClear = screen
      .getAllByRole("button", { name: "featureHighlights.search.clear" })
      .find((button) => !button.closest("[data-slot=input-group]"));
    fireEvent.click(emptyStateClear!);
    expect(searchField()).toHaveValue("");
    expect(
      await screen.findByRole("article", { name: "Bulk edit cards" }),
    ).toBeInTheDocument();
  });

  it("clears the field with the clear button", async () => {
    renderPage();
    await screen.findByRole("article", { name: "Search in every language" });
    fireEvent.change(searchField(), { target: { value: "bulk" } });
    fireEvent.click(
      screen.getByRole("button", { name: "featureHighlights.search.clear" }),
    );
    expect(searchField()).toHaveValue("");
  });

  it("loads pages until the highlight from the popup is found, then focuses it and drops the param", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderPage("/app/whats-new?highlight=price-labels");
    const entry = await screen.findByRole("article", { name: "Price labels" });
    expect(mocks.loadTimelinePage).toHaveBeenLastCalledWith(
      "2026-11-10T12:00:00.000Z|bulk-edit",
    );
    await waitFor(() => expect(entry).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
    await waitFor(() => expect(screen.getByTestId("location")).toBeEmptyDOMElement());
  });

  it("drops an unknown highlight param after loading every page", async () => {
    renderPage("/app/whats-new?highlight=deleted");
    await screen.findByRole("article", { name: "Search in every language" });
    await waitFor(() => expect(mocks.loadTimelinePage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("location")).toBeEmptyDOMElement());
  });

  it("restores the search from the q parameter", async () => {
    renderPage("/app/whats-new?q=bulk");
    expect(await screen.findByRole("searchbox", {
      name: "featureHighlights.search.label",
    })).toHaveValue("bulk");
    expect(
      await screen.findByRole("article", { name: "Bulk edit cards" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "featureHighlights.search.resultsCount(count=1)",
      ),
    );
    expect(
      screen.queryByRole("article", { name: "Search in every language" }),
    ).toBeNull();
  });
});
