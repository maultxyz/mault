import { router } from "@/app/router";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";
import "@/lib/i18n";
import "@/lib/rollbar";
import { ThemeProvider } from "next-themes";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

// No branded fallback here - this Suspense boundary catches every lazy
// route chunk in the app, including the public landing/marketing pages,
// and those shouldn't flash the full "Loading your vault" screen. The
// branded AppLoadingScreen is reserved for the /app/* portion - see the
// Suspense boundary around AuthGuard in app/router.tsx.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
