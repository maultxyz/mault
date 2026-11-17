import { AppShell } from "@/app/app-shell";
import { loadMarketingPage, MARKETING_PAGE_MODULES } from "@/app/marketing-pages";
import { routes } from "@/app/router";
import { renderMarketingPage } from "@/prerender";
import { act, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sorter-model/sorter-scene", () => ({
  SorterScene: function SorterScene() {
    return new Proxy({}, { get: () => () => {} });
  },
}));

function headingText(html: string): string | null | undefined {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.querySelector("h1")?.textContent;
}

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }),
  });
});

describe("prerendered marketing pages", () => {
  for (const path of Object.keys(MARKETING_PAGE_MODULES)) {
    it(`hydrates ${path} without mismatches`, async () => {
      const container = document.createElement("div");
      const prerenderedHtml = await renderMarketingPage(path);
      container.innerHTML = prerenderedHtml;
      document.body.appendChild(container);
      await loadMarketingPage(path);
      const router = createMemoryRouter(routes, { initialEntries: [path] });
      const hydrationErrors: unknown[] = [];

      await act(async () => {
        hydrateRoot(
          container,
          <StrictMode>
            <AppShell>
              <RouterProvider router={router} />
            </AppShell>
          </StrictMode>,
          { onRecoverableError: (error) => hydrationErrors.push(error) },
        );
      });
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

      expect(hydrationErrors).toEqual([]);
      expect(headingText(prerenderedHtml)).toBeTruthy();
      expect(headingText(container.innerHTML)).toBe(headingText(prerenderedHtml));
      container.remove();
    }, 30_000);
  }
});
