import { AppShell } from "@/app/app-shell";
import { loadMarketingPage } from "@/app/marketing-pages";
import { routes } from "@/app/router";
import "@/index.css";
import { i18nReady, initialLanguage } from "@/lib/i18n";
import { trimTrailingSlashes } from "@/lib/pathname";
import { loadPiHost } from "@/lib/pi-host";
import { prerenderEnvSignature } from "@/lib/prerender-env";
import { registerServiceWorker } from "@/lib/pwa";
import "@/lib/rollbar";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

performance.mark("app:modules-evaluated");
registerServiceWorker();
void loadPiHost();

const rootElement = document.getElementById("root")!;
const router = createBrowserRouter(routes);
const app = (
  <StrictMode>
    <AppShell>
      <RouterProvider router={router} />
    </AppShell>
  </StrictMode>
);

const prerenderedPath = rootElement.dataset.prerenderedPath;
const canHydrate =
  !!prerenderedPath &&
  rootElement.hasChildNodes() &&
  prerenderedPath === trimTrailingSlashes(location.pathname) &&
  initialLanguage === "en" &&
  rootElement.dataset.prerenderedEnv === prerenderEnvSignature();

if (canHydrate) {
  void Promise.all([i18nReady, loadMarketingPage(prerenderedPath)]).then(() =>
    hydrateRoot(rootElement, app),
  );
} else {
  createRoot(rootElement).render(app);
}
