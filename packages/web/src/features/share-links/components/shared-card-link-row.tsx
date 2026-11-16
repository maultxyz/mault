import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatShortDate } from "@/lib/format";
import type { SharedCardLinkRowProps } from "@/lib/interfaces/share-links";
import { cn } from "@/lib/utils";
import { IconCopy, IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function SharedCardLinkRow({ link, isRevoking, onCopy, onRevoke }: SharedCardLinkRowProps) {
  const { t } = useTranslation("share-links");
  const isMobile = useIsMobile();

  return (
    <div className={cn("flex items-center gap-3 py-2.5 text-sm", !isMobile && "px-3")}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-medium">{link.cardName}</p>
        <p className="truncate text-xs text-foreground/70">
          {[link.setCode?.toUpperCase(), t("created", { date: formatShortDate(link.createdAt) })]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("copyCardLink", { name: link.cardName })}
          onClick={() => onCopy(link)}
        >
          <IconCopy />
        </Button>
        <Button
          type="button"
          variant="destructive"
          aria-label={t("revokeCardLink", { name: link.cardName })}
          disabled={isRevoking}
          onClick={() => onRevoke(link)}
        >
          {isRevoking && <IconLoader2 className="animate-spin motion-reduce:animate-none" />}
          {t("revoke")}
        </Button>
      </div>
    </div>
  );
}
