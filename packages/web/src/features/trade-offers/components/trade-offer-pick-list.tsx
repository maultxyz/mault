import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { tradeOfferPlacementLines } from "@/features/trade-offers/lib/placement-lines";
import type {
  TradeOfferPickListProps,
  TradeOfferPickListRowProps,
} from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import {
  formatPrice,
  tradeOfferPickListSections,
  type TradeOfferPickListSection,
} from "@magic-vault/shared";
import { IconAlertTriangle, IconCircleCheck, IconMapPin } from "@tabler/icons-react";
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";

function TradeOfferPickListRow({ item, priceSource, onPicked }: TradeOfferPickListRowProps) {
  const { t } = useTranslation("common");
  const checkboxId = useId();
  const { card } = item;
  const placementLine = tradeOfferPlacementLines([item.placement], t)[0];

  return (
    <li className={cn("flex items-start gap-2 py-2 md:py-1.5", item.isPicked && "text-foreground/70")}>
      <Checkbox
        id={checkboxId}
        className="mt-1"
        checked={item.isPicked}
        disabled={item.isPicked}
        onCheckedChange={(checked) => {
          if (checked) onPicked(item.scanId);
        }}
      />
      <label htmlFor={checkboxId} className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
        <CardImage
          src={card.imageUrl ?? undefined}
          alt=""
          className={cn("aspect-[2.5/3.5] w-9 shrink-0 rounded-sm", item.isPicked && "opacity-60")}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("truncate text-control font-medium", item.isPicked && "line-through")}>
            {card.name}
          </span>
          <span className="truncate text-xs text-foreground/70">
            {[
              card.setName || card.setCode.toUpperCase(),
              card.collectorNumber ? `#${card.collectorNumber}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="flex flex-wrap gap-1">
            <Badge variant="secondary">{card.condition}</Badge>
            {card.isFoil && <Badge variant="secondary">{t("tradeOffers.cardList.foil")}</Badge>}
          </span>
          {item.isPicked ? (
            <span className="flex items-center gap-1 text-xs font-medium text-success-foreground">
              <IconCircleCheck className="size-3 shrink-0" aria-hidden />
              {t("tradeOffers.pickList.picked")}
            </span>
          ) : (
            placementLine && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  placementLine.isMissing ? "text-warning-foreground" : "text-foreground/70",
                )}
              >
                {placementLine.isMissing ? (
                  <IconAlertTriangle className="size-3 shrink-0" aria-hidden />
                ) : (
                  <IconMapPin className="size-3 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 break-words">{placementLine.text}</span>
              </span>
            )
          )}
        </span>
      </label>
      <span className="shrink-0 text-control font-medium tabular-nums">
        {item.price == null ? t("tradeOffers.cardList.noPrice") : formatPrice(item.price, priceSource)}
      </span>
    </li>
  );
}

export function TradeOfferPickList({
  offer,
  remainingScanIds,
  placements,
  onPicked,
  className,
}: TradeOfferPickListProps) {
  const { t } = useTranslation("common");
  const headingId = useId();
  const sections = useMemo(
    () => tradeOfferPickListSections(offer.wanted, offer.wantedPrices, placements, remainingScanIds),
    [offer.wanted, offer.wantedPrices, placements, remainingScanIds],
  );
  const sectionTitle = (section: TradeOfferPickListSection) =>
    section.kind === "storage"
      ? section.name
      : section.kind === "bin"
        ? t("tradeOffers.cardList.sectionBin", { collection: section.name, bin: section.binNumber })
        : section.kind === "collection"
          ? t("tradeOffers.cardList.sectionCollection", { collection: section.name })
          : section.kind === "missing"
            ? t("tradeOffers.cardList.sectionMissing")
            : t("tradeOffers.pickList.pickedSection");

  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="font-heading text-sm font-semibold">
          {t("tradeOffers.pickList.title")}
        </h2>
        <p className="text-xs text-foreground/70">{t("tradeOffers.pickList.hint")}</p>
      </div>
      <div className="flex flex-col gap-3 md:gap-2">
        {sections.map((section) => (
          <div key={section.key} className="flex flex-col">
            <h3
              className={cn(
                "text-xs font-medium",
                section.kind === "missing" ? "text-warning-foreground" : "text-foreground/70",
              )}
            >
              {sectionTitle(section)}
            </h3>
            <ul className="flex flex-col divide-y divide-border">
              {section.items.map((item) => (
                <TradeOfferPickListRow
                  key={item.scanId}
                  item={item}
                  priceSource={offer.priceSource}
                  onPicked={onPicked}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
