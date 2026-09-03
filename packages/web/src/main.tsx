import { router } from "@/app/router";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";
import "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

// NeonAuthUIProvider (which used to provide theming) is now scoped to just
// /auth/* and /app/* for bundle size, so public pages - and local mode,
// which has no NeonAuthUIProvider equivalent at all - need their own
// lightweight theme provider here instead.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
