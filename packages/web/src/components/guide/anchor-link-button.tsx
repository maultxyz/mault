import { Button } from "@/components/ui/button";
import { anchorUrl } from "@/lib/anchors";
import type { AnchorLinkButtonProps } from "@/lib/interfaces/guide";
import { cn } from "@/lib/utils";
import { IconLink } from "@tabler/icons-react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { copyWithToast } from "@/lib/clipboard";

export function AnchorLinkButton({ id, className }: AnchorLinkButtonProps) {
  const { t } = useTranslation("common");

  const handleClick = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const url = anchorUrl(id);
    window.history.replaceState(window.history.state, "", url);
    await copyWithToast(
      url,
      t("guide.anchorLink.copied"),
      t("guide.anchorLink.copyFailed"),
    );
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={(event) => void handleClick(event)}
      aria-label={t("guide.anchorLink.copy")}
      title={t("guide.anchorLink.copy")}
      className={cn(
        "shrink-0 text-foreground/70 hover:text-foreground md:opacity-0 md:group-hover/anchor:opacity-100 focus-visible:opacity-100",
        className,
      )}
    >
      <IconLink />
    </Button>
  );
}
