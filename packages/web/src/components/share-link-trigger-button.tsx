import { Button } from "@/components/ui/button";
import type { ShareLinkTriggerButtonProps } from "@/lib/interfaces/share-links";
import { cn } from "@/lib/utils";
import { IconShare } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ShareLinkTriggerButton({
  label,
  activeLinkCount,
  showsTitle = false,
  className,
  ...buttonProps
}: ShareLinkTriggerButtonProps) {
  const { t } = useTranslation("common");
  const accessibleLabel =
    activeLinkCount > 0
      ? t("shareLink.triggerWithCount", { label, count: activeLinkCount })
      : label;

  return (
    <Button
      {...buttonProps}
      className={cn("relative", className)}
      aria-label={accessibleLabel}
      title={showsTitle ? accessibleLabel : undefined}
    >
      <IconShare />
      {activeLinkCount > 0 && (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs leading-none font-semibold text-primary-foreground ring-2 ring-background"
        >
          {activeLinkCount}
        </span>
      )}
    </Button>
  );
}
