import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { UnmatchedDiagnosticsDetails } from "@/features/scanner/components/unmatched-diagnostics-details";
import type { UnmatchedCardsGridDialogProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import type { UnmatchedCard } from "@magic-vault/shared";
import { IconPhotoOff, IconSearch, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardsGridDialog({
  open,
  onOpenChange,
  cards,
  onRemove,
  onIdentify,
}: UnmatchedCardsGridDialogProps) {
  const { t } = useTranslation("scanner");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    cards.find((entry) => entry.scanId === selectedId) ?? cards[0] ?? null;

  const cardImage = (entry: UnmatchedCard, className?: string) => (
    <div
      className={cn(
        "aspect-[2.5/3.5] w-full overflow-hidden rounded-md border bg-muted",
        className,
      )}
    >
      {entry.capturedImageUrl ? (
        <img
          src={entry.capturedImageUrl}
          alt={t("unmatchedCardsPanel.imageAlt")}
          className="h-full w-full object-fill"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <IconPhotoOff className="size-5 text-foreground/70" />
        </div>
      )}
    </div>
  );

  return (
    <DynamicDialog
      open={open && cards.length > 0}
      onOpenChange={onOpenChange}
      title={t("unmatchedCardsPanel.gridTitle")}
      description={t("unmatchedCardsPanel.gridDescription")}
      className="sm:max-w-6xl md:h-[85dvh] data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t pt-4 md:flex-row md:overflow-hidden">
        <div className="grid flex-none grid-cols-3 content-start gap-2 sm:grid-cols-4 md:min-h-0 md:flex-1 md:grid-cols-4 md:overflow-y-auto md:p-0.5 lg:grid-cols-5">
          {cards.map((entry) => {
            const nearest = entry.diagnostics?.search?.candidates[0];
            const isSelected = entry.scanId === selected?.scanId;
            return (
              <button
                key={entry.scanId}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(entry.scanId)}
                className={cn(
                  "flex min-w-0 flex-col gap-1 rounded-md p-1 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected && "bg-muted ring-2 ring-primary",
                )}
              >
                {cardImage(entry)}
                {entry.diagnostics && (
                  <span className="truncate text-xs font-medium">
                    {t(
                      `unmatchedCardsPanel.reasons.${entry.diagnostics.reason}`,
                    )}
                  </span>
                )}
                {nearest && (
                  <span className="truncate text-2xs text-foreground/70">
                    {t("unmatchedCardsPanel.gridNearest", {
                      name: nearest.name,
                    })}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="flex flex-none flex-col gap-3 md:order-first md:w-72 md:overflow-y-auto md:border-r md:pr-4">
            {cardImage(selected, "mx-auto max-w-56 md:max-w-none")}
            {selected.diagnostics ? (
              <UnmatchedDiagnosticsDetails
                diagnostics={selected.diagnostics}
                className="w-full px-0"
              />
            ) : (
              !selected.capturedImageUrl && (
                <p className="text-sm text-foreground/70">
                  {t("unmatchedCardsPanel.noImage")}
                </p>
              )
            )}
            {(onIdentify || onRemove) && (
              <div className="flex gap-2">
                {onIdentify && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      onOpenChange(false);
                      onIdentify(selected);
                    }}
                  >
                    <IconSearch />
                    {t("unmatchedCardsPanel.identify")}
                  </Button>
                )}
                {onRemove && (
                  <Button
                    variant="outline"
                    onClick={() => onRemove(selected.scanId)}
                  >
                    <IconTrash />
                    {t("unmatchedCardsPanel.remove")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DynamicDialog>
  );
}
