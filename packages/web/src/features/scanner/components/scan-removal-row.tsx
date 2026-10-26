import { FoilOverlay } from "@/components/foil-overlay";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { describeRemovalCopy } from "@/features/scanner/lib/scan-removal-labels";
import type { ScanRemovalRowProps } from "@/lib/interfaces/scan-removal";
import {
  selectableRemovalCopies,
  selectedRemovalCopy,
} from "@magic-vault/shared";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScanRemovalRow({
  entry,
  entries,
  onSelectCopy,
  onDrop,
}: ScanRemovalRowProps) {
  const { t } = useTranslation("scanner");
  const selectedCopy = selectedRemovalCopy(entry);
  const selectableCopies = selectableRemovalCopies(entry, entries);
  const shownCard = selectedCopy?.card ?? entry.matchedCard;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-2">
      <span className="relative aspect-[2.5/3.5] w-10 shrink-0 overflow-hidden rounded-sm bg-muted">
        {shownCard.image?.small && (
          <img
            src={shownCard.image.small}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {selectedCopy?.isFoil && <FoilOverlay />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{shownCard.name}</p>
          <p className="truncate text-xs text-foreground/70">
            {`${shownCard.setName} (${shownCard.set.toUpperCase()})`}
          </p>
        </div>
        {!selectedCopy ? (
          <p className="text-xs text-warning-foreground">
            {t("scanRemoval.noCopyLeft")}
          </p>
        ) : selectableCopies.length > 1 ? (
          <Select
            value={selectedCopy.scanId}
            onValueChange={(scanId) => scanId && onSelectCopy(scanId)}
          >
            <SelectTrigger
              size="sm"
              className="w-full"
              aria-label={t("scanRemoval.changeCopy")}
            >
              <SelectValue>{describeRemovalCopy(selectedCopy, t)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {selectableCopies.map((copy) => (
                <SelectItem key={copy.scanId} value={copy.scanId}>
                  {describeRemovalCopy(copy, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="truncate text-xs text-foreground/70">
            {describeRemovalCopy(selectedCopy, t)}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("scanRemoval.drop")}
        title={t("scanRemoval.drop")}
        onClick={onDrop}
      >
        <IconX />
      </Button>
    </div>
  );
}
