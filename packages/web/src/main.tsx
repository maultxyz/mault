import { router } from "@/app/router";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";
import "@/lib/i18n";
import "@/lib/rollbar";
import { ThemeProvider } from "next-themes";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

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
