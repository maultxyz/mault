import { Badge } from "@/components/ui/badge";
import { MATCH_VALIDATION_STATUS_BADGE_VARIANTS } from "@/lib/constants/match-validations";
import type { MatchValidationScanTileProps } from "@/lib/interfaces/match-validations";
import { useTranslation } from "react-i18next";

export function MatchValidationScanTile({ scan }: MatchValidationScanTileProps) {
  const { t } = useTranslation("matchValidations");
  const cardName = scan.cardName ?? t("unknownCard");

  return (
    <li className="flex flex-col gap-2 rounded-lg p-2 ring-1 ring-border">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
          {scan.capturedImageUrl && (
            <img
              loading="lazy"
              src={scan.capturedImageUrl}
              alt={t("scanPhotoAlt", { name: cardName })}
              className="h-full w-full object-fill"
            />
          )}
        </div>
        <div className="aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
          {scan.catalogImageUrl && (
            <img
              loading="lazy"
              src={scan.catalogImageUrl}
              alt={t("matchedCardAlt", { name: cardName })}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-sm font-medium" title={cardName}>
          {cardName}
        </p>
        <p className="truncate text-xs text-foreground/70">
          {[scan.setName ?? scan.setCode, scan.collectorNumber]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <Badge
          variant={MATCH_VALIDATION_STATUS_BADGE_VARIANTS[scan.status]}
          className="self-start"
        >
          {t(`statuses.${scan.status}`)}
        </Badge>
        <p className="text-xs text-foreground/70">
          {t("tallies", {
            correct: scan.correctCount,
            incorrect: scan.incorrectCount,
            badScan: scan.badScanCount,
          })}
        </p>
        {scan.yourVerdict && (
          <p className="text-xs text-foreground/70">
            {t("yourVerdict", {
              verdict: t(`actions.${scan.yourVerdict}`),
            })}
          </p>
        )}
      </div>
    </li>
  );
}
