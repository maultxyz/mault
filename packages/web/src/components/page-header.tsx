import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import type { PageHeaderProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  tabs,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b bg-background/80 backdrop-blur-2xl",
        !tabs && "pb-2.5",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2.5 px-4 pt-2.5 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
            {description && (
              <p className="text-xs text-foreground/70">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
        {children}
        {tabs}
      </div>
    </div>
  );
}
