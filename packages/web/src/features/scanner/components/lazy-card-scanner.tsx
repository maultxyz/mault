import { Skeleton } from "@/components/ui/skeleton";
import type { CardScannerComponentProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { lazy, Suspense } from "react";

const CardScanner = lazy(() =>
  import("@/features/scanner/components/card-scanner").then((module) => ({
    default: module.CardScanner,
  })),
);

export function LazyCardScanner(props: CardScannerComponentProps) {
  return (
    <Suspense
      fallback={
        <Skeleton className={cn("aspect-4/3 rounded-lg", props.className)} />
      }
    >
      <CardScanner {...props} />
    </Suspense>
  );
}
