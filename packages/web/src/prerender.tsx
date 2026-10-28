import { AppShell } from "@/app/app-shell";
import { routes } from "@/app/router";
import {
  CLIENT_RENDERED_BOUNDARY_MARKER,
  PRERENDER_MAX_PASSES,
  PRERENDER_PASS_DELAY_MS,
} from "@/lib/constants/seo";
import { i18nReady } from "@/lib/i18n";
export { prerenderEnvSignature } from "@/lib/prerender-env";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

function renderRoute(path: string): string {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return renderToString(
    <StrictMode>
      <AppShell>
        <RouterProvider router={router} />
      </AppShell>
    </StrictMode>,
  );
}

export async function renderMarketingPage(path: string): Promise<string> {
  await i18nReady;
  for (let pass = 1; pass <= PRERENDER_MAX_PASSES; pass++) {
    const html = renderRoute(path);
    if (!html.includes(CLIENT_RENDERED_BOUNDARY_MARKER)) return html;
    await new Promise((resolve) => setTimeout(resolve, PRERENDER_PASS_DELAY_MS));
  }
  const failure = renderRoute(path).match(/data-msg="([^"]*)"/)?.[1];
  throw new Error(
    `Prerendering ${path} left a Suspense boundary unresolved: ${failure ?? "no message"}`,
  );
}
