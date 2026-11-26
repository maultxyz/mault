import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import type { QueryObserverOptions } from "@tanstack/react-query";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import { apiGet } from "@/lib/api/client";
import {
  binCardCountsQueryOptions, collectionCardGridPageQueryOptions, collectionCardPositionQueryOptions,
  collectionCardsCountQueryOptions, collectionCardsPageQueryOptions, collectionCardsSummaryQueryOptions,
  loadBinContents, loadCollectionCardIds, scanTimelineBucketsQueryOptions, scanTimelineCardsQueryOptions,
  unmatchedCardsPageQueryOptions,
} from "./collection-cards";

const mocks = vi.hoisted(() => ({ session: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ neon: { auth: { signOut: vi.fn() } } }));
vi.mock("@/lib/auth/session", () => ({ getAuthSession: mocks.session, refreshAuthTokenRejectedByApi: mocks.refresh, getOrgId: () => "test-org" }));
vi.mock("@/lib/auth/impersonation", () => ({ getImpersonationState: () => null, clearImpersonation: vi.fn() }));

const query = { search: "", sort: null, filters: EMPTY_CARD_FILTERS, grouped: false };
const clients: QueryClient[] = [];

function pendingRequest(input: RequestInfo | URL, init?: RequestInit) {
  const signal = init?.signal;
  if (!signal) throw new Error("Expected a cancellable request");
  let resolve!: (response: Response) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Response>((yes, no) => { resolve = yes; reject = no; });
  const abort = () => reject(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  return {
    url: String(input), signal, promise,
    respond(data: unknown) {
      signal.removeEventListener("abort", abort);
      resolve(new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json" } }));
    },
  };
}

function client() {
  const value = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(value);
  return value;
}

beforeEach(() => {
  mocks.session.mockReset().mockResolvedValue({ token: "test-token" });
  mocks.refresh.mockReset().mockResolvedValue("fresh-token");
});
afterEach(() => {
  for (const value of clients.splice(0)) value.clear();
  vi.unstubAllGlobals();
});

describe("collection read cancellation", () => {
  it("repeated invalidations abort superseded cached-summary HTTP fetches and accept the healthy replacement", async () => {
    const requests: ReturnType<typeof pendingRequest>[] = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = pendingRequest(input, init); requests.push(request); return request.promise;
    }));
    const cache = client();
    const options = collectionCardsSummaryQueryOptions("collection", query);
    cache.setQueryData<unknown>(options.queryKey, { cached: true });
    const observer = new QueryObserver(cache, { ...options, refetchOnMount: false });
    const stop = observer.subscribe(() => {});
    const refreshes: Promise<void>[] = [];
    for (let i = 0; i < 6; i++) {
      refreshes.push(cache.invalidateQueries({ queryKey: options.queryKey, exact: true }));
      await vi.waitFor(() => expect(requests).toHaveLength(i + 1));
      for (const old of requests.slice(0, -1)) expect(old.signal.aborted).toBe(true);
      expect(requests.at(-1)?.signal.aborted).toBe(false);
    }
    const fresh = { isRefreshing: false, marker: "healthy" };
    requests.at(-1)!.respond(fresh);
    await Promise.all(refreshes);
    expect(cache.getQueryData(options.queryKey)).toEqual(fresh);
    stop();
  });

  it.each([
    ["page", () => collectionCardsPageQueryOptions("collection", query, 1)],
    ["grid", () => collectionCardGridPageQueryOptions("collection", query, 1, 20, true)],
    ["summary", () => collectionCardsSummaryQueryOptions("collection", query)],
    ["count", () => collectionCardsCountQueryOptions("collection", query)],
    ["position", () => collectionCardPositionQueryOptions("collection", "scan", query)],
    ["bins", () => binCardCountsQueryOptions("collection", [{ binNumber: 1, lastEmptiedAt: null }])],
    ["timeline", () => scanTimelineCardsQueryOptions("collection", query)],
    ["timeline buckets", () => scanTimelineBucketsQueryOptions("collection", query, "day", "UTC")],
    ["unmatched", () => unmatchedCardsPageQueryOptions("collection", 1)],
  ] as const)("unmounting cancels the actual %s HTTP request", async (_name, factory) => {
    const requests: ReturnType<typeof pendingRequest>[] = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = pendingRequest(input, init); requests.push(request); return request.promise;
    }));
    const cache = client();
    const observer = new QueryObserver<unknown>(cache, factory() as unknown as QueryObserverOptions<unknown>);
    const stop = observer.subscribe(() => {});
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    stop();
    expect(requests[0].signal.aborted).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(requests).toHaveLength(1);
  });

  it("passes optional cancellation through ID and bin-content loaders", async () => {
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: [] })));
    }));
    const controller = new AbortController();
    expect(await loadCollectionCardIds("collection", query, controller.signal)).toEqual([]);
    expect(await loadBinContents("collection", [], controller.signal)).toEqual([]);
  });
});

describe("apiGet abort boundaries", () => {
  it("never starts fetch when cancellation occurs during authentication", async () => {
    let finishAuth!: (session: { token: string }) => void;
    mocks.session.mockReturnValueOnce(new Promise((resolve) => { finishAuth = resolve; }));
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    const request = apiGet("/read", { signal: controller.signal });
    const rejected = expect(request).rejects.toMatchObject({ name: "AbortError" });
    controller.abort(); finishAuth({ token: "test-token" });
    await rejected;
    expect(fetch).not.toHaveBeenCalled();
  });

  it("aborts an in-progress response body and rejects the read", async () => {
    let bodyCancelled = false;
    const controller = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(new TextEncoder().encode('{"pending":'));
        controller.signal.addEventListener("abort", () => { bodyCancelled = true; stream.error(controller.signal.reason); }, { once: true });
      },
    });
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return new Response(body, { headers: { "Content-Type": "application/json" } });
    }));
    const pending = apiGet("/read", { signal: controller.signal });
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(body.locked).toBe(true));
    controller.abort();
    await rejected;
    expect(bodyCancelled).toBe(true);
  });

  it("preserves existing callers without options", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"value":1}')));
    expect(await apiGet("/read")).toEqual({ value: 1 });
  });
});

describe("authenticated collection read retries", () => {
  it("retains cancellation and refreshed authentication on a 401 retry", async () => {
    const controller = new AbortController();
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ refreshed: true })));
    vi.stubGlobal("fetch", fetch);
    await expect(apiGet("/collections", { signal: controller.signal })).resolves.toEqual({ refreshed: true });
    expect(mocks.refresh).toHaveBeenCalledWith("test-token");
    expect(fetch.mock.calls[1][1].signal).toBe(controller.signal);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer fresh-token");
  });

  it("does not send a retry when cancelled during token refresh", async () => {
    const controller = new AbortController();
    mocks.refresh.mockImplementation(async () => {
      controller.abort();
      return "fresh-token";
    });
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    await expect(apiGet("/collections", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
