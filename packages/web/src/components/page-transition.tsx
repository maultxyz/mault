import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 min-h-0 flex-col">{children}</div>;
}
