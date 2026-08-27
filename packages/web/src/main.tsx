import { router } from "@/app/router";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";
import "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

// Used to live on NeonAuthUIProvider's own defaultTheme prop, back when
// that wrapped the whole app - now that it's scoped to just /auth/* and
// /app/* (see auth.tsx, auth-guard.neon.tsx) for bundle size, dark mode
// needs its own lightweight provider here so public pages get it too. This
// covers local mode too - own-auth has no NeonAuthUIProvider equivalent, and
// local mode's own screens (see app/routes/auth-local.tsx) don't need a
// wrapping provider at all, so this ThemeProvider is the only one they need.
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
