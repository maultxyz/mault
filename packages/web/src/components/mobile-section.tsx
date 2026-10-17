import { MOBILE_SECTION_CLASS, MOBILE_SECTION_LABEL_CLASS } from "@/lib/constants/nav";
import type { MobileSectionProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function MobileSection({
  title,
  action,
  children,
  className,
}: MobileSectionProps) {
  return (
    <section className={cn(MOBILE_SECTION_CLASS, className)}>
      {(title || action) && (
        <div className="flex min-h-9 items-center justify-between gap-3">
          {title && <h2 className={MOBILE_SECTION_LABEL_CLASS}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
