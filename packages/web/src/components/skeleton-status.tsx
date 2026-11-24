import type { SkeletonStatusProps } from "@/lib/interfaces/skeletons";
import { useTranslation } from "react-i18next";

export function SkeletonStatus({ className, children }: SkeletonStatusProps) {
  const { t } = useTranslation("common");
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t("a11y.loading")}</span>
      {children}
    </div>
  );
}
