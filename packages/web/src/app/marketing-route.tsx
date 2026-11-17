import { LAZY_MARKETING_PAGES } from "@/app/marketing-pages";
import type { MarketingRouteProps } from "@/lib/interfaces/seo";
import { Suspense } from "react";

export function MarketingRoute({ path }: MarketingRouteProps) {
  const Page = LAZY_MARKETING_PAGES[path];
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}
