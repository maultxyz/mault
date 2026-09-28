import { Button } from "@/components/ui/button";
import { anchorUrl } from "@/features/build/lib/anchors";
import type { AnchorLinkButtonProps } from "@/lib/interfaces/build";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { IconLink } from "@tabler/icons-react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

export function AnchorLinkButton({ id, className }: AnchorLinkButtonProps) {
  const { t } = useTranslation("build");

  const handleClick = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const url = anchorUrl(id);
    window.history.replaceState(window.history.state, "", url);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("anchorLink.copied"));
    } catch {
      toast.error(t("anchorLink.copyFailed"));
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={(event) => void handleClick(event)}
      aria-label={t("anchorLink.copy")}
      title={t("anchorLink.copy")}
      className={cn(
        "shrink-0 text-foreground/70 hover:text-foreground md:opacity-0 md:group-hover/anchor:opacity-100 focus-visible:opacity-100",
        className,
      )}
    >
      <IconLink />
    </Button>
  );
}
