import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { SortingModeToggleRowProps } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";
import { IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SortingModeToggleRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
  badge,
  className,
  dataTour,
}: SortingModeToggleRowProps) {
  const { t } = useTranslation("bins");
  const isMobile = useIsMobile();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const toggle = (
    <Switch
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    />
  );

  if (isMobile) {
    return (
      <div
        className={cn("flex flex-col gap-1", className)}
        data-tour={dataTour}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {badge}
            <button
              type="button"
              aria-expanded={isDescriptionOpen}
              aria-label={t("sortingModePanel.explain", { mode: label })}
              onClick={() => setIsDescriptionOpen((open) => !open)}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-md text-foreground/70 transition-colors active:bg-muted",
                isDescriptionOpen && "text-primary",
              )}
            >
              <IconInfoCircle className="size-4" />
            </button>
          </span>
          {toggle}
        </div>
        {isDescriptionOpen && (
          <p className="text-xs text-foreground/70 animate-in fade-in-0 motion-reduce:animate-none">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-between gap-3", className)}
      data-tour={dataTour}
    >
      <span className="flex items-center gap-1.5">
        <span className="text-xs font-medium">{label}</span>
        {badge}
        <Tooltip>
          <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
            <IconInfoCircle className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{description}</TooltipContent>
        </Tooltip>
      </span>
      {toggle}
    </div>
  );
}
