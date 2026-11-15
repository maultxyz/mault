import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import type { LoadErrorCalloutProps } from "@/lib/interfaces/callout";
import { useTranslation } from "react-i18next";

export function LoadErrorCallout({
  message,
  onRetry,
  className,
}: LoadErrorCalloutProps) {
  const { t } = useTranslation("common");
  return (
    <Callout
      variant="error"
      className={className}
      action={
        <Button variant="outline" onClick={onRetry}>
          {t("a11y.retry")}
        </Button>
      }
    >
      {message}
    </Callout>
  );
}
